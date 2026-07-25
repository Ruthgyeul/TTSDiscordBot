import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { getGuildSettings, setGuildSetting } from '../core/guildSettings.js';
import * as embeds from '../core/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('관리자 전용 설정. 니가 만질 거 아니면 꺼져.')
  // 디스코드 UI 단에서 "서버 관리" 권한자에게만 노출
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((opt) =>
    opt
      .setName('원격사용')
      .setDescription('음성 채널에 안 들어온 애들도 날 부릴 수 있게 할지')
      .addChoices(
        { name: '켜기 (아무나 부림)', value: 'on' },
        { name: '끄기 (들어온 애들만·기본값)', value: 'off' },
      ),
  )
  .addChannelOption((opt) =>
    opt
      .setName('읽기채널')
      .setDescription('이 채널 채팅은 명령 없이도 알아서 읽어준다')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
  )
  .addBooleanOption((opt) =>
    opt.setName('읽기채널해제').setDescription('지정한 읽기 채널 치워버림'),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({
      embeds: [embeds.error('서버에서만 쓰는 거야.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 런타임 권한 재확인 (기본 권한 설정이 서버에서 덮어써졌을 수 있음)
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      embeds: [embeds.error('**서버 관리** 권한도 없는 게 어딜 넘봐. 손 떼.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const remote = interaction.options.getString('원격사용');
  const readChannel = interaction.options.getChannel('읽기채널');
  const clearReadChannel = interaction.options.getBoolean('읽기채널해제');

  const changes: string[] = [];

  if (remote !== null) {
    const value = remote === 'on';
    setGuildSetting(interaction.guildId, 'allowNonParticipants', value);
    changes.push(
      value
        ? '✅ 비참여자 사용 **켰다** — 이제 음성 채널 안 들어와도 날 부릴 수 있어. 만족해?'
        : '⛔ 비참여자 사용 **껐다** — 음성 채널 들어온 애들만 쓰게 했어.',
    );
  }

  if (clearReadChannel) {
    setGuildSetting(interaction.guildId, 'ttsChannelId', null);
    changes.push('🧹 지정 읽기 채널 **치웠다**. 이제 알아서 기본대로 돌아감.');
  } else if (readChannel) {
    setGuildSetting(interaction.guildId, 'ttsChannelId', readChannel.id);
    changes.push(
      `📢 <#${readChannel.id}> 을 **읽기 채널**로 찍었다. ` +
        '여기 채팅은 명령 안 쳐도 알아서 읽어줄게. (내가 음성 채널 들어가 있을 때 한정이야.)',
    );
  }

  // 아무 옵션도 없으면 현재 설정 표시
  if (changes.length === 0) {
    const s = getGuildSettings(interaction.guildId);
    const readCh = s.ttsChannelId ? `<#${s.ttsChannelId}>` : '없음 (기본대로)';
    return interaction.reply({
      embeds: [
        embeds.info(
          '⚙️ 지금 설정 이렇다',
          `• **비참여자 사용**: ${s.allowNonParticipants ? '✅ 켜짐' : '⛔ 꺼짐 (들어온 애들만)'}\n` +
            `• **지정 읽기 채널**: ${readCh}\n` +
            `• **기본 목소리**: ${s.voice}\n` +
            `• **기본 말투**: ${s.style}`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({ embeds: [embeds.success(changes.join('\n'))] });
}
