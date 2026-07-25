/**
 * 음성 프리셋 정의.
 *
 * "제공자 + 세부 파라미터" 조합에 친근한 이름을 붙인 것입니다. Google 은 언어별
 * 무료 음성을, Edge 는 고품질 뉴럴 음성을 냅니다. 새 프리셋을 추가하면 자동으로
 * /voice, /say 선택지에 나타납니다.
 */
import type { VoicePreset } from '../types.js';

export const voices: Record<string, VoicePreset> = {
  // ── Google (무료·무키) ────────────────────────────────
  korean: {
    label: '한국어',
    emoji: '🇰🇷',
    description: '그냥 한국어. 평범해서 시시하지?',
    provider: 'google',
    params: { language: 'ko', slow: false },
  },
  us: {
    label: '미국 영어',
    emoji: '🇺🇸',
    description: '한글도 영어로 씹어먹는 느끼한 미국식.',
    provider: 'google',
    params: { language: 'en', slow: false },
  },
  japanese: {
    label: '일본어',
    emoji: '🇯🇵',
    description: '오타쿠 각성 일본어. 크큭.',
    provider: 'google',
    params: { language: 'ja', slow: false },
  },
  chinese: {
    label: '중국어',
    emoji: '🇨🇳',
    description: '중국어. 뭐라는지 알아나 듣겠냐.',
    provider: 'google',
    params: { language: 'zh-CN', slow: false },
  },
  french: {
    label: '프랑스어',
    emoji: '🇫🇷',
    description: '느끼함 그 자체. 프랑스 억양.',
    provider: 'google',
    params: { language: 'fr', slow: false },
  },
  spanish: {
    label: '스페인어',
    emoji: '🇪🇸',
    description: '시끄러운 스페인 억양.',
    provider: 'google',
    params: { language: 'es', slow: false },
  },
  russian: {
    label: '러시아어',
    emoji: '🇷🇺',
    description: '묵직하게 깔리는 러시아 억양.',
    provider: 'google',
    params: { language: 'ru', slow: false },
  },
  german: {
    label: '독일어',
    emoji: '🇩🇪',
    description: '딱딱한 독일 억양. 명령조 같지.',
    provider: 'google',
    params: { language: 'de', slow: false },
  },

  // ── Edge TTS (무료·무키, 고품질 뉴럴 음성) ──────────────
  선희: {
    label: '선희(뉴럴·여)',
    emoji: '✨',
    description: '진짜 사람 같은 한국어 여자 목소리. 급 나눠줄게.',
    provider: 'edge',
    params: { voice: 'ko-KR-SunHiNeural' },
  },
  인준: {
    label: '인준(뉴럴·남)',
    emoji: '🎧',
    description: '차분한 한국어 남자 뉴럴 음성.',
    provider: 'edge',
    params: { voice: 'ko-KR-InJoonNeural' },
  },
};

/** 존재하지 않으면 korean 으로 폴백 */
export function resolveVoice(key: string): VoicePreset {
  return voices[key] ?? voices.korean!;
}

export function listVoices(): Array<{
  key: string;
  label: string;
  emoji: string;
  description: string;
  provider: string;
}> {
  return Object.entries(voices).map(([key, v]) => ({
    key,
    label: v.label,
    emoji: v.emoji,
    description: v.description,
    provider: v.provider,
  }));
}
