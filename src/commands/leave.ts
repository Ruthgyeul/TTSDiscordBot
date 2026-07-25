import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { sessionStore } from '../voice/AudioSessionStore.js';
import * as embeds from '../core/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('음성 채널에서 나가준다. 아쉬워도 참아.');

export async function execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({
      embeds: [embeds.error('서버에서만 쓰는 거야.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const session = sessionStore.get(interaction.guildId);
  if (!session || !session.isConnected()) {
    return interaction.reply({
      embeds: [embeds.error('들어가 있지도 않은데 뭘 나가래. 정신 차려.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  sessionStore.delete(interaction.guildId);
  return interaction.reply({
    embeds: [embeds.success('간다. 딱히 너 때문에 있어준 거 아니거든? 흥. 👋')],
  });
}
