/**
 * 채팅 메시지를 TTS 로 읽기 좋게 정제합니다.
 * 규칙은 모두 config.reading 에서 옵니다(=.env 로 제어).
 */
import type { Message } from 'discord.js';
import config from '../config/index.js';

const URL_REGEX = /https?:\/\/\S+/gi;
const CUSTOM_EMOJI_REGEX = /<a?:\w+:\d+>/g; // 디스코드 커스텀 이모지 <:name:id>
const UNICODE_EMOJI_REGEX = /[\p{Extended_Pictographic}‍️]/gu;
const MENTION_REGEX = /<@!?\d+>|<#\d+>|<@&\d+>/g;

/**
 * @returns 읽어줄 최종 텍스트 (빈 문자열이면 읽지 않음)
 */
export function buildSpeech({ content, username }: { content: string; username: string }): string {
  let text = content ?? '';

  // 멘션 토큰 제거 (읽으면 <@123...> 처럼 지저분함)
  text = text.replace(MENTION_REGEX, '');

  if (config.reading.stripUrls) {
    text = text.replace(URL_REGEX, ' 링크 ');
  }

  if (config.reading.stripEmojis) {
    text = text.replace(CUSTOM_EMOJI_REGEX, ' ').replace(UNICODE_EMOJI_REGEX, ' ');
  } else {
    // 커스텀 이모지는 항상 이름만 남김 (<:name:id> → name)
    text = text.replace(CUSTOM_EMOJI_REGEX, (m) => {
      const name = m.match(/:(\w+):/);
      return name ? ` ${name[1]} ` : ' ';
    });
  }

  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  // 템플릿 적용.
  // 함수 치환을 써서 사용자가 친 '$&','$1' 같은 특수 치환 패턴이 해석되는 걸 방지.
  const user = config.reading.readUsername ? username : '';
  let speech = config.reading.template
    .replace('{user}', () => user)
    .replace('{message}', () => text)
    .trim();

  // readUsername=false 인데 템플릿에 남은 앞쪽 구두점 정리
  if (!user) speech = speech.replace(/^[,\s]+/, '').trim();

  // 길이 제한
  if (speech.length > config.reading.maxLength) {
    speech = `${speech.slice(0, config.reading.maxLength)} 이하 생략`;
  }

  return speech;
}

/**
 * 이 메시지를 읽어야 하는지 판단합니다.
 */
export function shouldRead(message: Message): boolean {
  if (!config.reading.readBots && (message.author?.bot || message.webhookId)) return false;
  const content = message.content?.trim();
  if (!content) return false;
  if (config.reading.ignorePrefixes.some((p) => content.startsWith(p))) return false;
  return true;
}
