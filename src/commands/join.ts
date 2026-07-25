import {
  SlashCommandBuilder,
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type VoiceBasedChannel,
} from 'discord.js';
import { sessionStore } from '../voice/AudioSessionStore.js';
import { getGuildSettings } from '../core/guildSettings.js';
import * as embeds from '../core/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('음성 채널 들어가서 니들 채팅 대신 읽어준다. 영광인 줄 알아.')
  .addChannelOption((opt) =>
    opt
      .setName('채널')
      .setDescription('날 부를 음성 채널. (비참여자 허용된 서버에서만 되니까 착각 ㄴㄴ)')
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({
      embeds: [embeds.error('서버에서만 부를 수 있어. DM 으로 뭐 하냐?')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const member = interaction.member;
  const userChannel = member.voice.channel;
  const argChannel = interaction.options.getChannel('채널') as VoiceBasedChannel | null;
  const settings = getGuildSettings(interaction.guildId);

  const target = argChannel ?? userChannel;

  // 들어갈 채널을 특정할 수 없음
  if (!target) {
    const hint = settings.allowNonParticipants
      ? '음성 채널부터 들어가든가, `채널` 옵션으로 어디 갈지 정해. 그것도 못 하냐?'
      : '음성 채널부터 들어가고 불러. 기본도 모르네.';
    return interaction.reply({ embeds: [embeds.error(hint)], flags: MessageFlags.Ephemeral });
  }

  // 봇이 갈 채널에 사용자가 함께 있지 않은 경우 = 비참여 소환 → 관리자 허용 필요
  const userInTarget = userChannel?.id === target.id;
  if (!userInTarget && !settings.allowNonParticipants) {
    return interaction.reply({
      embeds: [
        embeds.error(
          '이 서버는 **음성 채널 들어온 애들만** 날 쓸 수 있게 돼 있거든?\n' +
            '부르고 싶으면 음성 채널부터 기어들어와. ' +
            '(관리자면 `/config 원격사용:켜기` 로 열든가.)',
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const me = interaction.guild.members.me;
  const perms = me ? target.permissionsFor(me) : null;
  if (!perms?.has('Connect') || !perms.has('Speak')) {
    return interaction.reply({
      embeds: [embeds.error('거기 들어갈 권한도 없는데 뭘 불러. 연결/말하기 권한부터 챙겨와.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  const session = sessionStore.getOrCreate(interaction.guildId);
  try {
    await session.connect(target, interaction.channelId);
  } catch (err) {
    sessionStore.delete(interaction.guildId);
    return interaction.editReply({ embeds: [embeds.error((err as Error).message)] });
  }

  return interaction.editReply({
    embeds: [
      embeds.success(
        `**${target.name}** 에 강림했다. ` +
          '이제부터 니들 떠드는 거 읽어줄 테니까 감사해라. 꺼지라고 할 땐 `/leave`.',
      ),
    ],
  });
}
