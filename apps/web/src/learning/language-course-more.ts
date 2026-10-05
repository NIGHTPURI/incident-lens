import type { Chapter, Copy, PhaseId } from "./language-course";
const b = (ko: string, en: string): Copy => ({ ko, en });
const ch = (intro: Copy, flow: Copy, code: string, codeScope: Copy, failure: Copy, guided: Copy, independent: Copy, source: string): Chapter =>
  ({ intro, flow, code, codeScope, failure, guided, independent, source });
export const moreCourses: { csharp: Record<PhaseId, Chapter> } = {
  csharp: {
    api: ch(
      b("C#의 ASP.NET Core Minimal API는 경로와 함수를 연결합니다. .NET SDK, C# 언어, ASP.NET Core 웹 프레임워크를 구분하세요.", "ASP.NET Core Minimal API maps routes to functions. Distinguish .NET SDK, C# language and ASP.NET Core framework."),
      b("GET /products/1 → MapGet handler → ID 타입 변환 → 서비스/상품 조회 → Results.Ok/NotFound. 잘못된 요청과 없는 자원을 구분합니다.", "GET /products/1 → MapGet handler → typed ID → service/product lookup → Results.Ok/NotFound. Separate invalid input from missing resource."),
      "var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.MapGet(\"/products/{id:int}\", (int id) =>\n  id == 1 ? Results.Ok(new { Id = 1, Price = 1200 })\n          : Results.NotFound());\napp.Run();",
      b("ASP.NET Core 웹 프로젝트 Program.cs의 초점 코드입니다. 고정 상품이며 DB/인증 없이 여기서 실행하지 않았습니다.", "Focused Program.cs for an ASP.NET Core web project. It uses a fixed product, with no DB/auth, and was not run here."),
      b("404 경로 미일치와 상품 부재를 구분하고 500이면 DI/서비스 오류를 봅니다. 바인딩 규칙을 API 계약과 맞춥니다.", "Separate route mismatch from missing product for 404, and inspect DI/service errors for 500. Align binding with API contract."),
      b("ID 1/2/문자의 예상 상태를 경로 제약과 비교하세요.", "Compare predicted statuses for ID 1/2/text with route constraint."),
      b("POST /orders 요청 모델과 수량 규칙을 설계하고 접수 응답을 후속 완료와 구분하세요.", "Design POST /orders request model and quantity rule; separate accepted from later fulfillment."),
      "https://learn.microsoft.com/en-us/aspnet/core/tutorials/min-web-api"),
    db: ch(
      b("EF Core는 C# 객체를 관계형 DB에 매핑하지만 DB 제약과 실제 SQL 검토를 대신하지 않습니다. 주문·outbox를 한 SaveChanges/트랜잭션 경계에 둡니다.", "EF Core maps C# objects to a relational DB but does not replace constraints or SQL review. Keep order/outbox in one SaveChanges/transaction boundary."),
      b("HTTP 입력 → DbContext에서 상품 조회 → 주문·outbox 추가 → SaveChangesAsync → 결과. 별도 외부 발행은 커밋 뒤 relay가 맡습니다.", "HTTP input → query product with DbContext → add order/outbox → SaveChangesAsync → result. A relay publishes externally after commit."),
      "db.Orders.Add(new Order { Id = orderId, ProductId = productId });\ndb.Outbox.Add(new OutboxEvent { OrderId = orderId });\nawait db.SaveChangesAsync(cancellationToken);",
      b("EF Core 모델·DbContext·provider/schema가 정의됐다는 전제의 초점 코드입니다. 실제 DB/마이그레이션 없이 실행되지 않았습니다.", "Focused code assuming EF Core models, DbContext, provider and schema. It was not run against a DB/migration."),
      b("예외가 나면 두 행이 모두 없는지 확인하고 unique index·SQL·provider를 봅니다. SaveChanges 여러 번을 한 트랜잭션이라고 가정하지 않습니다.", "On exception confirm neither row persists and inspect unique index/SQL/provider. Do not assume separate SaveChanges calls form one transaction."),
      b("상품 없음과 outbox 쓰기 실패에 남아야 하는 행을 표로 쓰세요.", "Tabulate persisted rows for missing product and failed outbox write."),
      b("중복 주문 키 unique index와 동시 요청에서 결과를 200/201/409로 나누는 규칙을 설계하세요.", "Design a unique order-key index and 200/201/409 outcomes for concurrent requests."),
      "https://learn.microsoft.com/en-us/ef/core/saving/transactions"),
    auth: ch(
      b("ASP.NET Core 인증은 신원을 설정하고 권한 검사는 특정 주문 접근을 판단합니다. RequireAuthorization을 붙여도 리소스 소유권 검사는 별개입니다.", "ASP.NET Core authentication identifies the caller; authorization decides access. RequireAuthorization alone does not check order ownership."),
      b("Bearer 토큰 → JWT handler가 issuer/audience/서명/만료 검증 → 사용자 claim → order.ownerId 비교 → 401/403/200.", "Bearer token → JWT handler validates issuer/audience/signature/expiry → user claim → compare order.ownerId → 401/403/200."),
      "builder.Services.AddAuthentication().AddJwtBearer();\nbuilder.Services.AddAuthorization();\n// configure trusted issuer/audience/key outside this sketch\napp.MapGet(\"/orders/{id}\", handler).RequireAuthorization();",
      b("필수 신뢰 설정, middleware 순서, handler 소유권 검사를 생략한 설계 조각입니다. 안전하게 실행 가능한 인증 프로젝트가 아닙니다.", "Design sketch omitting trusted settings, middleware ordering and handler ownership check. Not a safe runnable authentication project."),
      b("401 무효 신원과 403 소유권 거부를 구분합니다. 설정되지 않은 issuer/key 또는 누락된 ownership 검사로 보호를 주장하지 않습니다.", "Separate 401 invalid identity from 403 denied ownership. Do not claim protection without configured issuer/key and ownership check."),
      b("자신/타인/만료 토큰에서 사용자 claim과 주문 소유자를 어떻게 비교할지 적으세요.", "Describe claim-versus-order-owner checks for own, other and expired token."),
      b("주문 ID 변경만으로 타인의 결과를 읽지 못하는 정책·DB 조회·테스트를 설계하세요.", "Design policy, owner-scoped lookup and tests blocking another user's order via ID changes."),
      "https://learn.microsoft.com/en-us/aspnet/core/security/authentication/"),
    tests: ch(
      b("xUnit 같은 테스트 도구로 순수 규칙을 검사하고 WebApplicationFactory로 HTTP 변환을, 별도 DB 경계 테스트로 트랜잭션을 봅니다.", "Use xUnit-like tooling for pure rules, WebApplicationFactory for HTTP mapping and separate DB boundary tests for transactions."),
      b("격리 앱 factory → HttpClient 요청 → status/body 확인 → 격리 DB에서 order/outbox 불변식 확인.", "Isolated app factory → HttpClient request → assert status/body → check order/outbox invariants in isolated DB."),
      "var response = await client.GetAsync(\"/products/999\");\nAssert.Equal(HttpStatusCode.NotFound, response.StatusCode);",
      b("테스트 client, xUnit, WebApplicationFactory와 프로젝트 참조가 필요합니다. 이 저장소에서 컴파일/실행한 C# 테스트가 아닙니다.", "Needs test client, xUnit, WebApplicationFactory and project references. No C# test was compiled/run in this repository."),
      b("InMemory provider 통과를 실제 관계형 제약 검증으로 해석하지 않습니다. HTTP/DB 테스트가 어떤 경계를 썼는지 기록합니다.", "Do not treat an InMemory provider pass as relational-constraint verification. Record which boundary each HTTP/DB test exercises."),
      b("정상·없는 상품의 응답과 수량 오류 계약을 적으세요.", "Write response contracts for existing/missing product and invalid quantity."),
      b("중복 키 동시 주문과 DB rollback을 검증할 관계형 테스트/행 수 기준을 설계하세요.", "Design relational tests and row-count criteria for concurrent duplicate keys and DB rollback."),
      "https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests"),
    deployment: ch(
      b(".NET 앱은 publish 산출물과 target runtime, 환경·비밀, DB migration, health/readiness, 로그·롤백을 관리해야 합니다.", ".NET deployment needs publish artifact/target runtime, env/secrets, DB migration, health/readiness, logs and rollback."),
      b("dotnet publish → 산출물/설정 배치 → schema 적용 → 프로세스 시작/readiness → 트래픽 → 오류·지연 감시 → 롤백.", "dotnet publish → place artifact/config → migrate schema → process/readiness → traffic → watch errors/latency → rollback."),
      "dotnet publish -c Release\n# Windows PowerShell and Linux Bash; target runtime/hosting still need configuration",
      b("프로젝트가 있을 때 Windows/Linux 모두 사용할 수 있는 명령 형태입니다. 여기에는 C# 프로젝트가 없고 실행하지 않았습니다.", "Command shape for a project on Windows PowerShell or Linux Bash. No C# project exists here; not run."),
      b("시작 실패는 runtime/환경/포트, 502는 호스트↔프로세스, DB 오류는 migration과 연결 문자열을 확인합니다.", "For startup inspect runtime/env/port; for 502 host↔process; for DB errors migrations and connection string."),
      b("readiness가 DB 접근을 확인하더라도 개별 주문 성공을 보장하지 못하는 이유를 적으세요.", "Explain why DB readiness does not guarantee individual order success."),
      b("구/신 버전이 함께 실행되는 동안의 schema 확장·축소와 rollback 순서를 설계하세요.", "Design expand/contract schema rollout and rollback while old and new versions overlap."),
      "https://learn.microsoft.com/en-us/dotnet/core/deploying/"),
  },
};
