/**
 * 말투(스타일) 정의.
 *
 * TTS 로 뽑은 "평범한 음성"에 FFmpeg 오디오 필터를 걸어 로봇/다람쥐/저음/에코 같은
 * 캐릭터를 만듭니다. (음성 자체를 조작) 스타일을 추가하면 자동으로 /style, /say 에서 쓸 수 있습니다.
 *
 * 참고(피치 조절 트릭): aresample 로 44100Hz 정규화 → asetrate 로 배속/피치 올리고
 * → 다시 44100 으로 정규화 → atempo 로 속도만 원복 = "속도 유지, 피치만 변경".
 */
import type { StyleDef } from '../types.js';

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export const styles: Record<string, StyleDef> = {
  normal: {
    label: '기본',
    emoji: '🗣️',
    description: '아무 조작 없는 순정. 밋밋하지?',
    filter: null,
  },

  chipmunk: {
    label: '다람쥐',
    emoji: '🐿️',
    description: '삑삑거리는 하이톤. 웃기려고 만든 거야.',
    filter: 'aresample=44100,asetrate=44100*1.5,aresample=44100,atempo=0.6667',
  },

  deep: {
    label: '저음마왕',
    emoji: '😈',
    description: '깔리는 저음. 좀 무섭지? 크큭.',
    filter: 'aresample=44100,asetrate=44100*0.72,aresample=44100,atempo=1.389',
  },

  robot: {
    label: '로봇',
    emoji: '🤖',
    description: '지지직- 기계음. 인간미? 그런 거 없어.',
    filter: 'aresample=44100,vibrato=f=7:d=0.6,tremolo=f=28:d=0.7',
  },

  echo: {
    label: '동굴',
    emoji: '🕳️',
    description: '메아리 쳐서 웅장한 척. 별거 아님.',
    filter: 'aecho=0.8:0.9:900:0.4',
  },

  hall: {
    label: '홀',
    emoji: '🏛️',
    description: '공간감 쩌는 울림. 있어 보이지?',
    filter: 'aecho=0.85:0.9:55:0.45',
  },

  telephone: {
    label: '전화기',
    emoji: '📞',
    description: '옛날 전화 목소리. 지직거림.',
    filter: 'highpass=f=400,lowpass=f=3000,volume=1.6',
  },

  fast: {
    label: '속사포',
    emoji: '⚡',
    description: '빠르게 쏘아붙임. 알아들어봐.',
    filter: 'atempo=1.5',
  },

  wobble: {
    label: '취함',
    emoji: '🥴',
    description: '흐물흐물 취한 목소리. 정신 차려.',
    filter: 'vibrato=f=4:d=0.9',
  },

  moan: {
    label: '19금',
    emoji: '🔞',
    description: '중간중간 야릇한 신음 섞어줌. 변태냐?',
    filter: 'aecho=0.8:0.85:120:0.2',
    transform: (text: string): string => {
      const moans = ['아앙~', '흐읏', '하앙…', '으응~', '읏…', '흐으응', '아↗', '하아…', '으읏'];
      const words = text.split(/\s+/).filter(Boolean);
      const out: string[] = [];
      for (const w of words) {
        out.push(w);
        if (Math.random() < 0.4) out.push(randomFrom(moans));
      }
      return `${randomFrom(moans)} ${out.join(' ')} ${randomFrom(moans)}`;
    },
  },
};

/** 존재하지 않는 스타일이면 normal 로 폴백 */
export function resolveStyle(name: string): StyleDef {
  return styles[name] ?? styles.normal!;
}

/** /style 명령어 선택지 등에서 쓰는 목록 */
export function listStyles(): Array<{
  key: string;
  label: string;
  emoji: string;
  description: string;
}> {
  return Object.entries(styles).map(([key, s]) => ({
    key,
    label: s.label,
    emoji: s.emoji,
    description: s.description,
  }));
}
