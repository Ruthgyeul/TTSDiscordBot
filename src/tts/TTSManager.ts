/**
 * TTS 제공자 레지스트리 + 합성 진입점.
 *
 * 흐름:
 *   1. 스타일의 텍스트 변형(있으면) 적용 — 예: 19금 신음 삽입
 *   2. 음성 프리셋(언어)으로 순수 TTS 음성 생성
 *   3. 스타일의 오디오 필터(있으면)로 음성을 조작 — 로봇/다람쥐/에코 등
 */
import config from '../config/index.js';
import { resolveStyle } from '../config/styles.js';
import { resolveVoice } from '../config/voices.js';
import { logger } from '../core/logger.js';
import { applyAudioFilter } from '../audio/effects.js';
import { GoogleTranslateProvider } from './providers/GoogleTranslateProvider.js';
import { EdgeTTSProvider } from './providers/EdgeTTSProvider.js';
import type { BaseProvider } from './providers/BaseProvider.js';
import type { SynthResult } from '../types.js';

interface SynthesizeOptions {
  text: string;
  voice?: string;
  style?: string;
}

class TTSManager {
  private providers = new Map<string, BaseProvider>();

  register(provider: BaseProvider): this {
    this.providers.set(provider.name, provider);
    logger.debug(`TTS 제공자 등록: ${provider.name}`);
    return this;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return [...this.providers.keys()];
  }

  /** 텍스트를 오디오로 변환합니다. */
  async synthesize({ text, voice, style }: SynthesizeOptions): Promise<SynthResult> {
    const styleDef = resolveStyle(style || config.tts.style);

    // 1) (선택) 텍스트 변형
    const finalText = (styleDef.transform ? styleDef.transform(text) : text).trim();
    if (!finalText) throw new Error('합성할 텍스트가 비어 있습니다.');

    // 2) 음성 프리셋(언어)으로 순수 TTS 음성 생성
    const preset = resolveVoice(voice || config.tts.voice);
    const params = { ...preset.params, text: finalText };

    const provider = this.providers.get(preset.provider);
    if (!provider) throw new Error(`알 수 없는 TTS 제공자: ${preset.provider}`);

    let result: SynthResult;
    try {
      result = await provider.synthesize(params);
    } catch (err) {
      logger.warn(`[TTS] '${preset.provider}' 합성 실패: ${(err as Error).message}`);
      const fallback = this.providers.get(config.tts.fallbackProvider);
      if (fallback && fallback.name !== preset.provider) {
        logger.warn(`[TTS] 기본 제공자(${fallback.name})로 폴백합니다.`);
        result = await fallback.synthesize({ text: finalText, language: config.tts.language });
      } else {
        throw err;
      }
    }

    // 3) (선택) 오디오 이펙트로 음성 조작
    if (styleDef.filter) {
      const buffer = await applyAudioFilter(result.buffer, styleDef.filter);
      return { buffer, format: 'mp3' };
    }
    return result;
  }
}

// 싱글턴 + 기본 제공자 등록
// 새 무료 TTS 엔진을 추가하려면 providers/ 에 BaseProvider 구현을 만들고
// 여기에 .register(new XxxProvider()) 를 한 줄 추가하면 됩니다.
export const ttsManager = new TTSManager()
  .register(new GoogleTranslateProvider())
  .register(new EdgeTTSProvider());
