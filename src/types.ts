/**
 * 프로젝트 전역에서 공유하는 타입 정의.
 */
import type { ChatInputCommandInteraction, Collection } from 'discord.js';

/** 슬래시 명령어 모듈이 export 하는 형태 */
export interface Command {
  /** SlashCommandBuilder(및 옵션 빌더)를 구조적으로 받는다 */
  data: { name: string; toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
}

/** 이벤트 핸들러 모듈이 export 하는 형태 */
export interface EventModule {
  name: string;
  once?: boolean;
  execute(...args: any[]): unknown;
}

/** 음성 프리셋(언어/음성) */
export interface VoicePreset {
  label: string;
  emoji: string;
  description: string;
  provider: string;
  params: { language?: string; slow?: boolean; voice?: string };
}

/** 말투(오디오 이펙트 + 텍스트 변형) */
export interface StyleDef {
  label: string;
  emoji: string;
  description: string;
  /** FFmpeg -af 필터 체인 (없으면 원본) */
  filter?: string | null;
  /** 텍스트 자체 변형 (예: 신음 삽입) */
  transform?: (text: string) => string;
}

/** TTS 합성 결과 */
export interface SynthResult {
  buffer: Buffer;
  format: string;
}

/** 제공자에 넘기는 합성 파라미터 */
export interface SynthParams {
  text: string;
  language?: string;
  voice?: string;
  slow?: boolean;
}

// discord.js Client 에 commands 컬렉션을 붙이기 위한 모듈 보강
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}
