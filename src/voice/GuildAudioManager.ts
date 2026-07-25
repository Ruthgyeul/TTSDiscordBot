/**
 * 길드(서버) 1개당 하나씩 존재하는 음성 세션 관리자.
 *
 * 책임:
 *   - 음성 채널 연결/해제
 *   - 재생(즉시/순차) 관리
 *   - 세션별 TTS 설정(목소리/말투) 보관
 *   - 유휴/무인 자동 퇴장
 */
import { Readable } from 'node:stream';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  type AudioPlayer,
  type VoiceConnection,
} from '@discordjs/voice';
import type { GuildMember, VoiceBasedChannel } from 'discord.js';
import config from '../config/index.js';
import { logger } from '../core/logger.js';
import { ttsManager } from '../tts/TTSManager.js';
import { getGuildSettings, setGuildSetting } from '../core/guildSettings.js';

interface SessionSettings {
  voice: string;
  style: string;
}

interface QueueJob {
  text: string;
  voice?: string | undefined;
  style?: string | undefined;
}

export class GuildAudioManager {
  readonly guildId: string;
  private onDestroy: () => void;

  private connection: VoiceConnection | null = null;
  private player: AudioPlayer;

  private queue: QueueJob[] = [];
  private playing = false;

  /** 재생 방식: immediate = 새 발화가 오면 현재 걸 끊고 즉시 재생 */
  private immediate: boolean;
  /** immediate 모드에서 "최신 발화만 재생"하기 위한 세대 토큰 */
  private _genId = 0;

  boundTextChannelId: string | null = null;
  voiceChannelId: string | null = null;

  settings: SessionSettings;

  private _idleTimer: NodeJS.Timeout | null = null;
  private _emptyTimer: NodeJS.Timeout | null = null;

  constructor(guildId: string, onDestroy: () => void) {
    this.guildId = guildId;
    this.onDestroy = onDestroy;

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    this.immediate = config.reading.playbackMode !== 'queue';

    const saved = getGuildSettings(guildId);
    this.settings = { voice: saved.voice, style: saved.style };

    this._wirePlayerEvents();
  }

  private _wirePlayerEvents(): void {
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playing = false;
      void this._playNext();
    });

    this.player.on('error', (err) => {
      logger.warn(`[voice:${this.guildId}] 재생 오류: ${err.message}`);
      this.playing = false;
      void this._playNext();
    });
  }

  /** 음성 채널에 연결합니다. */
  async connect(channel: VoiceBasedChannel, textChannelId: string | null): Promise<void> {
    this.voiceChannelId = channel.id;
    this.boundTextChannelId = config.voice.bindToTextChannel ? textChannelId : null;

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    this.connection.subscribe(this.player);
    this._wireConnectionEvents(this.connection);

    // 진단용: 연결 상태 전이 로그 (LOG_LEVEL=debug 로 확인)
    this.connection.on('stateChange', (oldS, newS) => {
      logger.debug(`[voice:${this.guildId}] 연결 상태: ${oldS.status} → ${newS.status}`);
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
      logger.info(`[voice:${this.guildId}] '${channel.name}' 채널에 연결됨`);
    } catch (err) {
      const lastStatus = this.connection?.state?.status;
      logger.warn(`[voice:${this.guildId}] Ready 도달 실패 (마지막 상태: ${lastStatus})`);
      this.destroy();
      throw new Error(`음성 채널 연결에 실패했어요: ${(err as Error).message} (상태: ${lastStatus})`);
    }
  }

  private _wireConnectionEvents(connection: VoiceConnection): void {
    // 디스코드 음성 서버 이전/네트워크 끊김 시 재연결 시도
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // 일시적 끊김 → 자동 복구 중
      } catch {
        logger.info(`[voice:${this.guildId}] 연결이 끊겨 세션을 정리합니다.`);
        this.destroy();
      }
    });
  }

  /** 해당 멤버가 지금 봇과 같은 음성 채널에 있는지 */
  isParticipant(member: GuildMember | null | undefined): boolean {
    return Boolean(this.voiceChannelId) && member?.voice?.channelId === this.voiceChannelId;
  }

  /** 현재 연결되어 있는지 */
  isConnected(): boolean {
    return (
      this.connection !== null &&
      this.connection.state.status !== VoiceConnectionStatus.Destroyed
    );
  }

  /** 세션 설정 일부를 갱신하고 서버 설정 파일에 저장(재시작해도 유지) */
  updateSettings(patch: Partial<SessionSettings>): void {
    if (patch.voice !== undefined) {
      this.settings.voice = patch.voice;
      setGuildSetting(this.guildId, 'voice', patch.voice);
    }
    if (patch.style !== undefined) {
      this.settings.style = patch.style;
      setGuildSetting(this.guildId, 'style', patch.style);
    }
  }

  /**
   * 읽어줄 텍스트를 재생합니다.
   * - immediate 모드: 현재 재생을 끊고 즉시 이 텍스트를 재생 (최신 발화 우선)
   * - queue 모드: 대기열에 넣고 순서대로 재생
   * @returns 접수됐으면 true, (queue 모드에서) 가득 차 무시됐으면 false
   */
  enqueue(text: string, override: { voice?: string; style?: string } = {}): boolean {
    this._clearIdleTimer();

    if (this.immediate) {
      void this._playImmediate(text, override);
      return true;
    }

    if (this.queue.length >= config.reading.queueMax) {
      logger.debug(`[voice:${this.guildId}] 대기열이 가득 차 메시지를 건너뜁니다.`);
      return false;
    }
    this.queue.push({ text, voice: override.voice, style: override.style });
    if (!this.playing) void this._playNext();
    return true;
  }

  /** immediate 모드: 현재 재생을 끊고 즉시 재생. 합성 중 더 새 발화가 오면 이 발화는 폐기. */
  private async _playImmediate(
    text: string,
    override: { voice?: string; style?: string } = {},
  ): Promise<void> {
    const myGen = ++this._genId;
    try {
      this.player.stop(true); // 현재 재생 즉시 중단
    } catch {
      /* noop */
    }

    let buffer: Buffer;
    try {
      ({ buffer } = await ttsManager.synthesize({
        text,
        voice: override.voice ?? this.settings.voice,
        style: override.style ?? this.settings.style,
      }));
    } catch (err) {
      logger.warn(`[voice:${this.guildId}] TTS 합성 실패, 건너뜀: ${(err as Error).message}`);
      return;
    }

    // 합성하는 동안 더 새로운 발화가 들어왔으면 이 발화는 버림
    if (myGen !== this._genId) return;

    const resource = createAudioResource(Readable.from(buffer), {
      inputType: StreamType.Arbitrary,
    });
    this.player.play(resource);
  }

  private async _playNext(): Promise<void> {
    if (this.playing) return;
    const job = this.queue.shift();
    if (!job) {
      this._scheduleIdleDisconnect();
      return;
    }

    this.playing = true;
    try {
      const { buffer } = await ttsManager.synthesize({
        text: job.text,
        voice: job.voice ?? this.settings.voice,
        style: job.style ?? this.settings.style,
      });

      const resource = createAudioResource(Readable.from(buffer), {
        inputType: StreamType.Arbitrary, // mp3 → ffmpeg 트랜스코딩
      });
      this.player.play(resource);
    } catch (err) {
      logger.warn(`[voice:${this.guildId}] TTS 합성 실패, 건너뜀: ${(err as Error).message}`);
      this.playing = false;
      setImmediate(() => void this._playNext());
    }
  }

  /** 현재 재생 중인 항목을 건너뜁니다. */
  skip(): void {
    this._genId++; // immediate 모드: 합성 중인 발화도 무효화
    this.player.stop(true); // Idle 이벤트 → (queue 모드면) 다음 재생
  }

  /** 대기열을 비웁니다. */
  clearQueue(): number {
    const removed = this.queue.length;
    this.queue = [];
    return removed;
  }

  // ── 자동 퇴장 관련 ────────────────────────────────────────────

  private _clearIdleTimer(): void {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }

  private _scheduleIdleDisconnect(): void {
    if (!config.voice.idleDisconnectMs) return;
    this._clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      logger.info(`[voice:${this.guildId}] 유휴 상태로 자동 퇴장합니다.`);
      this.destroy();
    }, config.voice.idleDisconnectMs);
  }

  /** 음성 채널에 사람이 없을 때 호출 → 카운트다운 시작 */
  scheduleEmptyDisconnect(): void {
    if (!config.voice.autoLeaveSeconds) return;
    if (this._emptyTimer) return;
    this._emptyTimer = setTimeout(() => {
      logger.info(`[voice:${this.guildId}] 채널에 아무도 없어 자동 퇴장합니다.`);
      this.destroy();
    }, config.voice.autoLeaveSeconds * 1000);
  }

  /** 사람이 다시 들어오면 카운트다운 취소 */
  cancelEmptyDisconnect(): void {
    if (this._emptyTimer) {
      clearTimeout(this._emptyTimer);
      this._emptyTimer = null;
    }
  }

  /** 세션 완전 종료 및 정리 */
  destroy(): void {
    this._clearIdleTimer();
    this.cancelEmptyDisconnect();
    this.queue = [];
    this.playing = false;
    try {
      this.player.stop(true);
    } catch {
      /* noop */
    }
    if (this.isConnected() && this.connection) {
      try {
        this.connection.destroy();
      } catch {
        /* noop */
      }
    }
    this.connection = null;
    this.onDestroy();
  }
}
