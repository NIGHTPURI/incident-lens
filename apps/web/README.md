# IncidentLens 웹 클라이언트

[한국어 기본 문서](../../README.md) · [English](../../README.en.md)

React·TypeScript·Vite 기반 장애·부하 테스트 UI입니다. 잠금 파일의 도구 요구사항은 Node.js 22.12 이상의 22.x 또는 24 이상입니다. 홈 `/`, 자유실험실 `?view=lab`, 근거·RCA `?view=evidence`, 전후 비교 `?view=comparison`, 기술 사전 `?view=technology`, PC 준비안 `?view=settings`를 제공합니다. 로고는 도구 홈으로 돌아가며 직접 URL·새로고침·history·embed를 지원합니다. 일반 학습 과정은 이 앱에 포함하지 않습니다. 이전 `?view=learn`은 비공개 저장소 분리 안내입니다.

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
npm test
npm run build
npm run test:browser
```

API 프록시는 저장소 루트 `.env`의 `CONTROL_PLANE_PORT`를 읽습니다. 실험 서버 없이 UI만 보려면 dev 명령에 `--mode ui`를 추가하세요. API는 503으로 차단하며 가짜 결과를 만들지 않습니다. Windows에서는 필요하면 `npm.cmd`를 사용합니다. Playwright Chromium 설치가 필요한 경우 도구 설치를 확인하세요.

`src/lab-guides/`는 데모의 DB·캐시·메시징·관측·부하·RCA 설명입니다. 화면 이동과 PC 준비안 선택은 서버나 Docker를 변경하지 않습니다. 실험 동작은 사용자의 명시적 버튼/터미널 실행만 처리합니다. locale와 테마를 브라우저에 저장하며 기존 세션 선택 키·학습 기록을 지우지 않습니다. 새 실행 OS 키는 기존 학습 OS 키에서 한 번 복사하고 독립적으로 저장합니다.

현재 README 캡처는 `screenshots/split-{ko,en}-{home,lab,technology}.png`이며 같은 크기의 실제 최신 한영 화면입니다. 캡처 메타데이터와 [분리 후 검증](../../docs/SPLIT_VALIDATION.md)을 참고하세요. API fixture 브라우저 테스트는 실측 성능 결과가 아닙니다.
