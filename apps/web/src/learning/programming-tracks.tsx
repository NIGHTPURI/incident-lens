import type { Locale } from "../i18n/translations";
import type { LearningPlatform } from "./platform";
import LanguageDepthCourse from "./language-depth-course";
import type { LanguageStage } from "./language-depth-data";

type Copy = { ko: string; en: string };
const both = (ko: string, en: string): Copy => ({ ko, en });
export const CODE_LANGUAGE_KEY = "incidentlens.learning.code-language.v1";
export const codeLanguages = [
  { id: "java", name: "Java" },
  { id: "python", name: "Python" },
  { id: "javascript", name: "JavaScript / TypeScript" },
  { id: "csharp", name: "C#" },
] as const;
export type CodeLanguage = typeof codeLanguages[number]["id"];
export function readCodeLanguage(storage: Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>): CodeLanguage {
  try {
    const saved = storage.getItem(CODE_LANGUAGE_KEY);
    if (saved === "go") storage.setItem?.(CODE_LANGUAGE_KEY, "java");
    return codeLanguages.find(item => item.id === saved)?.id ?? "java";
  } catch { return "java"; }
}
export const guideSections = [
  { id: "orient", ko: "언어란 · 언제 쓰나", en: "What it is & when to use it" },
  { id: "setup", ko: "실행 준비", en: "Runtime setup" },
  { id: "basics", ko: "첫 문법", en: "First syntax" },
  { id: "frameworks", ko: "프레임워크 선택", en: "Framework choices" },
  { id: "shared", ko: "공통 백엔드 개념", en: "Shared backend concepts" },
] as const;
type Starter = {
  what: Copy; why: Copy; basics: Copy; basicsCode: string;
  frameworks: Copy; runtime: Copy; windowsCheck: string; linuxCheck: string; windowsSetup: string; linuxSetup: string;
  sources: { label: Copy; url: string }[];
};
export const starters: Record<Exclude<CodeLanguage, "java">, Starter> = {
  python: {
    what: both("Python은 들여쓰기로 코드 블록을 구분하는 프로그래밍 언어입니다. Python 인터프리터가 .py 파일을 읽어 실행합니다.", "Python is a programming language that uses indentation to group statements. Its interpreter runs .py files."),
    why: both("읽기 쉬운 문법으로 자동화, 데이터 처리, 웹 API를 만들 때 자주 선택합니다. 이 선택은 운영체제나 화면 언어와 별개입니다.", "Its readable syntax is useful for automation, data work and web APIs. This choice is independent of your operating system and UI language."),
    runtime: both("공식 Python 설치 안내를 보고 인터프리터를 준비합니다. 가상 환경과 패키지는 뒤의 웹 예제에서 따로 필요합니다. 명령이 없거나 다른 버전을 가리키면 설치 경로를 먼저 확인하세요.", "Use the official Python installer guidance to prepare an interpreter. A virtual environment and packages are separate steps for the web example. If the command is missing or points to another version, check the install path first."),
    windowsCheck: "python.exe --version", linuxCheck: "python3 --version",
    windowsSetup: "python.exe -m venv .venv\n.\\.venv\\Scripts\\python.exe -m pip --version",
    linuxSetup: "python3 -m venv .venv\n.venv/bin/python3 -m pip --version",
    basics: both("price와 quantity는 이름 붙인 값입니다. 함수는 입력을 받아 결과를 돌려줍니다. 예상 출력은 2400입니다. 파일을 읽는 것만으로는 실행되지 않습니다.", "price and quantity are named values. A function accepts input and returns a result. Expected output: 2400. Reading this file does not execute it."),
    basicsCode: "price = 1200\n\ndef total(quantity):\n    return price * quantity\n\nprint(total(2))",
    frameworks: both("FastAPI는 작은 API와 타입 기반 요청·응답 설명에, Django는 관리 화면과 데이터 계층까지 갖춘 웹 프로젝트에 자주 쓰입니다. 둘은 Python 자체가 아니라 선택 가능한 프레임워크입니다.", "FastAPI is one route for an API with typed request and response handling; Django covers a wider web project including admin and data tooling. Both are optional frameworks, not the Python language itself."),
    sources: [
      { label: both("Python 설치", "Install Python"), url: "https://www.python.org/downloads/" },
      { label: both("Python 기초 문서", "Python tutorial"), url: "https://docs.python.org/3/tutorial/" },
      { label: both("FastAPI 첫 단계", "FastAPI first steps"), url: "https://fastapi.tiangolo.com/tutorial/first-steps/" },
      { label: both("Django 첫 앱", "Django first app"), url: "https://docs.djangoproject.com/en/stable/intro/tutorial01/" },
    ],
  },
  javascript: {
    what: both("JavaScript는 프로그래밍 언어이고 Node.js는 브라우저 밖에서 JavaScript를 실행하는 런타임입니다. TypeScript는 타입 검사를 더한 언어이며 일반 JavaScript 실행과 준비 과정이 다릅니다.", "JavaScript is the language; Node.js runs it outside the browser. TypeScript adds type checking and needs its own toolchain, distinct from running plain JavaScript."),
    why: both("화면과 서버에서 가까운 언어 계열을 쓰고 싶을 때 유용합니다. API 처리와 비동기 I/O를 배우되 TypeScript 코드를 Node가 자동으로 그대로 실행한다고 가정하지 않습니다.", "It can share familiar language concepts between browser and server. Learn API handling and asynchronous I/O without assuming that Node automatically runs every TypeScript file."),
    runtime: both("공식 Node.js 안내로 런타임을 준비하고, JavaScript 파일과 TypeScript 타입 검사·변환 도구를 구분하세요. 연습 프로젝트는 examples/language-paths/javascript에 있습니다. 입문은 npm 설치 없이 시작하며 TypeScript 고급 실행은 advanced/javascript에서 npm ci → npm run build → npm run start:ts 순서입니다.", "Prepare Node.js using its official guide. Distinguish a JavaScript file from TypeScript type-checking and build tooling. A dependency-free intro is in examples/language-paths/javascript; compiled TypeScript runs from advanced/javascript with npm ci → npm run build → npm run start:ts."),
    windowsCheck: "node.exe --version", linuxCheck: "node --version",
    windowsSetup: "npm.cmd --version\nnpm.cmd init -y",
    linuxSetup: "npm --version\nnpm init -y",
    basics: both("const는 다시 대입하지 않을 값을 묶습니다. 함수가 quantity를 받아 합계를 돌려줍니다. TypeScript의 : number는 타입 표기이며 아래 코드는 JavaScript입니다. 예상 출력은 2400입니다.", "const binds a value without reassignment. A function accepts quantity and returns the total. TypeScript's : number is a type annotation; this snippet is plain JavaScript. Expected output: 2400."),
    basicsCode: "const price = 1200;\nfunction total(quantity) {\n  return price * quantity;\n}\nconsole.log(total(2));",
    frameworks: both("Express는 라우트와 미들웨어를 직접 조합하는 선택지이고 NestJS는 모듈과 의존성 주입 구조를 제공합니다. Node.js는 런타임, TypeScript는 언어·타입 도구, 두 프레임워크는 서버 구성 도구입니다.", "Express lets you compose routes and middleware directly; NestJS offers modules and dependency injection. Node.js is the runtime, TypeScript a language/type tool, and these are optional server frameworks."),
    sources: [
      { label: both("Node.js 설치", "Install Node.js"), url: "https://nodejs.org/en/download" },
      { label: both("Node.js 소개", "Node.js introduction"), url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs" },
      { label: both("TypeScript 기초", "TypeScript basics"), url: "https://www.typescriptlang.org/docs/handbook/2/basic-types.html" },
      { label: both("Express 첫 서버", "Express hello world"), url: "https://expressjs.com/en/starter/hello-world.html" },
      { label: both("NestJS 첫 단계", "NestJS first steps"), url: "https://docs.nestjs.com/first-steps" },
    ],
  },
  csharp: {
    what: both("C#은 .NET에서 쓰는 프로그래밍 언어입니다. .NET SDK는 빌드와 실행 도구이고 ASP.NET Core는 웹 API 프레임워크입니다.", "C# is a programming language used with .NET. The .NET SDK provides build/run tools; ASP.NET Core is the web API framework."),
    why: both("타입, 클래스, 비동기 작업을 익혀 웹 서비스와 업무용 API를 만들 때 쓰입니다. 언어·SDK·프레임워크를 하나의 설치물로 혼동하지 않습니다.", "Its types, classes and async features support web services and business APIs. Keep the language, SDK and framework as distinct concepts."),
    runtime: both("공식 .NET SDK 설치 안내를 보고 버전을 확인합니다. 웹 예시는 ASP.NET Core 웹 프로젝트가 있어야 하며 연습 프로젝트는 examples/language-paths/csharp에 있습니다.", "Use the official .NET SDK installation guidance and check its version. The web snippet requires an ASP.NET Core web project, supplied in examples/language-paths/csharp."),
    windowsCheck: "dotnet.exe --version", linuxCheck: "dotnet --version",
    windowsSetup: "dotnet.exe new web -n CatalogApi",
    linuxSetup: "dotnet new web -n CatalogApi",
    basics: both("int는 정수 타입, Console.WriteLine은 출력입니다. 수량 2를 곱한 예상 출력은 2400입니다. 콘솔 프로젝트 문맥의 코드입니다.", "int is an integer type and Console.WriteLine prints a value. Expected output for quantity 2: 2400. This belongs in a console project."),
    basicsCode: "int price = 1200;\nint quantity = 2;\nConsole.WriteLine(price * quantity);",
    frameworks: both("ASP.NET Core에서 작은 API는 Minimal API로, 더 큰 분리 구조는 컨트롤러 방식으로 구성할 수 있습니다. 둘은 C# 자체가 아니라 같은 웹 프레임워크의 설계 방식입니다.", "ASP.NET Core can use Minimal APIs for compact routes or controllers for more separated organization. Both are patterns within the web framework, not the C# language itself."),
    sources: [
      { label: both(".NET SDK 설치", "Install .NET SDK"), url: "https://dotnet.microsoft.com/en-us/download" },
      { label: both("C# 소개", "Tour of C#"), url: "https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/" },
      { label: both("Minimal API 튜토리얼", "Minimal API tutorial"), url: "https://learn.microsoft.com/en-us/aspnet/core/tutorials/min-web-api" },
    ],
  },
};

export default function ProgrammingGuide({ language, locale, platform, stage, onStage, onReadCount }: { language: Exclude<CodeLanguage, "java">; locale: Locale; platform: LearningPlatform; stage: LanguageStage; onStage: (stage: LanguageStage) => void; onReadCount: (count: number) => void }) {
  const guide = starters[language];
  const name = codeLanguages.find(item => item.id === language)!.name;
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  return <article className="programming-guide">
    <header className="learning-header"><span className="learning-kicker">{t("언어별 백엔드 학습", "Language backend path")}</span><h1>{name}</h1><p>{t("Java와 같은 15개 학습 목표를 이 언어의 실행 방식으로 배웁니다. 상품·주문 연습 프로젝트에서 시작해 DB·보안·분산 시스템까지 단계적으로 넓힙니다. Java 기록은 이 언어의 완료 기록이 아닙니다.", "Follow the same 15 learning outcomes as Java through this language's own tools. Start with a runnable catalog/order practice project, then extend into DB, security and distributed systems. Java's records do not become this path's completion.")}</p></header>
    <section className="learning-box" aria-label={t("가이드 범위", "Guide scope")}><strong>{t("실행·검증 범위", "Execution and verification scope")}</strong><p>{t("15개 단계마다 개념·흐름·예시·실패 진단·안내와 독립 과제를 제공합니다. 작은 연습 서버의 전체 파일은 examples/language-paths에 있습니다. DB·인증·브로커 등 후반부 조각은 추가 준비가 필요하며 이 화면은 실행을 대신하지 않습니다. 읽기와 자기 확인은 숙련 인증이 아닙니다.", "Each of the 15 stages includes concepts, flow, examples, diagnosis, guided and independent work. Complete files for a small practice server live in examples/language-paths. Later DB, auth and broker fragments need separate setup; this page executes nothing. Reading and self-review are not certification.")}</p></section>
    {stage === "tools" && <><section aria-labelledby="track-orient"><h2 id="track-orient" tabIndex={-1}>{t("언어란 · 언제 쓰나", "What it is & when to use it")}</h2><p>{guide.what[locale]}</p><p>{guide.why[locale]}</p><p>{t("프레임워크는 언어 위에서 웹 요청·응답을 구성하는 도구입니다. 화면 언어는 번역만 바꾸고 학습 언어 선택과 다릅니다.", "A framework organizes web request/response handling on top of a language. The UI language only changes the translation; it is a separate choice.")}</p></section>
    <section aria-labelledby="track-setup"><h2 id="track-setup" tabIndex={-1}>{t("실행 준비", "Runtime setup")}</h2><p>{guide.runtime[locale]}</p><p>{t("설치한 뒤 현재 선택한 운영체제의 터미널에서 버전을 확인하세요. 다음은 새 연습 폴더에서 환경/프로젝트를 준비하는 명령 예시입니다. 이 화면은 설치·명령 실행을 하지 않습니다.", "After installation, check the version in your selected OS terminal. The following shows environment/project setup in a new practice folder. This page installs or runs nothing.")}</p><pre><code>{platform === "windows" ? guide.windowsCheck : guide.linuxCheck}</code></pre><h3>{t("새 연습 폴더의 준비 예시", "New practice-folder setup example")}</h3><pre><code>{platform === "windows" ? guide.windowsSetup : guide.linuxSetup}</code></pre></section>
    <section aria-labelledby="track-basics"><h2 id="track-basics" tabIndex={-1}>{t("첫 문법", "First syntax")}</h2><p>{guide.basics[locale]}</p><pre><code>{guide.basicsCode}</code></pre></section>
    </>}
    <LanguageDepthCourse language={language} locale={locale} platform={platform} stage={stage} onStage={onStage} onReadCount={onReadCount} />
    {stage === "tools" && <>
    <section aria-labelledby="track-frameworks"><h2 id="track-frameworks" tabIndex={-1}>{t("프레임워크 선택", "Framework choices")}</h2><p>{guide.frameworks[locale]}</p><h3>{t("공식 문서", "Official documentation")}</h3><ul>{guide.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label[locale]} ↗</a></li>)}</ul></section>
    <section aria-labelledby="track-shared"><h2 id="track-shared" tabIndex={-1}>{t("공통 백엔드 개념", "Shared backend concepts")}</h2>
      <div className="learning-box"><h3>HTTP</h3><p>{t("브라우저가 GET /products/1 요청을 보냅니다. 경로를 처리하는 함수가 상품을 찾고 JSON을 돌려줍니다. 없는 상품이면 200을 꾸미지 말고 404를 정합니다.", "A browser sends GET /products/1. A route handler finds the product and returns JSON. For a missing product, define a 404 response instead of pretending it succeeded.")}</p></div>
      <div className="learning-box"><h3>{t("데이터 저장", "Data storage")}</h3><p>{t("예시는 고정 가격을 돌려주지만 실제 주문은 DB에서 읽고 저장해야 합니다. 외부 입력은 매개변수로 전달하고, 재고·주문처럼 함께 바뀌는 값은 트랜잭션으로 묶습니다. 여기에는 DB 연결이 없습니다.", "The snippets return a fixed price. A real order reads and writes a database: pass external input as parameters and group related stock/order changes in a transaction. No database is connected here.")}</p></div>
      <div className="learning-box"><h3>{t("인증과 권한", "Identity and authorization")}</h3><p>{t("사용자 확인과 그 사용자가 이 상품·주문에 접근할 권한 확인은 다릅니다. 로그인 세션이나 토큰을 검증한 뒤 소유권을 확인합니다. 예시에는 인증 기능이 없습니다.", "Identifying a user differs from checking that user's access to a product or order. Validate a session or token, then check ownership. No authentication is implemented in these snippets.")}</p></div>
      <p>{t("스스로 확인: 수량을 3으로 바꾼 예상값과 없는 상품의 응답을 설명해 보세요. 입력이나 답은 저장·채점하지 않습니다.", "Try it yourself: predict the result for quantity 3 and explain the response for a missing product. This guide does not save or grade an answer.")}</p>
    </section></>}
  </article>;
}
