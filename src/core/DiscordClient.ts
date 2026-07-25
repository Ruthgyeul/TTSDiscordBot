/**
 * 디스코드 클라이언트 생성 + 명령어/이벤트 로딩을 담당하는 팩토리.
 */
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands } from '../commands/index.js';
import { registerEvents } from '../events/index.js';
import type { Command } from '../types.js';

export async function createClient(): Promise<Client> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // 채팅 내용을 읽어야 하므로 필수
    ],
  });

  // 명령어를 클라이언트에 부착 (interactionCreate 에서 조회)
  client.commands = new Collection<string, Command>();
  const commands = await loadCommands();
  for (const [cmdName, cmd] of commands) client.commands.set(cmdName, cmd);

  await registerEvents(client);
  return client;
}
