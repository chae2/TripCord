# TripCord

그룹 여행을 위한 Discord 운영 봇. 예약 검색, 일정, 정산, 사진 갤러리, 날씨/준비물 알림, 대화 맥락 안내 에이전트를 슬래시 커맨드로 제공한다.

## 준비물

- Discord 봇 토큰 + 클라이언트 ID ([Discord Developer Portal](https://discord.com/developers/applications))
  - 필요한 인텐트: `MESSAGE CONTENT INTENT`, `SERVER MEMBERS INTENT` (봇 설정 페이지에서 둘 다 활성화 필요 — 후자는 `/역할`·`/정산`의 `@everyone` 멘션 지원에 필요)
- Postgres 연결 문자열 (Supabase 등)
- Supabase Storage 버킷 (사진 미러링용, 기본 이름 `trip-photos`) — Supabase 프로젝트에서 **public** 버킷으로 생성
- RapidAPI 키. 마켓플레이스에서 "Flights Scraper Sky"(항공권, 호스트 `flights-sky.p.rapidapi.com`, publisher: ntd119)와 "Booking.com"(숙소, 호스트 `booking-com15.p.rapidapi.com`) 두 상품을 검색해 각각 무료 Basic 플랜으로 **Subscribe**해야 한다 — 구독 안 하면 403 "not subscribed" 에러가 난다. "Sky Scrapper"(apiheya, sky-scrapper.p.rapidapi.com)도 같은 데이터 출처(Skyscanner)를 쓰는 대체 상품이라, 한쪽 무료 한도(월 100회 등)가 차면 `RAPIDAPI_FLIGHT_HOST`를 그쪽으로 바꿔서 계속 쓸 수 있다.
- OpenWeatherMap API 키 (One Call API 3.0 구독 필요, 무료 티어로 일 1,000회까지 가능)
- 카카오 개발자 REST API 키 ([Kakao Developers](https://developers.kakao.com)) — 앱 생성 후 **제품 설정 > 카카오맵**에서 사용 설정을 반드시 ON으로 켤 것. 꺼져 있으면 `/추천` 호출 시 403 `NotAuthorizedError`(disabled OPEN_MAP_AND_LOCAL service)가 난다. 이건 사용자 동의(OAuth scope) 문제가 아니라 앱 단위 콘솔 설정이다.
- 네이버 검색 API 키 ([Naver Developers](https://developers.naver.com)에서 애플리케이션 등록 후 발급) — `/추천`의 놀거리·기념품 카테고리(한국 지역)에 사용
- Yahoo!로컬서치API Client ID ([Yahoo! Developer Network](https://developer.yahoo.co.jp)) — 일본 지역 카페·놀거리·기념품 검색에 사용
- 핫페퍼 구르메API 키 ([Recruit Web Service](https://webservice.recruit.co.jp/register)) — 일본 지역 맛집·`/점메추`·`/저메추`에 사용
- (모두 선택) 위 세 API 키가 없어도 봇은 정상 동작하고, 해당 provider를 실제로 호출할 때만 "설정되어 있지 않아요" 에러로 우아하게 실패한다.

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
| `/여행종료` | 활성 여행 종료 (수동 호출 또는 종료일 다음날 00:05에 자동 호출) |
| `/예약 종류 위치 명수 [비행방식] [출발지] [우선순위] [출발일] [복귀일]` | 종류(비행기\|숙소)를 골라 하나씩 검색. 비행기는 왕복/편도·출발지(기본 서울) 선택 가능하고 항상 최저가순, 숙소는 우선순위(가격\|평점\|추천순, 기본 가격) 선택 가능. 날짜 미입력 시 등록된 여행 기간을 기본값으로 사용 |
| `/일정 추가\|보기` | 일차별 일정 관리 (위치·시간 선택 입력 가능, 당일 아침 08:00에 자동 안내) |
| `/정산 기록\|현황\|요청\|초기화` | 결제자를 지정해 N분의 1 기록, 현황은 "누가 누구에게 얼마" 형태(페어와이즈), `요청`은 계좌 안내 |
| `/준비 추가\|공통추가\|목록` | 개인/공통 준비물 체크리스트 (버튼으로 체크, 물품은 띄어쓰기로 여러 개 한번에 추가) |
| `/갤러리 [일차] [위치]` | 사진 갤러리 (채널에 이미지 업로드 시 자동 수집) |
| `/역할 추가\|삭제\|수정\|배정\|배정해제\|랜덤\|보기` | 준비 역할 관리 (역할당 다중 배정 가능, `/역할 랜덤`은 참가자·역할 수를 비교해 자동으로 배정 방식을 정하고 재실행 시 이전 배정을 초기화, `@everyone` 멘션 지원) |
| `/추천 카테고리 [장소]` | 카페\|맛집\|놀거리\|기념품 중 선택. "여행 일정 조사" 역할 보유자만 사용 가능. 여행지가 일본이면 Yahoo/핫페퍼, 그 외는 카카오/네이버로 자동 라우팅 |
| `/점메추`, `/저메추 [장소]` | 오늘 일정 위치(또는 여행지)의 향토음식 맛집 추천, 역할 제한 없음 |
| `/자기소개 등록\|보기` | 이름/별명/좋아하는것/싫어하는것/특이사항/이외내용을 등록하거나 다른 사람 것을 조회(나에게만 표시) |

텍스트 채팅 중 예약/일정/정산/준비물 관련 키워드가 감지되면 봇이 관련 커맨드 사용을 안내한다 (LLM 미사용, 정규식 기반).

## 웹 대시보드 (`web/`)

Next.js 14 + Tailwind로 만든 읽기 공개 · 편집은 비밀번호로 잠긴 대시보드. 봇과 동일한 Supabase Postgres를 `prisma/schema.prisma`(레포 루트, 단일 스키마) 기준으로 직접 조회한다.

```bash
cd web
npm install
cp .env.example .env   # DATABASE_URL(봇과 동일), EDIT_PASSWORD 채우기
npm run dev
```

- 참가자 소개(좋아하는것/싫어하는것/특이사항/이외내용), 일정 내용, 사진 위치 태그는 우측 상단 "수정" 버튼으로 비밀번호를 입력하면 인라인 편집이 가능하다. 이름/별명은 `/자기소개 등록`으로만 설정(웹에서는 읽기 전용). 정산·역할은 디스코드가 원본(source of truth)이라 웹에서는 읽기 전용이다.
- 여러 길드가 같은 DB를 공유한다면 `GUILD_ID` 환경변수로 표시할 길드를 고정할 수 있다.
- Vercel 배포 시 프로젝트의 **Root Directory를 `web`으로 지정**한다. `web/package.json`의 `build` 스크립트가 루트의 `prisma/schema.prisma`를 `--schema` 상대경로로 참조해 자체 생성하므로 별도 워크스페이스 설정 없이도 동작한다. `@prisma/client`는 web에 별도로 설치하지 않고(루트에 생성된 클라이언트를 상위 디렉터리 탐색으로 재사용) 스키마 이중 관리를 피한다 — `web/lib/prisma.ts` 참고.
- `web/`의 Next.js는 알려진 취약점 수정을 반영한 최신 14.x 패치(`14.2.35`)를 쓰고 있다. Next 15/16으로의 메이저 업그레이드는 App Router 동작 변경(비동기 요청 API 등)을 검증할 시간이 필요해 이번 범위에서는 보류했다.

## 주의사항

- `/예약`이 사용하는 RapidAPI 엔드포인트(`src/services/skyscannerClient.ts`: Flights Scraper Sky, `src/services/hotelClient.ts`: Booking.com)는 비공식 API라 스키마가 예고 없이 바뀔 수 있다. "not subscribed"(403) 에러가 나면 RapidAPI에서 해당 상품을 구독했는지, "API doesn't exists" 류 에러가 나면 호스트/경로가 여전히 맞는지 먼저 확인할 것.
- Discord 첨부파일 URL은 서명이 만료되므로, 사진은 업로드 즉시 Supabase Storage로 미러링해 보관한다.
- `/추천`은 "여행 일정 조사" 역할(`/역할 추가`로 만들어지는 기본 역할 중 하나)을 가진 사람만 사용할 수 있다.
- 일본 지역 검색은 Yahoo!로컬서치API(카페/놀거리/기념품)와 핫페퍼 구르메API(맛집)만 연동했다. NAVITIME/Tabelog/FURUNAVI는 공식 공개 API가 없어 연동하지 않았다.
- `/예약`의 `[위치]`에 링크를 넣으면 구글 지도의 `/maps/place/지명/` 패턴 정도만 지명을 추출한다(`src/utils/locationParsing.ts`) — 그 외 형태의 링크나 단축 URL은 원문 그대로 사용된다.
- 비슷한 이름의 API 클론 `sky-scrapper3`(kevinagustiansyah298) 등은 항공권 API가 아니므로 절대 구독하지 말 것. `flights-sky`는 한글 지명 질의도 정상 동작하는 것을 실제 호출로 확인했다.
- Windows에서 `npm run` 스크립트 실행 시 뜨던 "일괄 작업을 끝내겠습니까(Y/N)?" 프롬프트는 `.npmrc`(`script-shell=powershell.exe`)로 없앴다. 이 때문에 `web/package.json`의 스크립트는 PowerShell 5.1이 `&&`를 지원하지 않아 `npm-run-all2`(`run-s`)로 순차 실행하도록 되어 있다 — 새 스크립트를 추가할 때도 `&&` 대신 이 방식을 따를 것.
