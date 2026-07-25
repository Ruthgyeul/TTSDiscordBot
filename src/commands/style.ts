import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { listStyles, resolveStyle } from '../config/styles.js';
import { sessionStore } from '../voice/AudioSessionStore.js';
import * as embeds from '../core/embeds.js';

const choices = listStyles().slice(0, 25); // 디스코드 선택지 최대 25개

export const data = new SlashCommandBuilder()
  .setName('style')
  .setDescription('말투 바꿔준다. 골라봐, 빨리.')
  .addStringOption((opt) => {
    opt.setName('말투').setDescription('뭔 말투로 할 건데').setRequired(true);
    for (const c of choices) {
      opt.addChoices({ name: `${c.emoji} ${c.label}`, value: c.key });
    }
    return opt;
  });

export async function execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({
      embeds: [embeds.error('서버에서만 쓰는 거야.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const key = interaction.options.getString('말투', true);
  const style = resolveStyle(key);

  // 세션이 없어도 설정은 저장해둠 (다음 /join 때 반영되도록 getOrCreate)
  const session = sessionStore.getOrCreate(interaction.guildId);
  session.updateSettings({ style: key });

  return interaction.reply({
    embeds: [
      embeds.success(`말투 **${style.emoji} ${style.label}** 로 바꿔줬다.\n${style.description}`),
    ],
  });
}
