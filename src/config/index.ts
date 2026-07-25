/**
 * .env 값을 읽어 타입을 정리하고 검증한 단일 설정 객체를 제공합니다.
 * 애플리케이션의 다른 부분은 process.env 를 직접 읽지 않고 이 config 만 참조합니다.
 */
import 'dotenv/config';
import { logger } from '../core/logger.js';

/** "true"/"1"/"yes" 를 boolean 으로 */
function toBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

/** 숫자로, 실패하면 기본값 */
function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
}

/** 쉼표 구분 문자열 → 배열 (빈 값 제거) */
function toList(value: string | undefined, fallback: string[] = []): string[] {
  if (!value) return fallback;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID || null,
  },

  bot: {
    name: process.env.BOT_NAME || 'TTS Bot',
    description: process.env.BOT_DESCRIPTION || '니들 채팅 대신 읽어주는 싸가지 TTS 봇이다.',
    activity: process.env.BOT_ACTIVITY || '',
    activityType: process.env.BOT_ACTIVITY_TYPE || 'Listening',
    status: process.env.BOT_STATUS || 'online',
    embedColor: process.env.BOT_EMBED_COLOR || '#C9B7A3',
  },

  tts: {
    // 기본 음성 프리셋 키 (src/config/voices.ts) — 예: korean, us, japanese
    voice: process.env.DEFAULT_VOICE || 'korean',
    // 기본 말투 키 (src/config/styles.ts) — 예: normal, robot, echo
    style: process.env.DEFAULT_STYLE || 'normal',
    // 특정 제공자 실패 시 폴백으로 쓸 제공자
    fallbackProvider: (process.env.FALLBACK_TTS_PROVIDER || 'google').toLowerCase(),
    // 폴백 시 사용할 언어
    language: process.env.FALLBACK_LANGUAGE || 'ko',
  },

  reading: {
    maxLength: toInt(process.env.MAX_MESSAGE_LENGTH, 200),
    queueMax: toInt(process.env.QUEUE_MAX, 20),
    template: process.env.MESSAGE_TEMPLATE || '{message}',
    readUsername: toBool(process.env.READ_USERNAME, true),
    ignorePrefixes: toList(process.env.IGNORE_PREFIXES, ['!', '/']),
    readBots: toBool(process.env.READ_BOTS, false),
    stripUrls: toBool(process.env.STRIP_URLS, true),
    stripEmojis: toBool(process.env.STRIP_EMOJIS, true),
    // 봇이 읽은 메시지에 이모지 반응을 달지 여부와 그 이모지
    reactOnRead: toBool(process.env.REACT_ON_READ, true),
    reactionEmoji: process.env.READ_REACTION_EMOJI || '🗣️',
    // 재생 방식:
    //   queue     = 순차 재생(기본). 재생 중이면 끊지 않고, 끝난 뒤 이어서 말함. 놀고 있으면 즉시 말함.
    //   immediate = 새 메시지가 오면 현재 재생을 끊고 즉시 그 메시지를 말함(최신 우선).
    playbackMode: (process.env.PLAYBACK_MODE || 'queue').toLowerCase(),
  },

  voice: {
    bindToTextChannel: toBool(process.env.BIND_TO_TEXT_CHANNEL, true),
    autoLeaveSeconds: toInt(process.env.AUTO_LEAVE_SECONDS, 120),
    idleDisconnectMs: toInt(process.env.IDLE_DISCONNECT_MS, 0),
    // 기본값: 음성 채널에 참여한 사람만 TTS 사용 가능(false).
    // true 로 켜면 음성 채널에 없는 사람도 봇을 부르고 TTS 를 쓸 수 있음.
    // (길드별로 관리자가 /config 로 덮어쓸 수 있음)
    allowNonParticipants: toBool(process.env.ALLOW_NON_PARTICIPANTS, false),
  },

  logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase(),
};

/**
 * 봇 실행에 반드시 필요한 값들을 검증합니다.
 * 명령어 배포(deploy) 시에는 토큰/클라이언트ID만 있으면 되므로 requireToken 옵션으로 구분.
 */
export function validateConfig({ requireToken = true }: { requireToken?: boolean } = {}): void {
  const missing: string[] = [];
  if (requireToken && !config.discord.token) missing.push('DISCORD_TOKEN');
  if (!config.discord.clientId) missing.push('DISCORD_CLIENT_ID');

  if (missing.length > 0) {
    logger.error(`필수 환경변수가 누락되었습니다: ${missing.join(', ')}`);
    logger.error('.env.example 을 참고해 .env 파일을 채워주세요.');
    process.exit(1);
  }
}

export default config;
