/**
 * commands 폴더의 모든 명령어 모듈을 자동으로 불러옵니다.
 * 새 명령어 파일(export data, execute)을 추가하면 자동 등록됩니다.
 */
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { logger } from '../core/logger.js';
import type { Command } from '../types.js';

const here = fileURLToPath(import.meta.url);
const dir = dirname(here);
const ext = extname(here); // tsx 실행 시 '.ts', 컴파일 후 '.js'

export async function loadCommands(): Promise<Map<string, Command>> {
  const commands = new Map<string, Command>();
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith(ext) && !f.endsWith(`.d${ext}`) && f !== `index${ext}`,
  );

  for (const file of files) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)) as Partial<Command>;
    if (!mod.data || !mod.execute) {
      logger.warn(`명령어 파일 ${file} 에 data/execute 가 없어 건너뜁니다.`);
      continue;
    }
    commands.set(mod.data.name, mod as Command);
    logger.debug(`명령어 로드: /${mod.data.name}`);
  }

  logger.info(`${commands.size}개의 명령어를 불러왔습니다.`);
  return commands;
}
