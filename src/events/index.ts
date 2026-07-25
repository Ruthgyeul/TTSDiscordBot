/**
 * events 폴더의 모든 이벤트 핸들러를 클라이언트에 자동 연결합니다.
 * 각 파일은 { name, once?, execute } 를 export 합니다.
 */
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';
import type { Client } from 'discord.js';
import { logger } from '../core/logger.js';
import type { EventModule } from '../types.js';

const here = fileURLToPath(import.meta.url);
const dir = dirname(here);
const ext = extname(here); // tsx 실행 시 '.ts', 컴파일 후 '.js'

export async function registerEvents(client: Client): Promise<void> {
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith(ext) && !f.endsWith(`.d${ext}`) && f !== `index${ext}`,
  );

  for (const file of files) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)) as Partial<EventModule>;
    if (!mod.name || !mod.execute) {
      logger.warn(`이벤트 파일 ${file} 에 name/execute 가 없어 건너뜁니다.`);
      continue;
    }
    const handler = (...args: unknown[]): unknown => mod.execute!(...args);
    if (mod.once) {
      client.once(mod.name as never, handler as never);
    } else {
      client.on(mod.name as never, handler as never);
    }
    logger.debug(`이벤트 연결: ${mod.name}`);
  }
}
