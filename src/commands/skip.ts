import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { sessionStore } from '../voice/AudioSessionStore.js';
import * as embeds from '../core/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('지금 읽는 거 건너뛴다.')
  .addBooleanOption((opt) =>
    opt.setName('전체').setDescription('true 면 밀린 거 싹 다 갖다 버림.'),
  );

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
      embeds: [embeds.error('읽는 것도 없는데 뭘 건너뛰래. 한심하네.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const clearAll = interaction.options.getBoolean('전체');
  if (clearAll) {
    const removed = session.clearQueue();
    session.skip();
    return interaction.reply({
      embeds: [embeds.success(`밀린 ${removed}개 싹 버리고 지금 것도 건너뛰었다. 됐냐?`)],
    });
  }

  session.skip();
  return interaction.reply({ embeds: [embeds.success('건너뛰었어. 뭐 그렇게 급해? ⏭️')] });
}
