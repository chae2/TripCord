# TripCord

그룹 여행을 위한 Discord 운영 봇. 예약 검색, 일정, 정산, 사진 갤러리, 날씨/준비물 알림, 대화 맥락 안내 에이전트를 슬래시 커맨드로 제공한다.

## 준비물

- Discord 봇 토큰 + 클라이언트 ID ([Discord Developer Portal](https://discord.com/developers/applications))
  - 필요한 인텐트: `MESSAGE CONTENT INTENT` (봇 설정 페이지에서 활성화 필요)
- Postgres 연결 문자열 (Supabase 등)
- Supabase Storage 버킷 (사진 미러링용, 기본 이름 `trip-photos`) — Supabase 프로젝트에서 **public** 버킷으로 생성
- RapidAPI 키 + 구독한 Skyscanner/호텔 검색 상품의 호스트명
- OpenWeatherMap API 키 (One Call API 3.0 구독 필요, 무료 티어로 일 1,000회까지 가능)

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
| `/스케줄 추가\|보기` | 일차별 일정 관리 |
| `/정산 기록\|현황\|초기화` | 결제자 기준 N분의 1 정산 |
| `/준비 추가\|목록\|완료` | 개인 준비물 체크리스트 |
| `/갤러리 [일차] [위치]` | 사진 갤러리 (채널에 이미지 업로드 시 자동 수집) |

텍스트 채팅 중 예약/일정/정산/준비물 관련 키워드가 감지되면 봇이 관련 커맨드 사용을 안내한다 (LLM 미사용, 정규식 기반).

## 주의사항

- `/예약`이 사용하는 RapidAPI 엔드포인트(`src/services/skyscannerClient.ts`, `src/services/hotelClient.ts`)는 비공식 API로, 구독한 상품에 따라 요청/응답 스키마가 다를 수 있다. 실패 시 해당 파일의 경로/파라미터를 실제 구독 상품 문서에 맞게 조정할 것.
- Discord 첨부파일 URL은 서명이 만료되므로, 사진은 업로드 즉시 Supabase Storage로 미러링해 보관한다.
