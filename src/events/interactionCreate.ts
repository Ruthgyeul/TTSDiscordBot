import { Events, MessageFlags, type Interaction, type InteractionReplyOptions } from 'discord.js';
import { logger } from '../core/logger.js';
import * as embeds from '../core/embeds.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error(`명령어 /${interaction.commandName} 실행 중 오류:`, err);
    const payload: InteractionReplyOptions = {
      embeds: [embeds.error('뭔가 꼬였잖아. 내 잘못 아니고 니 탓인 듯? 이따 다시 해.')],
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}
