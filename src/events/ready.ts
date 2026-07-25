import {
  Events,
  ActivityType,
  type Client,
  type PresenceStatusData,
} from 'discord.js';
import config from '../config/index.js';
import { logger } from '../core/logger.js';

export const name = Events.ClientReady;
export const once = true;

const ACTIVITY_TYPES: Record<string, ActivityType> = {
  Playing: ActivityType.Playing,
  Listening: ActivityType.Listening,
  Watching: ActivityType.Watching,
  Competing: ActivityType.Competing,
  Custom: ActivityType.Custom,
};

export function execute(client: Client<true>): void {
  logger.info(`✅ ${client.user.tag} 로 로그인했습니다. (${config.bot.name})`);

  if (config.bot.activity) {
    client.user.setPresence({
      status: config.bot.status as PresenceStatusData,
      activities: [
        {
          name: config.bot.activity,
          type: ACTIVITY_TYPES[config.bot.activityType] ?? ActivityType.Listening,
        },
      ],
    });
  }
}
