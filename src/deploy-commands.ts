/**
 * 슬래시 명령어를 디스코드에 등록(배포)합니다.
 *   - 먼저 기존 명령어(전역 + 서버)를 전부 비워 초기화한 뒤, 새로 전체 등록합니다.
 *     → 예전에 등록됐던 유령/중복 명령어가 남지 않습니다.
 *   - DISCORD_GUILD_ID 가 있으면 해당 서버에 등록 (반영 즉시)
 *   - 없으면 전역 등록 (모든 서버, 반영에 최대 1시간)
 *
 * 실행:  npm run deploy
 */
import { REST, Routes } from 'discord.js';
import config, { validateConfig } from './config/index.js';
import { loadCommands } from './commands/index.js';
import { logger } from './core/logger.js';

validateConfig({ requireToken: true });

const clientId = config.discord.clientId as string;
const guildId = config.discord.guildId;
const commands = await loadCommands();
const body = [...commands.values()].map((cmd) => cmd.data.toJSON());

const rest = new REST({ version: '10' }).setToken(config.discord.token as string);

try {
  // 1) 기존 명령어 전부 초기화 (전역 + 서버 둘 다 비움)
  logger.info('기존 명령어를 초기화하는 중...');
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  logger.info('  • 전역 명령어 비움');
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    logger.info(`  • 서버(${guildId}) 명령어 비움`);
  }

  // 2) 새로 전체 등록
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    logger.info(`✅ ${body.length}개 명령어를 서버(${guildId})에 새로 등록했습니다. (즉시 반영)`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    logger.info(`✅ ${body.length}개 명령어를 전역 등록했습니다. (반영에 최대 1시간)`);
  }
} catch (err) {
  logger.error('명령어 배포 실패:', err);
  process.exit(1);
}
