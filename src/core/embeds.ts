/**
 * 일관된 임베드 응답을 만드는 헬퍼. 색상/봇 이름은 config 에서.
 */
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../config/index.js';

function base(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.bot.embedColor as ColorResolvable)
    .setFooter({ text: config.bot.name });
}

export function info(title: string, description?: string | null): EmbedBuilder {
  return base().setTitle(title).setDescription(description ?? null);
}

export function success(description: string): EmbedBuilder {
  return base().setDescription(`✅ ${description}`);
}

export function error(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#ED4245')
    .setDescription(`⚠️ ${description}`)
    .setFooter({ text: config.bot.name });
}
