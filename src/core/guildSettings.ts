/**
 * 길드(서버)별 설정을 파일에 저장/조회합니다.
 * 서버 관리자가 /config 로 바꾼 값이 봇을 재시작해도 유지되도록 합니다.
 *
 * 저장 위치: <프로젝트 루트>/data/guild-settings.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import config from '../config/index.js';
import { logger } from './logger.js';

export interface GuildSettings {
  allowNonParticipants: boolean;
  voice: string; // 목소리 프리셋 키
  style: string; // 말투 키
  ttsChannelId: string | null; // 지정 읽기 채널
}

const DATA_DIR = join(process.cwd(), 'data');
const FILE = join(DATA_DIR, 'guild-settings.json');

let store: Record<string, Partial<GuildSettings>> = {};

function load(): void {
  try {
    if (existsSync(FILE)) {
      store = JSON.parse(readFileSync(FILE, 'utf8')) || {};
      logger.debug(`길드 설정 로드: ${Object.keys(store).length}개 서버`);
    }
  } catch (err) {
    logger.warn(`길드 설정 로드 실패, 새로 시작합니다: ${(err as Error).message}`);
    store = {};
  }
}
load();

function persist(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    logger.error(`길드 설정 저장 실패: ${(err as Error).message}`);
  }
}

/** .env 로 정한 서버 전역 기본값 */
function defaults(): GuildSettings {
  return {
    allowNonParticipants: config.voice.allowNonParticipants,
    voice: config.tts.voice,
    style: config.tts.style,
    ttsChannelId: null,
  };
}

/** 기본값 + 저장된 오버라이드를 합쳐 반환 */
export function getGuildSettings(guildId: string): GuildSettings {
  return { ...defaults(), ...(store[guildId] || {}) };
}

/** 설정 하나를 바꾸고 저장 */
export function setGuildSetting<K extends keyof GuildSettings>(
  guildId: string,
  key: K,
  value: GuildSettings[K],
): GuildSettings {
  store[guildId] = { ...(store[guildId] || {}), [key]: value };
  persist();
  return getGuildSettings(guildId);
}
