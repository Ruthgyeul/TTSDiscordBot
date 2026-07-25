/**
 * 봇이 아직 음성 채널에 없으면, 요청자(멤버)의 음성 채널로 자동 입장시킵니다.
 * /say, 등록된 읽기 채널의 자동 읽기 등 여러 곳에서 재사용합니다.
 */
import type { Guild, GuildMember, VoiceBasedChannel } from 'discord.js';
import { sessionStore } from './AudioSessionStore.js';
import type { GuildAudioManager } from './GuildAudioManager.js';

export type EnsureResult =
  | { session: GuildAudioManager; joined: boolean; channel?: VoiceBasedChannel; error?: undefined }
  | { error: 'no-voice' }
  | { error: 'no-perms'; channel?: VoiceBasedChannel }
  | { error: 'connect-failed'; message: string };

interface EnsureOptions {
  guild: Guild;
  member: GuildMember | null | undefined;
  textChannelId: string | null;
  voiceChannel?: VoiceBasedChannel | null;
}

export async function ensureConnection({
  guild,
  member,
  textChannelId,
  voiceChannel = null,
}: EnsureOptions): Promise<EnsureResult> {
  const guildId = guild.id;

  // 이미 연결돼 있으면 그대로 사용
  const existing = sessionStore.get(guildId);
  if (existing && existing.isConnected()) {
    return { session: existing, joined: false };
  }

  // 들어갈 채널 = 지정된 채널 또는 요청자가 있는 음성 채널
  const channel = voiceChannel ?? member?.voice?.channel ?? null;
  if (!channel) return { error: 'no-voice' };

  // 봇 권한 확인
  const me = guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  if (!perms?.has('Connect') || !perms.has('Speak')) {
    return { error: 'no-perms', channel };
  }

  const session = sessionStore.getOrCreate(guildId);
  try {
    await session.connect(channel, textChannelId);
  } catch (err) {
    sessionStore.delete(guildId);
    return { error: 'connect-failed', message: (err as Error).message };
  }
  return { session, joined: true, channel };
}
