# 제품 분리 검증 — 2026-10-06

이 기록은 장애·부하 테스트 도구와 비공개 독립 학습 앱으로 **분리한 후 실행한 검사**입니다. 이전 통합 프로젝트의 59/81개 웹 검사나 학습 예제 성과를 현재 IncidentLens 성과로 재사용하지 않습니다.

## 보존과 분리 순서

시작 시 `feat/equal-language-ui`의 로컬·원격 SHA는 `2fb23d8226259d0e5902b9e1c70c038f1d455842`로 일치했고 미커밋 변경이나 진행 중 push는 없었습니다. 새 `feat/split-backend-learning` 브랜치는 해당 최신 파일에서 시작했습니다. 소스 tar·전체 refs Git bundle·해시 manifest를 ignored `artifacts/product-split-20261006T051059Z/`에 저장했습니다. `.env`·DB·개인 기록·실행 로그·캐시를 새 커밋에 포함하지 않습니다.

기존 GitHub 인증의 계정 NIGHTPURI를 확인했습니다. 존재하지 않던 `NIGHTPURI/backend-learning`을 처음부터 PRIVATE로 생성하고 다시 visibility를 확인한 뒤 독립 소스 스냅샷을 main에 업로드했습니다. 원격 SHA `4038e5d47e54a19803231489a3b6bf3e611d61fe`를 별도 체크아웃해 원래 경로나 백엔드 없이 build·단위 검사 34개를 통과시킨 **뒤에만** 공개 저장소의 일반 학습 소스를 제거했습니다. 기존 공개 Git 기록은 재작성하지 않았습니다.

## IncidentLens 검사

| 분리 후 실행 | 결과 |
|---|---|
| TypeScript·Vite production build | 통과 |
| Vitest | 6개 파일·41개 통과 |
| Playwright Chromium | 데스크톱 1440×900·노트북 1280×720·모바일 iPhone 13, 48개 통과 |
| Java 21 build·단위/HTTP 검사 재실행 | 85개 통과, 실패·오류·생략 0 |
| MySQL·Redis·Kafka integrationTest 재실행 | 19개 통과, 실패·오류·생략 0; 기존 기록의 V2 마이그레이션 포함 |
| Bash 문법·Compose core/observability/loadtest 구성 | 통과 |
| 별도 core 스택 | 7개 서비스 healthy; 기존 개발 스택과 별도 프로젝트·볼륨·loopback 포트 |
| 실제 k6 비교 | CACHE_DEGRADATION·2 VUs·단계별 5초·회복 대기 2초; 저장 결과 COMPLETE |
| 실제 브라우저 저장 기록·새로고침 재조회 | 근거·저장 RCA·비교 표시, 세션 복원, API 쓰기 0·예외 0 |
| 실제 근거·RCA·구성·측정 구간 재조회 | 근거 90개, rule-based RCA, BEFORE 252요청·AFTER 280요청과 실행 구성·시간 저장 확인 |
| 한영 README 화면 | 실제 최신 6장, 각 1440×1000·라이트·해당 문서 언어. GET 전용 캡처·API 쓰기 0·브라우저 예외 0 |

백엔드 소스는 이번 분리에서 변경하지 않았으며 동일 소스를 가진 격리 빌드 이미지에서 build/test를 새로 실행했습니다. 첫 통합 실행은 MySQL 근거 삽입 중 TCP 연결 시간 초과로 1개 실패했습니다. 새로운 테스트 컨테이너에서 전체 integrationTest를 다시 실행해 19개가 통과했습니다. 최초 실패·재시도 로그를 그대로 보관하며 실패를 없었던 것으로 취급하지 않습니다.

웹 회귀는 홈·메뉴 목적, 네 시나리오의 명시적 제어, 근거·비교 세션 선택, 비동기 응답의 오래된 알림 차단, 기존 실험 직접 URL/context·history·새로고침, embed, 기존 학습 키 보존, OS 키의 추가적 복사, 한영·라이트/다크·시스템 값 일회성 변환·키보드·색 대비·모바일을 확인합니다. 잘못된 runtime 응답은 미연결로 처리하도록 보완했습니다. API fixture 검사는 실제 성능 측정이 아닙니다.

실제 비교는 `incidentlens-split-check`에서 web 19300·control 19380·demo-api 19381·worker 19382를 사용했습니다. 화면 캡처는 기존 개발 API를 읽는 별도 GET 전용 프리뷰이며 캡처용 세션·부하·결과를 만들지 않았습니다. 새 비교 기록은 별도 테스트 DB에 보존합니다. 두 스택 모두 테스트 후 활성 장애가 없음을 확인합니다.

## 비공개 학습 앱 검사

독립 소스의 production build·Vitest 34개·Playwright 36개가 통과했습니다. 네 언어의 15단계, 공통 목차/본문, 대응 기술 수업 복귀, 기존 저장 키·단계 ID 마이그레이션, 진도·메모·답안/자기 확인, OS·한영·테마·키보드·모바일·직접 URL·embed를 검사했습니다. 실험 API 요청은 없고 실제 장애 연결은 미연결입니다. 독립 폴더만 마운트한 Java 기본/HTTP/심화·Spring/JPA, Python, JavaScript/TypeScript, C# 예제 빌드·단위/실제 HTTP·회복·SQLite 마이그레이션도 통과했습니다. 이 결과는 IncidentLens 백엔드 성과에 합산하지 않습니다.

학습 저장소의 원격 공개 범위와 독립 빌드를 확인했고 초대 계정만 접근합니다. 개인 브라우저 진도 데이터는 업로드하지 않았습니다. 원래 사이트 데이터와 legacy 키는 삭제하지 않지만 주소(origin)가 달라지면 진도는 자동 이전되지 않습니다.

## 한계와 남은 사항

- 기존 npm 잠금 파일의 `source-map-js 1.2.1` 높음 등급 권고 1건은 남아 있습니다. 이번 분리에서 의존성을 강제 갱신하지 않았습니다. [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
- 학습 앱에는 큰 단일 번들 경고가, 백엔드에는 Gradle deprecation 경고가 남습니다. 저사양 최소사양·다른 PC 동일 조건·진단 정확도·운영 실적은 검증하지 않았습니다.
- 관측 프로필은 구성만 검사했습니다. 이번 검증은 기본 7개 스택이며 관측 5개를 모두 기동한 검사는 아닙니다.
- 임의의 사용자 프로젝트 연동과 원격 주입은 구현하지 않았고 유료 LLM을 호출하지 않았습니다. 대상이 다른 CONTROL_URL은 서버 쓰기 전에 차단됐습니다.
- 원격 CI는 각 저장소의 해당 커밋 GitHub Actions 결과로 확인합니다. 과거 커밋 결과로 새 커밋을 통과 처리하지 않습니다.
- main 병합·공개 배포·강제 push·기존 데이터/볼륨 초기화는 수행하지 않습니다. 공개 저장소의 기본 화면은 main 병합 전까지 바뀌지 않습니다.

## 복구

현재 작업을 버리거나 reset하지 않고 별도 복구 폴더에 스냅샷 tar를 풀거나 Git bundle에서 refs를 복원할 수 있습니다. `git worktree add ../incident-lens-before-split 2fb23d8`로 분리 전 소스를 별도 폴더에 읽을 수도 있습니다. 기존 `.env`·DB·컨테이너·이전 브라우저 데이터는 원래 위치에 남아 있습니다. 새 비공개 저장소 삭제나 공개 이력 재작성은 복구에 필요하지 않습니다.
