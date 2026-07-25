import {
  SlashCommandBuilder,
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type VoiceBasedChannel,
} from 'discord.js';
import { buildSpeech } from '../core/textProcessor.js';
import { getGuildSettings } from '../core/guildSettings.js';
import { sessionStore } from '../voice/AudioSessionStore.js';
import { ensureConnection } from '../voice/ensureConnection.js';
import { listStyles } from '../config/styles.js';
import { listVoices } from '../config/voices.js';
import * as embeds from '../core/embeds.js';

const styleChoices = listStyles().slice(0, 25);
const voiceChoices = listVoices().slice(0, 25);

export const data = new SlashCommandBuilder()
  .setName('say')
  .setDescription('시키는 거 읽어준다. 음성 채널 있으면 알아서 들어가고, 없으면 채널 찍어.')
  .addStringOption((opt) =>
    opt.setName('내용').setDescription('뭐라고 말할 건데').setRequired(true).setMaxLength(500),
  )
  .addStringOption((opt) => {
    opt.setName('말투').setDescription('이번만 쓸 말투 (안 정하면 기본값)');
    for (const c of styleChoices) opt.addChoices({ name: `${c.emoji} ${c.label}`, value: c.key });
    return opt;
  })
  .addStringOption((opt) => {
    opt.setName('목소리').setDescription('이번만 쓸 목소리 (안 정하면 기본값)');
    for (const c of voiceChoices) opt.addChoices({ name: `${c.emoji} ${c.label}`, value: c.key });
    return opt;
  })
  .addChannelOption((opt) =>
    opt
      .setName('음성채널')
      .setDescription('날 부를 음성 채널 (이미 들어가 있으면 비워둬)')
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({
      embeds: [embeds.error('서버에서만 쓰는 거야.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  const settings = getGuildSettings(interaction.guildId);
  const argVoice = interaction.options.getChannel('음성채널') as VoiceBasedChannel | null;
  const userVoice = interaction.member.voice.channel;

  const existing = sessionStore.get(interaction.guildId);
  const alreadyConnected = Boolean(existing?.isConnected());

  // 봇이 아직 없을 때만 어디로 들어갈지 판단
  if (!alreadyConnected) {
    const target = argVoice ?? userVoice;
    if (!target) {
      return interaction.editReply({
        embeds: [
          embeds.error('음성 채널부터 들어가든가 `음성채널` 옵션으로 찍어. 뭘 어쩌라는 거야.'),
        ],
      });
    }

    // 요청자가 그 채널에 함께 있지 않으면 = 비참여 사용 → 관리자 허용 필요
    const userInTarget = userVoice?.id === target.id;
    if (!userInTarget && !settings.allowNonParticipants) {
      return interaction.editReply({
        embeds: [
          embeds.error(
            '음성 채널 들어오지도 않고 딴 채널 찍는 건 관리자 허락 있어야 돼.\n' +
              '직접 들어와서 하든가, 관리자한테 `/config 원격사용:켜기` 해달라고 빌든가.',
          ),
        ],
      });
    }
  }

  // 자동 입장 (argVoice 지정 시 그 채널, 아니면 요청자 채널)
  const result = await ensureConnection({
    guild: interaction.guild,
    member: interaction.member,
    textChannelId: interaction.channelId,
    voiceChannel: argVoice ?? undefined,
  });

  if (result.error === 'no-voice') {
    return interaction.editReply({
      embeds: [embeds.error('음성 채널부터 들어가든가 `음성채널` 옵션으로 찍으라니까.')],
    });
  }
  if (result.error === 'no-perms') {
    return interaction.editReply({
      embeds: [embeds.error('거기 들어갈 권한도 없거든? 연결/말하기 권한부터 챙겨와.')],
    });
  }
  if (result.error === 'connect-failed') {
    return interaction.editReply({ embeds: [embeds.error(result.message)] });
  }

  const session = result.session;

  // 이미 연결돼 있던 경우의 참여자 규칙 재확인
  if (!settings.allowNonParticipants && !session.isParticipant(interaction.member)) {
    return interaction.editReply({
      embeds: [embeds.error('내가 있는 음성 채널에 들어온 애들만 쓸 수 있어. 기어들어와 일단.')],
    });
  }

  const content = interaction.options.getString('내용', true);
  const speech = buildSpeech({
    content,
    username: interaction.member.displayName ?? interaction.user.username,
  });

  if (!speech) {
    return interaction.editReply({ embeds: [embeds.error('읽을 것도 없잖아. 장난쳐?')] });
  }

  const override = {
    voice: interaction.options.getString('목소리') ?? undefined,
    style: interaction.options.getString('말투') ?? undefined,
  };
  const accepted = session.enqueue(speech, override);
  if (!accepted) {
    return interaction.editReply({
      embeds: [embeds.error('밀린 게 산더미야. 좀 있다 다시 와.')],
    });
  }

  const prefix = result.joined ? `**${result.channel?.name ?? '음성 채널'}** 기어들어가서 ` : '';
  return interaction.editReply({
    embeds: [embeds.success(`${prefix}읽어준다: "${content}"`)],
  });
}
