# 채용 관점 코드 검토와 개선 선정 기록

## 판단의 범위

목표는 사용자가 제시한 DB Inc AX 등 AI 서비스 개발 및 백엔드 역량의 설명 가능성이다. 해당 회사의 현재 채용 공고/평가 기준은 제공되지 않아 특정 회사의 합격 가능성을 평가하지 않는다. 실제 구현과 검증 결과로 설명할 수 있는 사례를 선정했다.

대화에 읽을 수 있는 첨부가 노출되지 않았고, 작업 공간과 `/tmp`, `/mnt/data`에서 제출 이력서·포트폴리오에 해당하는 PDF/DOCX/PPTX나 관련 이름의 자료를 확보하지 못했다. 원본 자료는 수정하지 않았다.

| 제출본에서 추출할 항목 | 확인 결과 |
| --- | --- |
| 프로젝트명과 저장소 대응 | 제출본 부재로 확인 불가 |
| 본인 역할, 기여 범위, 팀 인원 | 확인 불가. Git 작성자만으로 개인 역할을 추정하지 않음 |
| 사용 기술과 성과 주장, 수치 | 확인 불가. 아래 기술은 코드 관측이며 제출본 인용이 아님 |
| 이력서와 코드의 불일치 | 판단 보류. 코드에서 못 찾은 경험이 없었다고 단정하지 않음 |
| 이번 개선 | 2026-10-02의 별도 후속 코드 변경. 제출 당시 성과로 소급하지 않음 |

GitHub 프로필 README에는 Chat-Moderation과 docinsight-ai 링크가 있었다. 이는 제출 이력서와의 연결 증거가 아니며, 별도의 공개 프로필 정보다.

## 환경과 저장소 확인

루트 `/home/mireu/Dev`는 정상 Git 저장소가 아니었다. 루트/상위 경로에 적용할 AGENTS.md는 없었고, `chat-moderation/AGENTS.md`와 `YoungManRest_BE/AGENTS.md`를 읽었다. 후자는 Java 21/Spring, 비밀값 보존, 최소 변경 등 지침과 함께 **읽기 전용** 참고 대상으로 처리했다. `incident-lens`에는 AGENTS.md가 없었고 `.agents`, `.codex` 디렉터리는 비어 있었다.

| 로컬 경로 | 원격 | 시작 브랜치와 HEAD | 상태/처리 |
| --- | --- | --- | --- |
| `nice` | `NIGHTPURI/incident-lens` | `main`, `77bcb483e8aa419703b990dcfb95b02bb8af059f` | 깨끗함. 원본 유지, 별도 worktree 생성 |
| `chat-moderation` | `NIGHTPURI/Chat-Moderation` | `main`, `835f77dd3b52c118c3877487973760e74e823fbc` | 깨끗함. 읽기 및 기존 테스트만 |
| `job-skill-radar` | `NIGHTPURI/job-skill-radar` | `refactor/v2`, `9bd63dc30743ee4372974b2dfd024d1d3b8f30bc` | 깨끗함. 읽기 및 기존 테스트만 |
| `YoungManRest_BE` | `YoungManResting/YoungManRest_BE` | `dev`, `8836d8fada99ff5d88ef27ec7caf1d979df4649a` | 팀 저장소. 다수 수정/미추적 파일 보존, 테스트/변경/커밋 없음 |
| `9mssafy/who_are_you_22_codex_pack` | `NIGHTPURI/whoareyou` | `main`, `c209c917c2a2e0d8fb0a6b430e722df28153aab9` | 깨끗함. 저장소 상태만 확인; 소유 형태/코드 품질 미판정 |

시작 시 tracked/untracked(ignored 제외) 파일 SHA-256과 Git 상태를 별도 로컬 JSON에 기록했다. 검증 후 원래 5개 저장소의 파일 내용·HEAD·미커밋 상태가 같음을 확인했다. 원본 `.env`는 열거나 새 작업 공간으로 복사하지 않았다. 워크트리: `/home/mireu/Dev/incident-lens-career-20261002`, 브랜치: `improve/rca-response-budget`.

GitHub connector의 `user:NIGHTPURI` 검색은 12개 저장소를 반환했다. 공개 목록은 `Chat-Moderation`, `Practice`, `mpa_practice`, `first_repo`, `job-skill-radar`, `JSP`, `CodeTree`, `NIGHTPURI`, `TruthLens-AI`, `incident-lens`, `docinsight-ai`였다. 비공개 1개는 메타데이터만 확인했고 본 공개 문서에 이름/내용을 옮기지 않았다. 검색에서 접근 가능한 범위이며 모든 조직/비공개 저장소를 망라한다는 보장은 없다. 전체 메타데이터는 사용자 로컬 감사 폴더에만 보관했다. 나머지 공개 저장소의 코드까지 검토했다고 주장하지 않는다.

| 실제 원격 코드 확인 | 브랜치/커밋 | 로컬과 관계 |
| --- | --- | --- |
| [incident-lens](https://github.com/NIGHTPURI/incident-lens/tree/77bcb483e8aa419703b990dcfb95b02bb8af059f) | `main`, `77bcb483e8aa419703b990dcfb95b02bb8af059f` | 시작 로컬 HEAD와 일치. 이 버전에서 구현 |
| [docinsight-ai](https://github.com/NIGHTPURI/docinsight-ai/tree/44fac15e4f5de8f4aa25aa2ebb912282b183d5fa) | `main`, `44fac15e4f5de8f4aa25aa2ebb912282b183d5fa` | 로컬 체크아웃 없음. API로 트리·핵심 소스/설정/의존성 확인 |
| [Chat-Moderation](https://github.com/NIGHTPURI/Chat-Moderation/tree/59c76c4d73656577e7b4f1b807cd956c31beae81) | `main`, `59c76c4d73656577e7b4f1b807cd956c31beae81` | 로컬보다 다른 HEAD. 후보 문제의 원격 provider 소스도 직접 확인. 테스트는 위 로컬 HEAD 기준 |
| [job-skill-radar](https://github.com/NIGHTPURI/job-skill-radar/tree/3bb613cb58fa9e8a25557daddba968d740a3bf7d) | `refactor/v2`, `3bb613cb58fa9e8a25557daddba968d740a3bf7d` | 로컬과 다른 HEAD. 후보의 원격 Work24 client도 확인. 원격 main은 `0ee3c40f393044785e33c6f66ee628f85a25c499`(코드 전체 미검토) |

네트워크 shell의 DNS 조회는 실패했지만 기존 GitHub 읽기 connector가 동작했다. 추가 계정 연결/권한 변경이나 원격 쓰기를 하지 않았다. incident-lens는 개인 namespace와 접근 가능한 이력의 단일 작성자(NIGHTPURI 10 commits)를 확인해 수정 대상으로 골랐다. 이것이 단독 수작업 개발의 증거는 아니다. 기존 `AI_ENGINEERING.md`에도 AI 보조 개발과 인간 검토 미완료가 명시되어 있다.

## 코드와 실행에 근거한 진단

### incident-lens

- **사용자 흐름/책임 분리:** `IncidentController` → `IncidentService` → `EvidenceCollector`, `RcaService`로 세션·증거·보고서를 처리한다. `Models`의 입력 검증, `ApiErrors`의 오류 변환, provider 로컬 스키마·인용 검증이 존재한다. README만으로 판단하지 않고 이 흐름과 테스트를 확인했다.
- **AI 처리:** `RcaService.generate`는 AFTER를 제외하고 서비스/증거 유형별 최신값을 선택한다. `OpenAiCompatibleRcaProvider.analyze`는 기존 100,000자 증거 JSON 제한과 비신뢰 데이터라는 system prompt, 응답 JSON 타입 검사, 종료 상태 검사를 갖췄다. `RcaValidator.validate`는 알려진 ID, 트래픽, 인용된 증상을 검증한다. 문장의 인과관계·진실성까지 증명하지 못한다.
- **실제 결함(이번 수정):** 전체 문자열 수신 뒤 크기 검사여서 메모리 누적 상한이 없었다. 오류 상태도 본문 완료를 기다렸다. 개선 범위/실행 결과는 [응답 예산 기록](RCA_RESPONSE_BUDGET.md)에 있다.
- **데이터 정합성:** `OrderService.create`는 주문과 outbox를 같은 트랜잭션에 저장하며 키 재사용 시 상품/수량 불일치를 거절한다. `OutboxRelay.publishBatch`는 Kafka acknowledgement 후 완료 처리하므로 중복 발행 가능성이 있고 `FulfillmentService.fulfill`의 unique/upsert·fingerprint 검증이 중복 효과를 막는다. 이번에는 실 MySQL/Kafka 테스트를 재실행하지 않았으므로 분산 동시성의 실검증 완료로 말하지 않는다.
- **보안/운영/재현성:** `JsonBodyLimitFilter`의 요청 크기 제한, parameterized JDBC, 폴백 counter, evidence 출처/수집 누락 표현이 있다. Gradle wrapper와 Node lockfile, 기존 integration tests가 있다. README에 인증·tenant 경계 없는 로컬 실험실임이 명시되어 있어 공개 운영 서비스로 포장하지 않는다. 기존 `docs/results/`의 부하 수치를 이번 측정으로 다시 쓰지 않는다.
- **남는 유지보수/검증 과제:** 응답 제한은 제공자 과금 제한이 아니고 실제 의미 품질 평가셋이 추가로 필요하다. `EvidenceCollector.list`의 최근 500건 제한 후 BEFORE 필터링은 많은 AFTER 수집 시 이전 증거가 선택에서 빠질 가능성이 있다. 이 별도 경계는 이번에 재현하지 않았고 후속 후보로만 남긴다.

### docinsight-ai

- [문서 router](https://github.com/NIGHTPURI/docinsight-ai/blob/44fac15e4f5de8f4aa25aa2ebb912282b183d5fa/app/routers/documents.py)의 업로드 → 추출 → DB 저장, 요약 재사용, Q&A 저장/이력 조회와 [repository](https://github.com/NIGHTPURI/docinsight-ai/blob/44fac15e4f5de8f4aa25aa2ebb912282b183d5fa/app/repositories/document_repository.py)의 SQLAlchemy commit 경계를 확인했다. Python/FastAPI, PyMuPDF, SQLite, 외부 LLM을 연결한 서비스다.
- [AI service](https://github.com/NIGHTPURI/docinsight-ai/blob/44fac15e4f5de8f4aa25aa2ebb912282b183d5fa/app/services/ai_service.py)의 `_limit_text`는 앞 12,000자만 사용한다. prompt는 문서에 없는 답을 추측하지 말라고 하지만 근거 ID/페이지 검사나 평가셋은 없고, 답변 영역의 입력 범위 메타데이터가 없다. 이는 현재 설계의 한계이며 RAG를 구현했다고 볼 수 없다. README는 이 제한을 사실대로 기재한다.
- **실제 입력 경계 문제:** [pdf service](https://github.com/NIGHTPURI/docinsight-ai/blob/44fac15e4f5de8f4aa25aa2ebb912282b183d5fa/app/services/pdf_service.py)의 `save_pdf_file`은 `await file.read()` 전체 읽기이며 파일 크기 제한이 없다. [AskRequest](https://github.com/NIGHTPURI/docinsight-ai/blob/44fac15e4f5de8f4aa25aa2ebb912282b183d5fa/app/schemas.py)는 질문 길이/공백 제약이 없다. 빈 모델 응답/거절/제공자 장애를 API 계약으로 바꾸는 서비스 예외 처리가 확인되지 않았다.
- 설정은 키를 필수로 로드하고 client를 import 시 생성한다. requirements는 버전 고정되어 있으나 읽은 트리에 자동 테스트 파일이 없고 실행은 하지 않았다. 원격의 `docinsight.db`는 목록에서만 확인하고 읽거나 수정하지 않았다. 이 한계가 실제 품질·운영 경험 부재를 의미하지는 않는다.

### Chat-Moderation

- `DefaultSemanticChatModerationService.moderate`의 규칙 → gate → 개인정보 sanitization → provider → 실패 정책 흐름과 `OpenAiLunaModerationProvider`의 128 output tokens/timeout/응답 상태 처리, Aho-Corasick matcher, calibration/holdout 테스트 구조를 확인했다. 453개 기존 로컬 테스트가 통과했다. 실모델 지표/외부 holdout 성능을 이번에 새로 측정하지 않았다.
- [원격 provider의 `parseResponse`](https://github.com/NIGHTPURI/Chat-Moderation/blob/59c76c4d73656577e7b4f1b807cd956c31beae81/src/main/java/dev/chatmoderation/semantic/openai/OpenAiLunaModerationProvider.java)는 confidence에 `asDouble`을 사용하고 ALLOW에서 reason 필드 부재를 허용한다. 요청 JSON schema의 필수/타입 제약과 로컬 방어 검증이 완전히 같지 않다. 제공자 계약을 더 엄격히 확인하는 후보이며, 실제 실모델 오판 사례를 재현했다는 뜻은 아니다.

### job-skill-radar

- `discover_from_profile`의 요청 횟수 제한, 부분 실패 분류, 기존 성공 원문 보존, `save_discovery_batch` 저장 흐름과 `_read_response`/XML 파서를 확인했다. LLM이 아니라 규칙 기반 추출/분류 중심의 Python/SQLite/Streamlit 도구다. 합성 fixture 평가를 실공고 정확도로 해석하면 안 된다.
- [원격 `_read_response`](https://github.com/NIGHTPURI/job-skill-radar/blob/3bb613cb58fa9e8a25557daddba968d740a3bf7d/src/jobskillradar/work24_client.py)는 30초 제한과 안전한 오류 분류가 있지만 `response.read()` 크기 상한이 없다. 요청 수 예산과 응답 크기 예산은 별개의 문제다.
- 시스템 Python은 Streamlit이 없어 loader 오류 4개가 났다(441 항목). 기존 `.venv/bin/python -B -m unittest discover -s tests`로 수정 없이 재실행해 456/456 통과했다. 원래 코드 결함이나 이번 변경의 회귀로 보지 않는다. 실제 Work24 API는 호출하지 않았다.

### 팀 프로젝트 참고

`YoungManRest_BE`의 로컬 미커밋 `AiCommunityService.sendMessage`와 `AiCommunityMessagePersistenceService.persist`에서 메시지 검증/중복 처리/검사 후 저장/commit 이후 broadcast 분리를 확인했다. 팀 전체 서비스와 그 미커밋 코드가 사용자 개인의 완료 성과라는 증거는 없다. 개인 library와 팀 backend의 연동 관계만 참고했고 수정/커밋/테스트 대상에서 제외했다.

## 비교한 개선 과제 (최대 5개)

아래 평가는 코드를 본 뒤 내린 선택 판단이며 점수나 측정된 취업 효과가 아니다.

| 우선순위/과제 | 직무 관련성·문제 중요도·사용 흐름 영향 | 검증 가능성 | 위험·작업량·설명 가능성 |
| --- | --- | --- | --- |
| **1. incident-lens AI 응답 예산/폴백** | AI 외부 연동 + Java backend 자원 보호. 큰 응답이 장애 분석 자체를 방해할 수 있음 | 상한/실패/저장·조회까지 결정적 테스트 가능, 최신 원격과 로컬 일치 | 좁은 provider 경계, 기존 폴백 재사용, 새 의존성 없음. 원인과 대안이 명확. **선정** |
| 2. docinsight-ai 입력 범위 표시·AI 실패 계약/회귀 테스트 | 문서 기반 답변 신뢰성과 사용자 오류 안내에 직접 연결 | 모의 모델·PDF fixture로 가능. 의미 정확도는 별도 평가 필요 | 테스트 기반이 없어 DB/설정/client 초기화부터 정리 필요. 입력 범위 API/UI 계약 변경도 필요 |
| 3. docinsight-ai 업로드 크기·추출 실패 경계 | PDF 처리의 자원 보호, 실패 데이터 정리 | 제한값·비PDF·빈 추출·DB 실패 재현 가능 | 파일과 DB 일관성 범위가 넓고 로컬 의존성 미준비. 후속 과제로 적합 |
| 4. Chat-Moderation provider 로컬 스키마 검증 강화 | 외부 AI의 잘못된 타입/필수 필드에 대한 방어 | 가짜 transport/JSON fixture로 가능, 기존 테스트 풍부 | 작은 변경이지만 서비스 저장/조회까지 보여주는 사례보다는 library 계약 중심 |
| 5. job-skill-radar XML 응답 바이트 제한 | 외부 API 안전성·운영 재현성 | 기존 urllib mock/가상환경 활용 가능 | 낮은 위험/작업량. 생성형 AI 연동 관련성은 낮음 |

선정 이유는 기술 개수보다 **원격 최신 코드의 실제 문제, 한 저장소 내 작은 수정, 기존 동작 보호, API와 저장 결과까지 검증 가능**하다는 점이다. RAG/Agent/Redis/Kafka/Kubernetes 등을 새로 도입할 근거가 없었다. incident-lens에 이미 존재하는 인프라를 추가 채용 강점처럼 세지 않았다.

완료 목표·구현·대안·전후 차이·표준 실행 명령·면접용 설명은 [RCA_RESPONSE_BUDGET.md](RCA_RESPONSE_BUDGET.md)에 모았다. 새 코드와 문서만 로컬 커밋하며, 원격 push/PR/배포는 하지 않는다.

## 복귀 후 확인과 되돌리기

```bash
cd /home/mireu/Dev/incident-lens-career-20261002
git status --short --branch
git log --oneline 77bcb483e8aa419703b990dcfb95b02bb8af059f..HEAD
git diff --stat 77bcb483e8aa419703b990dcfb95b02bb8af059f..HEAD
```

원본 `nice/main`과 팀의 미커밋 작업은 그대로다. 기존 작업을 계속하려면 원본 디렉터리로 돌아가면 된다. 이번 변경을 취소할 필요가 있으면 새 worktree가 깨끗한지 확인하고 **이번 두 로컬 커밋의 정확한 ID만 최신 것부터 `git revert <문서 커밋> <구현 커밋>`** 한다. 결과는 이력 보존형 취소 커밋이며 reset/clean/원본 삭제가 필요 없다. 이후 다른 작업이 추가되어 있다면 HEAD 범위를 무작정 취소하지 말고 이번 ID만 지정한다. 정확한 커밋 ID는 최종 작업 보고와 위 log에서 확인한다.

본인이 면접에서 사용할 후속 설명은 “AI 보조로 외부 응답 제한 문제를 재현하고 수신 중 제한·취소·기존 대체 흐름을 보강했으며, 모의 외부 연동과 H2로 검증했다”까지다. 직접 코드를 읽고 명령을 실행한 뒤 자기 말로 설명한다. 모델 품질 향상, 실사용자 수, 운영 장애 감소, 비용 절감은 측정하지 않았으므로 추가하지 않는다.
