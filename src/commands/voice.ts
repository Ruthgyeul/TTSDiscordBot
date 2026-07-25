import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { listVoices, resolveVoice } from '../config/voices.js';
import { sessionStore } from '../voice/AudioSessionStore.js';
import * as embeds from '../core/embeds.js';

const choices = listVoices().slice(0, 25); // 디스코드 선택지 최대 25개

export const data = new SlashCommandBuilder()
  .setName('voice')
  .setDescription('목소리 바꿔준다. 공짜니까 고마운 줄 알고.')
  .addStringOption((opt) => {
    opt.setName('목소리').setDescription('뭘로 바꿀 건데').setRequired(true);
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

  const key = interaction.options.getString('목소리', true);
  const preset = resolveVoice(key);

  // 세션이 없어도 설정을 저장해 다음 /join 에 반영
  const session = sessionStore.getOrCreate(interaction.guildId);
  session.updateSettings({ voice: key });

  return interaction.reply({
    embeds: [
      embeds.success(`목소리 **${preset.emoji} ${preset.label}** 로 바꿔줬다.\n${preset.description}`),
    ],
  });
}
