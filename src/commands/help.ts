import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import config from '../config/index.js';
import { listStyles } from '../config/styles.js';
import { listVoices } from '../config/voices.js';
import * as embeds from '../core/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('쓸 줄 모르냐? 알려줄 테니 잘 봐.');

export async function execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
  const commandRows: Array<[string, string]> = [
    ['/join [채널]', '음성 채널에 강림 (채널 지정 소환은 관리자 허락받고)'],
    ['/leave', '꺼져달라 하면 나가줌'],
    ['/say 내용 [음성채널]', '시키는 거 바로 읽음 (봇 없으면 알아서 들어감)'],
    ['/style 말투', '말투 갈아치우기 (아래 목록 봐)'],
    ['/voice', '목소리(언어/억양) 갈아치우기'],
    ['/skip', '지금 읽는 거 건너뜀'],
    ['/config', '(관리자) 비참여자 허용·자동 읽기 채널'],
    ['/help', '이거. 지금 보고 있잖아.'],
  ];
  const commands = commandRows.map(([c, d]) => `**${c}** — ${d}`).join('\n');

  const styleList = listStyles()
    .map((s) => `${s.emoji} **${s.label}** (\`${s.key}\`) — ${s.description}`)
    .join('\n');

  const voiceList = listVoices()
    .map((v) => `${v.emoji} **${v.label}** (\`${v.key}\`)`)
    .join(' · ');

  const embed = embeds
    .info(`🎙️ ${config.bot.name} 사용설명서`, config.bot.description)
    .addFields(
      { name: '명령어', value: commands },
      { name: '목소리 (다 공짜다)', value: voiceList },
      { name: '말투', value: styleList },
      {
        name: '이대로 해',
        value:
          '1. 음성 채널 들어가서 `/join`. 그것부터 해.\n' +
          '2. 그 담부터 채팅 치면 내가 읽어준다. (읽은 건 이모지 박아줌)\n' +
          '3. 심심하면 `/style`·`/voice` 로 이것저것 바꿔보든가.\n' +
          '4. (관리자) `/config 읽기채널:#채널` 하면 그 채널은 알아서 읽어줌.',
      },
    );

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
