/**
 * 애플리케이션 진입점.
 *   1. ffmpeg 경로 설정 (mp3 → opus 트랜스코딩용)
 *   2. libsodium 준비 & 설정 검증
 *   3. 클라이언트 생성 및 로그인
 *   4. 안전한 종료 처리
 */
import { createRequire } from 'node:module';
import ffmpegStatic from 'ffmpeg-static';
import config, { validateConfig } from './config/index.js';
import { logger } from './core/logger.js';
import { createClient } from './core/DiscordClient.js';
import { sessionStore } from './voice/AudioSessionStore.js';

// prism-media(=@discordjs/voice) 가 참조하는 ffmpeg 바이너리 경로 지정
const ffmpegPath = ffmpegStatic as unknown as string | null;
if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;

// libsodium 은 비동기 초기화라, 준비되기 전에 음성 연결을 시도하면
// 'operation aborted' 로 연결이 실패할 수 있음 → 시작 전에 준비 완료를 보장.
// (libsodium-wrappers 의 ESM 빌드가 깨져 있어 CommonJS(require) 로 불러온다.)
const require = createRequire(import.meta.url);
const sodium = require('libsodium-wrappers') as { ready: Promise<void> };
await sodium.ready;
logger.debug('libsodium 준비 완료');

validateConfig({ requireToken: true });

const client = await createClient();

// ── 안전한 종료 ────────────────────────────────────────────
function shutdown(signal: string): void {
  logger.info(`${signal} 수신 — 정리 후 종료합니다.`);
  sessionStore.destroyAll();
  void client.destroy();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('처리되지 않은 Promise 거부:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('처리되지 않은 예외:', err);
});

logger.info(`${config.bot.name} 시작 중...`);
await client.login(config.discord.token);
