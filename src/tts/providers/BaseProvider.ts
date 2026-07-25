/**
 * 모든 TTS 제공자가 구현해야 하는 인터페이스.
 *
 * 새 제공자를 추가하려면:
 *   1. 이 클래스를 상속
 *   2. name 지정 & synthesize() 구현
 *   3. src/tts/TTSManager.ts 의 레지스트리에 등록
 */
import type { SynthParams, SynthResult } from '../../types.js';

export abstract class BaseProvider {
  /** 제공자 식별용 이름 (예: 'google') */
  abstract readonly name: string;

  /**
   * 텍스트를 오디오로 변환합니다.
   * @returns 오디오 버퍼와 포맷('mp3' 등)
   */
  abstract synthesize(params: SynthParams): Promise<SynthResult>;
}
