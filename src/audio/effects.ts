/**
 * FFmpeg 오디오 필터로 음성을 조작(이펙트 적용)합니다.
 *
 * Google/Edge TTS 는 "순수 기본값"으로 평범한 음성만 만들고,
 * 스타일(로봇/다람쥐/에코 등)은 여기서 오디오 자체를 가공해 만듭니다.
 * 별도 라이브러리 없이, 번들된 ffmpeg-static 바이너리를 사용합니다.
 */
import { spawn } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';
import { logger } from '../core/logger.js';

// ffmpeg-static 는 바이너리 경로 문자열(없으면 null)을 default export 로 제공
const ffmpegPath = ffmpegStatic as unknown as string | null;

/**
 * mp3 버퍼에 FFmpeg 오디오 필터(-af 문자열)를 적용해 새 mp3 버퍼를 반환합니다.
 * 실패하면 원본 버퍼를 그대로 돌려줘 재생이 끊기지 않게 합니다.
 *
 * @param inputBuffer 원본 mp3
 * @param filter  FFmpeg -af 필터 체인 (없으면 원본 그대로)
 */
export function applyAudioFilter(inputBuffer: Buffer, filter?: string | null): Promise<Buffer> {
  if (!filter || !ffmpegPath) return Promise.resolve(inputBuffer);

  return new Promise((resolve) => {
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-af', filter,
      '-f', 'mp3',
      'pipe:1',
    ];
    const ff = spawn(ffmpegPath as string, args);

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    ff.stdout.on('data', (d: Buffer) => out.push(d));
    ff.stderr.on('data', (d: Buffer) => err.push(d));

    ff.on('error', (e) => {
      logger.warn(`오디오 이펙트 실행 실패, 원본 재생: ${e.message}`);
      resolve(inputBuffer);
    });
    ff.on('close', (code) => {
      if (code === 0 && out.length > 0) {
        resolve(Buffer.concat(out));
      } else {
        logger.warn(
          `오디오 이펙트 실패(code ${code}), 원본 재생: ${Buffer.concat(err).toString().slice(0, 150)}`,
        );
        resolve(inputBuffer);
      }
    });

    ff.stdin.on('error', () => {}); // EPIPE 무시
    ff.stdin.end(inputBuffer);
  });
}
