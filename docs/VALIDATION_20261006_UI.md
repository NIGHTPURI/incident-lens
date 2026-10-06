# 2026-10-06 승인 UI·PC 실행 설정 검증

이번 기록은 네 언어 공통 학습 UI, 통합 랜딩, 라이트/다크 전환, PC 실행 준비안, 로컬 대상 검사와 한국어 기본 README에 대한 최종 검증입니다. 과거 검증 기록을 대체하거나 당시 실측을 이번 결과로 재사용하지 않습니다.

| 검사 | 결과 |
|---|---|
| TypeScript + Vite production build | 통과 |
| Vitest 전체 | 11개 파일, 59개 테스트 통과 |
| Playwright 전체 | 1440×900·1280×720·iPhone 13, 81개 테스트 통과 |
| Java 전체 build / 단위 테스트 | 85개 테스트 통과, 실패·오류·생략 0 |
| MySQL·Redis·Kafka integrationTest | 18개 테스트 통과, 실패·오류·생략 0 |
| V1 기록이 있는 DB의 V2 업그레이드 | H2 단위 테스트와 별도 MySQL 통합 테스트 각 1개 통과; 기존 세션·보고서·측정 값 보존, 새 열은 NULL |
| 격리 Java 학습 예제 | 소스 실행 7건, 실제 HTTP 8건, 고급 단계 11개 프로그램, Spring API/JPA 테스트 7개 통과 |
| Python 학습 예제 | 입문·고급 단위 테스트, 실제 HTTP·인증·중복·병렬 요청·프로세스 복구 통과 |
| JavaScript/TypeScript 학습 예제 | 입문, 타입 검사·컴파일·단위 테스트, 두 런타임의 실제 HTTP·복구 통과 |
| C# 학습 예제 | .NET 8 build/locked restore, 실제 HTTP·프로세스 복구 포함 5개 테스트 통과 |
| 공통 SQLite migration/rollback | 각 언어 검증 환경에서 2개 테스트 통과 |
| 실행 스크립트 | 모든 Bash 문법·PowerShell AST 검사, PowerShell 대상 검사 5개와 비교/실패 정리 프로토콜 통과 |
| 실제 로컬 대상 검사 | Bash 및 Windows PowerShell에서 같은 별도 스택·호스트 포트·인스턴스 확인, 잘못된 CONTROL_URL은 서버 변경 전에 차단 |
| 학습만 실행 | 실제 Vite learning 모드 화면 HTTP 200, 실험 API GET/POST HTTP 503; 백엔드 프록시 차단 |
| Compose | 기본·관측·loadtest 설정 검사와 별도 기본 7개 서비스 health 통과 |
| README·캡처 | 한국어 기본 본문, 한영 전환 링크, README.ko.md 호환, 언어별 최신 3장씩의 실제 화면·경로·크기·SHA-256 확인 |

DB 업그레이드 테스트의 H2 1건은 위 단위 테스트 85건에 포함됩니다. 별도 MySQL 업그레이드 1건은 기존 통합 테스트 18건 외에 추가로 실행했습니다. 기본 Docker API 설정으로도 MySQL 업그레이드 검사를 재실행해 통과했습니다.

브라우저 검증은 언어 선택 시 소개 유지, 시작/이어서/목차 진입, 언어별 마지막 위치·읽기·메모·자기 확인·답안 저장, 네 언어 왕복/새로고침, legacy ID와 기록의 추가적 마이그레이션, 같은 언어의 관련 기술 수업, 로고 랜딩/별도 학습 홈, 직접 URL·history·embed, 한영·Windows/Linux·테마 독립성, 시스템 테마의 일회성 변환, 모바일 목차·키보드·명암 대비, 활성 장애 복귀와 명시적 제어를 포함합니다. API fixture를 사용하는 브라우저 결과는 실제 성능 실측으로 간주하지 않습니다.

## 별도 실험실의 실제 비교 실행

기존 개발 스택과 다른 `incidentlens-final-check` 프로젝트와 새 볼륨을 사용했습니다. 호스트 포트는 web 19000, control-plane 19080, demo-api 19081, demo-worker 19082였고, 내부 포트는 기존 설정을 유지했습니다. 기존 스택을 재생성하거나 기존 DB에 V2를 적용하지 않았습니다.

CACHE_DEGRADATION을 **2 VUs, 단계별 5초, 회복 대기 2초**로 실행했습니다. BEFORE 220건, AFTER 236건의 요청과 90개 근거가 저장됐습니다. 무료 `rule-based` RCA와 비교 결과가 저장되고 독립적인 GET으로 재조회됐으며, 실행 구성·측정 시작/종료 시각·k6 경과 시간을 확인했습니다. 종료 후 활성 장애는 없었습니다. 이 한 PC의 짧은 검증은 저사양 최소사양이나 다른 PC와 같은 조건의 성능을 증명하지 않습니다. 테스트 스택은 검증 후 중지하며 볼륨·기록을 보존합니다.

## 실제 README 화면

[캡처 메타데이터](../apps/web/screenshots/pc-setup-capture.json)에 최신 6장 파일의 해시와 조건을 기록했습니다. Windows Chrome의 실제 화면이며 모두 **1440×1000, 라이트, Java 선택, Windows/PowerShell**입니다. 한국어 문서에는 한국어 화면만, 영어 문서에는 영어 화면만 사용합니다. 캡처는 기존 로컬 백엔드를 연결한 읽기 전용 프리뷰에서 수행했고, 캡처 중 API 쓰기와 브라우저 예외는 0건이었습니다. 화면에 나타난 저장 세션은 실제 테스트 기록이며 새 성능 측정의 증거로 사용하지 않습니다.

## 남은 문제와 한계

- `npm audit`는 기존 잠금 파일의 `source-map-js 1.2.1`에 높음 등급 1건을 보고합니다: [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). 패치 버전은 1.2.2입니다. 이번 승인 범위에 별도 의존성 업데이트를 포함하지 않아 기존 잠금 파일을 유지했습니다.
- Vite는 큰 단일 JavaScript 번들에 대한 크기 경고를, Gradle은 향후 Gradle 9 호환 관련 deprecation 경고를 출력합니다. 빌드·테스트 실패는 아닙니다.
- 관측 도구 프로필은 Compose 설정을 확인했습니다. 이번 최종 실행은 기본 스택이며 Prometheus/Grafana/Loki/Tempo/Collector를 실제 기동한 회귀 검사나 저사양 부하 검증은 아닙니다. 이전 관측 검증은 날짜가 있는 별도 기록입니다.
- 현재 개발 서비스에 대한 배포·기존 DB 마이그레이션·main 병합·공개 서비스 배포는 이번 작업에서 수행하지 않습니다. 기능 브랜치의 README는 main 병합 전까지 저장소 기본 첫 화면을 변경하지 않습니다.
- 원본 실행 로그·테스트 보고서·실험 세션 기록은 로컬 ignored `artifacts/final-verification-20261006/`에 보존하며 커밋에 넣지 않습니다. 원격 CI 결과는 푸시한 커밋의 GitHub Actions에서 별도로 확인합니다.

## English verification note

All 59 frontend unit tests, 81 browser tests across desktop/laptop/mobile, 85 Java unit tests, 18 infrastructure integration tests and the additional MySQL upgrade test passed. The upgrade tests preserve existing V1 session/report/measurement data instead of inventing execution metadata. Isolated Java, Python, JavaScript/TypeScript and C# examples, real HTTP/process recovery, script protocol/target checks and learning-only API blocking also passed.

The isolated core comparison used 2 VUs for 5 seconds per phase: 220 BEFORE and 236 AFTER requests, 90 saved evidence entries, a persisted rule-based RCA, restored execution configuration/time windows, and no active fault after cleanup. This is a local smoke check, not a cross-PC benchmark or verified minimum-spec claim. Existing services/data were preserved; test volumes are retained.

The six README images were freshly rendered in Windows Chrome at the same 1440×1000 light-theme conditions; Korean and English documents use matching-language images only. Existing `source-map-js 1.2.1` has one high-severity audit advisory and was not changed as part of this approved scope. Bundle/deprecation warnings remain. Observability runtime regression and low-spec validation were not performed in this final run; only their Compose configuration was checked. No main merge or public deployment is included.
