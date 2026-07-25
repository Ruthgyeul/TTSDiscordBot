/**
 * 봇이 있는 음성 채널에 사람이 아무도 남지 않으면 자동 퇴장을 예약합니다.
 * 사람이 다시 들어오면 예약을 취소합니다.
 */
import { Events, type VoiceState, type VoiceBasedChannel } from 'discord.js';
import { sessionStore } from '../voice/AudioSessionStore.js';

export const name = Events.VoiceStateUpdate;

export function execute(oldState: VoiceState, newState: VoiceState): void {
  const guild = newState.guild ?? oldState.guild;
  const guildId = guild?.id;
  if (!guildId) return;

  const session = sessionStore.get(guildId);
  if (!session || !session.isConnected() || !session.voiceChannelId) return;

  const channel = guild.channels.cache.get(session.voiceChannelId) as VoiceBasedChannel | undefined;
  if (!channel) return;

  // 봇을 제외한 실제 사용자 수
  const humans = channel.members.filter((m) => !m.user.bot).size;

  if (humans === 0) {
    session.scheduleEmptyDisconnect();
  } else {
    session.cancelEmptyDisconnect();
  }
}
