/**
 * 아주 가벼운 레벨 기반 로거.
 * 외부 의존성 없이 콘솔에 색상/타임스탬프를 붙여 출력합니다.
 */

type Level = 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };

const COLORS: Record<Level | 'reset', string> = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[36m', // cyan
  debug: '\x1b[90m', // gray
  reset: '\x1b[0m',
};

// LOG_LEVEL 은 config 로딩 전에도 참조될 수 있어 process.env 를 직접 읽습니다.
const activeLevel =
  LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase() as Level] ?? LEVELS.info;

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: Level, args: unknown[]): void {
  if (LEVELS[level] > activeLevel) return;
  const prefix = `${COLORS[level]}[${timestamp()}] ${level.toUpperCase()}${COLORS.reset}`;
  const method = level === 'debug' ? 'log' : level;
  console[method](prefix, ...args);
}

export const logger = {
  error: (...args: unknown[]) => log('error', args),
  warn: (...args: unknown[]) => log('warn', args),
  info: (...args: unknown[]) => log('info', args),
  debug: (...args: unknown[]) => log('debug', args),
};
