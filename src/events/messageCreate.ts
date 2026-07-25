/**
 * 핵심 기능: 대상 텍스트 채널의 채팅을 (슬래시 명령 없이) 그대로 읽어 대기열에 넣습니다.
 * - 봇이 이미 음성 채널에 있으면 바로 읽습니다.
 * - 봇이 없고 "등록된 읽기 채널"에서 작성자가 음성 채널에 있으면, 그 채널로 자동 입장 후 읽습니다.
 * - 읽은 메시지에는 설정에 따라 이모지 반응을 답니다.
 */
import { Events, type Message } from 'discord.js';
import config from '../config/index.js';
import { sessionStore } from '../voice/AudioSessionStore.js';
import { getGuildSettings } from '../core/guildSettings.js';
import { ensureConnection } from '../voice/ensureConnection.js';
import { buildSpeech, shouldRead } from '../core/textProcessor.js';
import { logger } from '../core/logger.js';

export const name = Events.MessageCreate;

export async function execute(message: Message): Promise<void> {
  if (!message.guild) return; // DM 무시
  if (!shouldRead(message)) return; // 봇/빈 메시지/무시 접두사 선필터

  const guildId = message.guild.id;
  const settings = getGuildSettings(guildId);
  let session = sessionStore.get(guildId);

  if (session?.isConnected()) {
    // 이미 연결됨 → 대상 채널인지 확인
    //   1) 등록된 읽기 채널이 있으면 그 채널만
    //   2) 없으면 기존 규칙(=/join 한 채널 바인딩, BIND_TO_TEXT_CHANNEL 로 제어)
    const targetChannelId =
      settings.ttsChannelId ||
      (config.voice.bindToTextChannel ? session.boundTextChannelId : null);
    if (targetChannelId && message.channelId !== targetChannelId) return;
  } else {
    // 봇이 없음 → 등록된 읽기 채널에서, 작성자가 음성 채널에 있을 때만 자동 입장
    if (!settings.ttsChannelId || message.channelId !== settings.ttsChannelId) return;
    if (!message.member?.voice?.channel) return;

    const result = await ensureConnection({
      guild: message.guild,
      member: message.member,
      textChannelId: settings.ttsChannelId,
    });
    if (result.error) {
      logger.debug(`[voice:${guildId}] 자동 입장 실패: ${result.error}`);
      return;
    }
    session = result.session;
  }

  // 기본값: 음성 채널에 참여한 사람의 메시지만 읽음
  if (!settings.allowNonParticipants && !session.isParticipant(message.member)) return;

  const speech = buildSpeech({
    content: message.content,
    username: message.member?.displayName ?? message.author.username,
  });
  if (!speech) return;

  const queued = session.enqueue(speech);

  // 읽기로 확정된(대기열에 들어간) 메시지에 이모지 반응
  if (queued && config.reading.reactOnRead) {
    message.react(config.reading.reactionEmoji).catch((err: unknown) => {
      logger.debug(`이모지 반응 실패(권한 부족일 수 있음): ${(err as Error).message}`);
    });
  }
}
