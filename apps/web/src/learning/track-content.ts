import { chapters, type Chapter } from './curriculum';
import { depthChapter, languageStages, type LanguageStage } from './language-depth-data';
import { chapterForPlatform, platformPreparation, verificationCommands } from './platform';
import type { LearningPlatform } from './platform';
import { starters, type CodeLanguage } from './programming-tracks';
import { javaStage } from './track-state';
import type { Text } from './content';
const b = (ko: string, en: string): Text => ({ ko, en });
export const introductions = {
  java: { what: b('Java는 JVM에서 실행되는 정적 타입 언어입니다. 컴파일한 클래스와 실행 중인 프로세스를 구분하며, 작은 계산부터 Spring Boot API까지 연결합니다.', 'Java is a statically typed language running on the JVM. Follow compiled classes and running processes from a small calculation to a Spring Boot API.'),
    why: b('서비스의 경계를 타입과 계층으로 표현하고, 트랜잭션·테스트·운영을 함께 다루는 백엔드에 활용합니다.', 'Use types and layers to express service boundaries, alongside transactions, testing and operations.'),
    frameworks: b('Spring Boot로 HTTP 입력과 서비스 규칙을 나눕니다. JDBC·MySQL 예제와 격리된 연습 코드를 읽고, 직접 실행한 결과를 기록합니다.', 'Spring Boot separates HTTP input from service rules. Read JDBC/MySQL examples and isolated practice code, then record your own executions.'),
    windowsCheck: 'java.exe -version\njavac.exe -version', linuxCheck: 'java -version\njavac -version' },
  python: starters.python,
  javascript: starters.javascript,
  csharp: starters.csharp,
};
const contexts: Record<CodeLanguage, Text> = {
  java: b('Spring Boot 상품·주문 API에서 Controller, Service, JDBC 경계를 따라가며 요청 검증과 저장을 연결합니다.', 'Follow Controller, Service and JDBC boundaries in a Spring Boot catalog/order API.'),
  python: b('Python 상품·주문 예제에서 요청을 파싱하고 SQLite 트랜잭션과 소유권 검사로 연결합니다. FastAPI·Django의 선택 기준도 함께 비교합니다.', 'Parse requests in the Python catalog/order examples and connect SQLite transactions with ownership checks. Compare FastAPI and Django choices.'),
  javascript: b('Node.js의 비동기 요청 처리와 상품·주문 예제를 연결합니다. JavaScript 실행과 TypeScript 타입 검사·컴파일을 구분하고 Express·NestJS의 역할을 비교합니다.', 'Connect Node.js asynchronous request handling with catalog/order examples. Separate JavaScript execution from TypeScript checking/building and compare Express and NestJS.'),
  csharp: b('.NET의 상품·주문 예제에서 타입과 async 작업을 HTTP·SQLite 경계에 연결합니다. ASP.NET Core의 바인딩·DI·취소 처리를 함께 살핍니다.', 'Connect types and async work to HTTP/SQLite boundaries in .NET catalog/order examples, alongside ASP.NET Core binding, DI and cancellation.'),
};
export type TrackChapter = Chapter & { preparation: Text; preparationCode: string; verification: string; useCase: Text };
export function trackChapter(language: CodeLanguage, stage: LanguageStage, platform: LearningPlatform): TrackChapter {
  if (language === 'java') {
    const id = javaStage(stage), original = chapters.find(item => item.id === id)!;
    const c = chapterForPlatform(original, platform), prep = platformPreparation(platform, id);
    return { ...c, preparation: prep.body, preparationCode: prep.code, verification: verificationCommands(platform, id), useCase: contexts.java };
  }
  const c = depthChapter(language, stage), windows = platform === 'windows';
  const adapt = (s: string) => windows ? s.replaceAll('python3', 'python.exe').replaceAll('node ', 'node.exe ').replaceAll('dotnet ', 'dotnet.exe ').replaceAll('curl -i', 'curl.exe -i') : s;
  return {
    id: stage, title: b(languageStages.find(s => s[0] === stage)![1], languageStages.find(s => s[0] === stage)![2]), summary: c.intro, prerequisites: c.prerequisite, glossary: c.glossary,
    concepts: [{ title: b('요청과 데이터의 경계', 'Request and data boundaries'), body: c.flow, code: adapt(c.code), output: c.expected }],
    flow: [{ title: b('요청·데이터 흐름', 'Request/data flow'), body: c.flow, code: '', output: c.expected }],
    prediction: c.independent, answer: c.solution, guided: c.guided, failure: c.failure, exercise: c.independent,
    hint: c.hint, solution: c.solution, criteria: c.criteria, tradeoffs: c.tradeoffs, run: adapt(c.run), scope: c.codeScope,
    exampleFiles: [c.projectFile], sources: [{ label: b('공식 참고 자료', 'Official reference'), url: c.source }],
    preparation: introductions[language].runtime,
    preparationCode: windows ? introductions[language].windowsCheck : introductions[language].linuxCheck,
    verification: adapt(c.run), useCase: contexts[language],
  };
}
