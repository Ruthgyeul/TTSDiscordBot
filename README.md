# 🎙️ TTS Discord Bot

음성 채널에서 여러분의 채팅을 **대신 읽어주는** 디스코드 TTS 봇입니다.
**TypeScript + discord.js** 기반이며, **100% 무료**(Google · Microsoft Edge TTS, API 키·과금 없음)로 동작합니다.

목소리(한국어/영어/일본어/… + 고품질 뉴럴)와 말투(로봇/다람쥐/저음/에코/전화기…)를 바꿔가며
장난스럽게 놀 수 있어요.

---

## ✨ 특징

- **무료·무키**: Google 번역 TTS + Microsoft Edge TTS(뉴럴) — 토큰/결제 전혀 필요 없음
- **다양한 목소리**: 언어 프리셋 + 한국어 고품질 뉴럴(선희/인준) (`/voice`)
- **음성 조작 말투**: FFmpeg 로 음성 자체를 가공 — 로봇/다람쥐/저음/에코/전화기 등 (`/style`)
- **확장 가능한 구조**: 명령어/이벤트/TTS 제공자/말투/목소리를 파일만 추가하면 자동 등록
- **변동성 값은 `.env` 한 곳에**: 봇 이름·설명·상태·읽기 규칙·기본 목소리/말투 등
- **서버별 설정 저장**: `/config` 값(비참여자 허용·읽기 채널)과 목소리/말투가 재시작해도 유지
- 자동 입장, 대기열/즉시 재생, 읽음 이모지, 자동 퇴장(무인/유휴), 안전 종료 등 실사용 편의 기능

---

## 📁 프로젝트 구조

```
src/
├── index.ts                 # 진입점 (ffmpeg/libsodium 준비, 로그인, 종료 처리)
├── deploy-commands.ts       # 슬래시 명령어 등록(초기화 후 전체 재등록)
├── types.ts                 # 공용 타입 + discord.js Client 보강
├── config/
│   ├── index.ts             # .env 로딩·검증 → 단일 config 객체
│   ├── styles.ts            # 말투 = FFmpeg 오디오 이펙트 정의
│   └── voices.ts            # 목소리 프리셋(언어/뉴럴) 정의
├── core/
│   ├── logger.ts            # 레벨 기반 로거
│   ├── embeds.ts            # 임베드 응답 헬퍼
│   ├── textProcessor.ts     # 메시지 정제(URL/이모지/멘션/템플릿/길이)
│   ├── guildSettings.ts     # 서버별 설정 파일 저장/조회
│   └── DiscordClient.ts     # 클라이언트 생성 + 명령어/이벤트 로딩
├── audio/
│   └── effects.ts           # FFmpeg 오디오 필터 적용기
├── commands/                # 슬래시 명령어 (파일 추가 시 자동 등록)
│   └── join / leave / say / style / voice / skip / config / help / index
├── events/                  # 게이트웨이 이벤트 (자동 등록)
│   └── ready / interactionCreate / messageCreate / voiceStateUpdate / index
├── tts/
│   ├── TTSManager.ts        # 제공자 레지스트리 + 합성(+폴백) + 오디오 이펙트
│   └── providers/
│       ├── BaseProvider.ts
│       ├── GoogleTranslateProvider.ts
│       └── EdgeTTSProvider.ts
└── voice/
    ├── GuildAudioManager.ts # 길드별 음성 연결·재생
    ├── AudioSessionStore.ts # 길드별 세션 보관소
    └── ensureConnection.ts  # 자동 입장 헬퍼
```

---

## 🚀 시작하기

### 1. 봇 만들기 (디스코드 개발자 포털)

1. https://discord.com/developers/applications 에서 **New Application** 생성
2. **Bot** 탭 → **Reset Token** 으로 토큰 발급 → 복사
3. **Bot** 탭에서 **MESSAGE CONTENT INTENT** 를 **켬** (채팅을 읽으려면 필수)
4. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `View Channels`, `Add Reactions`
   - 생성된 URL 로 봇을 서버에 초대

### 2. 설치

```bash
npm install
cp .env.example .env
```

`.env` 를 열어 최소한 다음을 채웁니다:

```
DISCORD_TOKEN=발급받은_봇_토큰
DISCORD_CLIENT_ID=애플리케이션_ID
DISCORD_GUILD_ID=테스트할_서버_ID   # (선택) 있으면 명령어가 즉시 등록됨
```

### 3. 명령어 등록 & 실행

```bash
npm run deploy   # 슬래시 명령어 등록 (최초 1회 및 명령어 변경 시)
npm start        # 봇 실행 (tsx 로 TS 직접 실행, 빌드 불필요)
```

> 개발 중엔 `npm run dev`(파일 변경 시 자동 재시작)를 쓰면 편해요.
> 프로덕션에서 컴파일해 돌리려면 `npm run build` 후 `npm run start:prod`.

---

## 🧑‍💻 스크립트

| 스크립트 | 설명 |
| --- | --- |
| `npm start` | tsx 로 TS 소스 직접 실행 |
| `npm run dev` | 파일 변경 감지 자동 재시작 |
| `npm run deploy` | 슬래시 명령어 초기화 후 전체 재등록 |
| `npm run build` | `tsc` 로 `dist/` 에 컴파일 |
| `npm run start:prod` | 컴파일된 `dist/index.js` 실행 |
| `npm run typecheck` | 타입 검사만 (`tsc --noEmit`) |

---

## 🕹️ 명령어

| 명령어 | 설명 |
| --- | --- |
| `/join [채널]` | 음성 채널에 입장 (채널 지정 소환은 관리자 허용 시) |
| `/leave` | 음성 채널에서 퇴장 |
| `/say 내용 [말투] [목소리] [음성채널]` | 문장 바로 읽기 (봇 없으면 자동 입장) |
| `/voice 목소리` | 목소리 변경 |
| `/style 말투` | 말투(오디오 이펙트) 변경 |
| `/skip [전체]` | 현재 문장(또는 전체) 건너뛰기 |
| `/config` | (관리자) 비참여자 허용·자동 읽기 채널 설정 |
| `/help` | 도움말 |

**목소리**: 🇰🇷 한국어 · 🇺🇸 미국영어 · 🇯🇵 일본어 · 🇨🇳 중국어 · 🇫🇷 프랑스어 · 🇪🇸 스페인어 · 🇷🇺 러시아어 · 🇩🇪 독일어 (Google) / ✨ 선희 · 🎧 인준 (Edge 뉴럴)

**말투**: 🗣️ 기본 · 🐿️ 다람쥐 · 😈 저음마왕 · 🤖 로봇 · 🕳️ 동굴 · 🏛️ 홀 · 📞 전화기 · ⚡ 속사포 · 🥴 취함 · 🔞 19금

---

## 🎛️ 커스터마이징

### 목소리 추가 — `src/config/voices.ts`

```ts
italian: {
  label: '이탈리아어', emoji: '🇮🇹', description: '흥겨운 이탈리아어',
  provider: 'google', params: { language: 'it', slow: false },
},
```

### 말투(오디오 이펙트) 추가 — `src/config/styles.ts`

```ts
alien: {
  label: '외계인', emoji: '👽', description: '삐뚤빼뚤 변조음',
  filter: 'vibrato=f=9:d=1,aecho=0.8:0.9:250:0.4',
},
```

FFmpeg `-af` 필터 문자열이면 무엇이든 됩니다. 저장 후 `npm run deploy` 하면 `/style` 선택지에 자동 반영.

### 새 TTS 엔진 추가

1. `src/tts/providers/` 에 `BaseProvider` 를 상속한 클래스 작성 (`synthesize()` 구현)
2. `src/tts/TTSManager.ts` 에 `.register(new YourProvider())` 한 줄 추가
3. `voices.ts` 에 그 엔진을 쓰는 프리셋 추가

---

## ⚙️ 주요 `.env` 설정 요약

| 키 | 설명 |
| --- | --- |
| `BOT_NAME` / `BOT_DESCRIPTION` / `BOT_ACTIVITY` | 봇 정체성·상태 |
| `DEFAULT_VOICE` / `DEFAULT_STYLE` | 기본 목소리/말투 |
| `MESSAGE_TEMPLATE` / `READ_USERNAME` | 읽기 형식 (`{user}`, `{message}`) |
| `IGNORE_PREFIXES` | 이 접두사로 시작하면 무시 |
| `MAX_MESSAGE_LENGTH` / `QUEUE_MAX` | 글자 수·대기열 상한 |
| `PLAYBACK_MODE` | `queue`(순차) / `immediate`(끊고 즉시) |
| `REACT_ON_READ` / `READ_REACTION_EMOJI` | 읽음 이모지 |
| `BIND_TO_TEXT_CHANNEL` / `ALLOW_NON_PARTICIPANTS` | 읽기 대상·사용 권한 기본값 |
| `AUTO_LEAVE_SECONDS` | 음성 채널이 비면 자동 퇴장(초) |

전체 항목은 [.env.example](.env.example) 참고.

---

## 🧰 요구 사항

- **Node.js ≥ 18** (권장 20+). ffmpeg 는 `ffmpeg-static` 로 자동 포함됩니다.
- 네이티브 모듈(`@discordjs/opus`) 빌드를 위해 최초 설치 시 빌드 도구가 필요할 수 있어요.

## 📝 라이선스

MIT
