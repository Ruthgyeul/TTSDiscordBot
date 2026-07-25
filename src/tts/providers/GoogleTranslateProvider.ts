/**
 * Google Translate 무료 TTS.
 * - API 키 불필요, 하지만 한 요청당 ~200자 제한 → 라이브러리가 문장 단위로 쪼갬.
 * - 여러 mp3 조각을 이어붙여 하나의 버퍼로 반환합니다.
 */
import gTTS from 'google-tts-api';
import { BaseProvider } from './BaseProvider.js';
import type { SynthParams, SynthResult } from '../../types.js';

export class GoogleTranslateProvider extends BaseProvider {
  readonly name = 'google';

  async synthesize({ text, language = 'ko', slow = false }: SynthParams): Promise<SynthResult> {
    const results = await gTTS.getAllAudioBase64(text, {
      lang: language,
      slow,
      splitPunct: ',.?!;:',
    });

    const buffers = results.map((r) => Buffer.from(r.base64, 'base64'));
    return { buffer: Buffer.concat(buffers), format: 'mp3' };
  }
}
