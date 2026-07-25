/**
 * 길드별 GuildAudioManager 인스턴스를 보관하는 스토어(싱글턴).
 * 이벤트/명령어 어디서든 현재 세션을 조회/생성/삭제할 수 있게 합니다.
 */
import { GuildAudioManager } from './GuildAudioManager.js';

class AudioSessionStore {
  private sessions = new Map<string, GuildAudioManager>();

  get(guildId: string): GuildAudioManager | null {
    return this.sessions.get(guildId) ?? null;
  }

  has(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  /** 없으면 생성해서 반환 */
  getOrCreate(guildId: string): GuildAudioManager {
    let session = this.sessions.get(guildId);
    if (!session) {
      session = new GuildAudioManager(guildId, () => this.sessions.delete(guildId));
      this.sessions.set(guildId, session);
    }
    return session;
  }

  delete(guildId: string): void {
    const session = this.sessions.get(guildId);
    if (session) session.destroy(); // destroy 콜백이 Map 에서 제거
  }

  /** 종료 시 전체 정리 */
  destroyAll(): void {
    for (const session of this.sessions.values()) session.destroy();
    this.sessions.clear();
  }
}

export const sessionStore = new AudioSessionStore();
