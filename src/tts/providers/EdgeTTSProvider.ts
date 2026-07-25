/**
 * Microsoft Edge TTS (무료·무키).
 * - Edge 브라우저의 "읽어주기" 뉴럴 음성 엔진을 사용. API 키/과금 없음.
 * - 고품질 뉴럴 음성, 다국어(한국어 SunHi/InJoon 등) 지원.
 * - 비공식이라 MS 가 막으면 실패할 수 있는데, 그때는 TTSManager 가 google 로 폴백함.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { BaseProvider } from './BaseProvider.js';
import type { SynthParams, SynthResult } from '../../types.js';

export class EdgeTTSProvider extends BaseProvider {
  readonly name = 'edge';

  async synthesize({ text, voice = 'ko-KR-SunHiNeural' }: SynthParams): Promise<SynthResult> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (d: Buffer) => chunks.push(d));
      audioStream.on('end', () => resolve());
      audioStream.on('close', () => resolve());
      audioStream.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    if (buffer.length === 0) throw new Error('Edge TTS 응답이 비어 있습니다.');
    return { buffer, format: 'mp3' };
  }
}
