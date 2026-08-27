# TripCord

그룹 여행을 위한 Discord 운영 봇. 예약 검색, 일정, 정산, 사진 갤러리, 날씨/준비물 알림, 대화 맥락 안내 에이전트를 슬래시 커맨드로 제공한다.

## 준비물

- Discord 봇 토큰 + 클라이언트 ID ([Discord Developer Portal](https://discord.com/developers/applications))
  - 필요한 인텐트: `MESSAGE CONTENT INTENT` (봇 설정 페이지에서 활성화 필요)
- Postgres 연결 문자열 (Supabase 등)
- Supabase Storage 버킷 (사진 미러링용, 기본 이름 `trip-photos`) — Supabase 프로젝트에서 **public** 버킷으로 생성
- RapidAPI 키. 마켓플레이스에서 "Sky Scrapper"(항공권, 호스트 `sky-scrapper.p.rapidapi.com`)와 "Booking.com"(숙소, 호스트 `booking-com15.p.rapidapi.com`) 두 상품을 검색해 각각 무료 Basic 플랜으로 **Subscribe**해야 한다 — 구독 안 하면 403 "not subscribed" 에러가 난다
- OpenWeatherMap API 키 (One Call API 3.0 구독 필요, 무료 티어로 일 1,000회까지 가능)
- 카카오 개발자 REST API 키 ([Kakao Developers](https://developers.kakao.com), 로컬(장소 검색) API 활성화)

## 로컬 실행

```bash
npm install
cp .env.example .env   # 값 채우기
npx prisma migrate dev # DB 스키마 적용
npm run deploy-commands # 슬래시 커맨드 등록 (DISCORD_DEV_GUILD_ID 설정 시 해당 길드에 즉시 반영)
npm run dev             # 봇 실행
```

## 배포

Railway/Fly.io/Render 등에 Node 프로세스로 배포한다. 배포 전 빌드:

```bash
npm run build
npm run deploy-commands
npm start
```

환경변수는 `.env.example`을 참고해 배포 플랫폼의 환경변수로 등록한다. 봇 프로세스 하나가 Discord 클라이언트와 `node-cron` 스케줄러(매시 날씨 폴링, 매일 20:00 알림)를 함께 구동하므로 별도의 워커 프로세스는 필요 없다.

## 커맨드

| 커맨드 | 설명 |
| --- | --- |
| `/여행등록 목적지 시작일 종료일` | 길드의 활성 여행을 새로 등록 |
| `/여행종료` | 활성 여행 종료 |
| `/예약 위치 우선순위 명수 [출발일] [복귀일]` | Skyscanner/Agoda 계열 검색 |
| `/일정 추가\|보기` | 일차별 일정 관리 (당일 아침 08:00에 자동 안내) |
| `/정산 기록\|현황\|초기화` | 결제자 기준 N분의 1 정산 |
| `/준비 추가\|목록\|완료` | 개인 준비물 체크리스트 |
| `/갤러리 [일차] [위치]` | 사진 갤러리 (채널에 이미지 업로드 시 자동 수집) |
| `/역할 추가\|배정\|랜덤\|보기` | 준비 역할 관리 (역할당 다중 배정 가능, 랜덤 사다리타기 지원) |
| `/추천 키워드 [지역]` | "여행 일정 조사" 역할을 가진 사람만 사용 가능, 카카오 로컬 API로 장소 검색 |
| `/자기소개 내용` | 웹 대시보드에 표시될 내 소개 등록 |

텍스트 채팅 중 예약/일정/정산/준비물 관련 키워드가 감지되면 봇이 관련 커맨드 사용을 안내한다 (LLM 미사용, 정규식 기반).

## 웹 대시보드 (`web/`)

Next.js 14 + Tailwind로 만든 읽기 공개 · 편집은 비밀번호로 잠긴 대시보드. 봇과 동일한 Supabase Postgres를 `prisma/schema.prisma`(레포 루트, 단일 스키마) 기준으로 직접 조회한다.

```bash
cd web
npm install
cp .env.example .env   # DATABASE_URL(봇과 동일), EDIT_PASSWORD 채우기
npm run dev
```

- 참가자 소개(`bio`), 일정 내용, 사진 위치 태그는 우측 상단 "수정" 버튼으로 비밀번호를 입력하면 인라인 편집이 가능하다. 정산·역할은 디스코드가 원본(source of truth)이라 웹에서는 읽기 전용이다.
- 여러 길드가 같은 DB를 공유한다면 `GUILD_ID` 환경변수로 표시할 길드를 고정할 수 있다.
- Vercel 배포 시 프로젝트의 **Root Directory를 `web`으로 지정**한다. `web/package.json`의 `build` 스크립트가 루트의 `prisma/schema.prisma`를 `--schema` 상대경로로 참조해 자체 생성하므로 별도 워크스페이스 설정 없이도 동작한다. `@prisma/client`는 web에 별도로 설치하지 않고(루트에 생성된 클라이언트를 상위 디렉터리 탐색으로 재사용) 스키마 이중 관리를 피한다 — `web/lib/prisma.ts` 참고.
- `web/`의 Next.js는 알려진 취약점 수정을 반영한 최신 14.x 패치(`14.2.35`)를 쓰고 있다. Next 15/16으로의 메이저 업그레이드는 App Router 동작 변경(비동기 요청 API 등)을 검증할 시간이 필요해 이번 범위에서는 보류했다.

## 주의사항

- `/예약`이 사용하는 RapidAPI 엔드포인트(`src/services/skyscannerClient.ts`: Sky Scrapper, `src/services/hotelClient.ts`: Booking.com)는 비공식 API라 스키마가 예고 없이 바뀔 수 있다. "not subscribed"(403) 에러가 나면 RapidAPI에서 해당 상품을 구독했는지, "API doesn't exists" 류 에러가 나면 호스트/경로가 여전히 맞는지 먼저 확인할 것.
- Discord 첨부파일 URL은 서명이 만료되므로, 사진은 업로드 즉시 Supabase Storage로 미러링해 보관한다.
- `/추천`은 "여행 일정 조사" 역할(`/역할 추가`로 만들어지는 기본 역할 중 하나)을 가진 사람만 사용할 수 있다.
