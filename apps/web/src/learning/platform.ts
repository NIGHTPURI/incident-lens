import { chapters, type Chapter } from "./curriculum";
import type { Text } from "./content";

export type LearningPlatform = "windows" | "linux";
export const platformKey = "incidentlens.learning.platform.v1";
export function readPlatform(storage: Pick<Storage, "getItem">, hostPlatform = ""): LearningPlatform {
  try {
    const saved = storage.getItem(platformKey);
    if (saved === "windows" || saved === "linux") return saved;
  } catch { /* Reading remains available when browser storage is blocked. */ }
  return /^win/i.test(hostPlatform) ? "windows" : "linux";
}
export function savePlatform(storage: Pick<Storage, "setItem">, platform: LearningPlatform): boolean {
  try { storage.setItem(platformKey, platform); return true; } catch { return false; }
}
const text = (ko: string, en: string): Text => ({ ko, en });
export const platformIntro: Record<LearningPlatform, Text> = {
  windows: text(
    "Windows PowerShell에서 실행합니다. 언어와 실행 환경은 독립적이며 선택해도 진도·예측·실험 기록은 바뀌지 않습니다. WSL 터미널을 쓰려면 Linux (Bash)를 선택하세요. 아래 코드는 자동 실행되지 않습니다.",
    "Run in Windows PowerShell. Language and execution environment are independent; changing this choice preserves progress, predictions and experiment records. For a WSL terminal, select Linux (Bash). Nothing below runs automatically."),
  linux: text(
    "Linux Bash에서 실행합니다. Windows 안의 WSL Ubuntu도 이 선택에 포함되며, 명령은 WSL 안에서 입력합니다. 언어와 실행 환경은 독립적입니다. 아래 코드는 자동 실행되지 않습니다.",
    "Run in Linux Bash. This includes WSL Ubuntu on Windows; enter these commands inside WSL. Language and execution environment are independent. Nothing below runs automatically."),
};

// Explicit authored shell variants; Java, SQL, HTTP and Compose YAML remain the same languages.
const processCommands = {
  windows: "Get-Process -Id $PID\ntry {\n  Get-NetTCPConnection -State Listen -ErrorAction Stop | Select-Object LocalAddress,LocalPort,OwningProcess\n} catch {\n  netstat.exe -ano -p tcp\n}",
  linux: "ps -p $$ -o pid,comm\nss -ltn",
};
const windowsEnvironment = "$previousProductName = $env:PRODUCT_NAME\ntry {\n  $env:PRODUCT_NAME = 'Notebook'\n  powershell.exe -NoProfile -Command 'Write-Output $env:PRODUCT_NAME'\n} finally {\n  $env:PRODUCT_NAME = $previousProductName\n}\ngit status --short\ngit log -1 --oneline";
export const stageCommands: Record<string, Record<LearningPlatform, string>> = Object.fromEntries(chapters.map((chapter, index) => [chapter.id, {
  linux: chapter.run,
  windows: index >= 4 ? `py -3 .\\examples\\beginner\\advanced\\run.py ${index + 1}` : ({
    tools: "Get-Content -LiteralPath .\\examples\\beginner\\product.txt",
    java: "java .\\examples\\beginner\\java\\Basics.java\njava .\\examples\\beginner\\java\\Totals.java\njava .\\examples\\beginner\\java\\Catalog.java\njava .\\examples\\beginner\\java\\ParseQuantity.java 2\njava .\\examples\\beginner\\java\\ParseQuantity.java two",
    http: "java .\\examples\\beginner\\http\\TinyServer.java",
    spring: ".\\gradlew.bat -p .\\examples\\beginner\\spring-api --offline test",
  }[chapter.id] ?? ""),
}]));

function windowsCommand(code: string): string {
  return code.replace(/java examples\/beginner\/([A-Za-z0-9/.-]+)/g, (_, path: string) => `java .\\examples\\beginner\\${path.replaceAll("/", "\\")}`).replaceAll("./gradlew -p examples/beginner/", ".\\gradlew.bat -p .\\examples\\beginner\\")
    .replaceAll("curl -", "curl.exe -");
}
const windowsTools: Partial<Chapter> = {
  prerequisites: text("사전 지식 없음. Windows PowerShell과 기존 Git을 사용합니다. 설치 없이 읽기부터 진행할 수 있습니다. Windows의 WSL을 사용할 경우 Linux (Bash)를 선택합니다.", "No prior knowledge. Use Windows PowerShell and existing Git. Reading requires no installation. Select Linux (Bash) when using WSL on Windows."),
  guided: text("1. Get-Location으로 기존 저장소 위치를 확인합니다. 2. Get-Content로 product.txt를 읽습니다. 3. 환경 변수 예제의 Notebook을 Pencil로 바꾸고 자식 PowerShell 출력을 확인합니다. 4. Get-Content로 파일이 그대로인지 확인합니다. finally는 이전 환경 변수를 복원합니다.", "1. Check the existing repository with Get-Location. 2. Read product.txt with Get-Content. 3. Change Notebook to Pencil in the environment example and inspect the child PowerShell output. 4. Confirm the file is unchanged with Get-Content. finally restores the previous environment value."),
  failure: text("의도적 오류: Get-Content -LiteralPath .\\examples\\beginner\\missing.txt. 예상: 경로를 찾을 수 없다는 오류. ① Get-Location ② Get-ChildItem .\\examples\\beginner ③ 파일명·경로 비교 ④ product.txt로 다시 읽기. 서버 장애가 아닌 경로 오류입니다. 명령을 찾지 못한다면 PowerShell인지 먼저 확인하세요.", "Deliberate failure: Get-Content -LiteralPath .\\examples\\beginner\\missing.txt. Expect a path-not-found error. ① Get-Location ② Get-ChildItem .\\examples\\beginner ③ compare filename/path ④ read product.txt instead. This is a path error, not a server outage. If the command is unknown, check that the shell is PowerShell."),
  exercise: text("원본 파일을 수정하지 않고 환경 변수 예제의 값을 Pen으로 바꿔 자식 셸 출력과 상품 메모를 비교하세요. 위치·명령·실제 출력·차이의 이유를 기록하고 상대 경로가 다른 폴더에서 실패하는 이유를 설명하세요.", "Without editing the file, set Pen in the environment example and compare the child shell output with the product note. Record location, command, actual output and the reason for the difference. Explain relative paths from another folder."),
  prediction: text("Get-Content로 파일을 읽은 뒤 터미널을 닫으면 파일이 삭제될까요? 이유를 설명하세요.", "Does closing the terminal after Get-Content remove the file? Explain why."),
  hint: text("Get-Content는 파일을 읽고 Write-Output은 전달한 값을 출력합니다. 상대 경로는 현재 위치에서 시작합니다.", "Get-Content reads a file; Write-Output prints a supplied value. Relative paths start at the current location."),
  solution: text("자식 셸은 Pen, 파일은 Product: Notebook / Price: 1200을 출력합니다. 파일을 편집하지 않았으므로 차이가 정상입니다. Get-Location으로 위치를 확인하고 기존 저장소 폴더에서 다시 실행합니다.", "The child shell prints Pen; the file prints Product: Notebook / Price: 1200. This difference is expected because the file was not edited. Check Get-Location and retry from the existing repository folder."),
};

export function chapterForPlatform(original: Chapter, platform: LearningPlatform): Chapter {
  if (platform === "linux") return original;
  const chapter: Chapter = { ...original, run: stageCommands[original.id].windows,
    concepts: original.concepts.map(section => ({ ...section, code: windowsCommand(section.code) })),
  };
  if (chapter.id === "tools") {
    Object.assign(chapter, windowsTools);
    chapter.concepts[0] = { ...chapter.concepts[0],
      body: text("텍스트 파일과 소스 파일은 글자로 저장됩니다. Get-Location은 현재 위치, Get-ChildItem은 항목 목록, Set-Location은 이동입니다. Get-Content는 파일을 읽습니다. 상대 경로는 현재 폴더에서 시작합니다. 기존 저장소인지 확인하고 PS ...> 프롬프트는 입력하지 않습니다.", "Text and source files store characters. Get-Location shows the current folder, Get-ChildItem lists entries, Set-Location changes folder and Get-Content reads a file. Relative paths start at the current folder. Confirm the existing repository; do not type the PS ...> prompt."),
      code: "Get-Location\nGet-ChildItem .\\examples\\beginner\nGet-Content -LiteralPath .\\examples\\beginner\\product.txt",
    };
    chapter.concepts[1] = { ...chapter.concepts[1], code: processCommands.windows,
      output: text("PID·프로세스명은 다릅니다. 대기 TCP 포트와 OwningProcess가 표시됩니다. 접근 거부 시 netstat.exe의 읽기 전용 목록으로 확인합니다. 둘 다 차단되면 기록하고 넘어갑니다.", "PID/process names vary. Listening TCP ports and OwningProcess are listed. If access is denied, use the read-only netstat.exe listing. If both are blocked, record it and continue without elevation.") };
    chapter.concepts[2] = { ...chapter.concepts[2], code: windowsEnvironment };
    chapter.flow = chapter.flow.map(section => ({ ...section, body: {
      ko: section.body.ko.replaceAll("cat 프로그램", "Get-Content 명령").replaceAll("cat 프로세스", "PowerShell의 Get-Content"),
      en: section.body.en.replaceAll("cat program", "Get-Content command").replaceAll("cat process", "PowerShell Get-Content").replaceAll("Type cat", "Type Get-Content"),
    } }));
  }
  if (chapter.id === "operations") {
    chapter.concepts[0] = { ...chapter.concepts[0],
      body: text("Windows에서는 Get-Process로 프로세스, Get-NetTCPConnection으로 포트, curl.exe로 HTTP를 확인합니다. 배포 대상 Linux에서는 같은 경계를 ps·ss로 확인합니다. 로컬과 서버의 폴더·환경·권한은 다를 수 있습니다. Connection refused와 HTTP 500은 다릅니다. 로그의 첫 원인을 읽고 다른 서비스를 종료하지 않습니다.", "On Windows, inspect processes with Get-Process, ports with Get-NetTCPConnection and HTTP with curl.exe. On a Linux deployment target, ps/ss inspect the same boundaries. Folders, environment and permissions can differ. Connection refused differs from HTTP 500. Read the underlying cause; do not stop other services."),
      code: `${processCommands.windows}\n# For your own already-started lesson server only:\ncurl.exe -i "http://127.0.0.1:18182/total?quantity=2"`,
    };
  }
  if (chapter.id === "collaboration") chapter.concepts[2] = { ...chapter.concepts[2], code: "# Illustrative Windows CI job; not an installed workflow\njobs:\n  verify:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with:\n          distribution: temurin\n          java-version: '21'\n      - name: Verify isolated Spring API\n        shell: pwsh\n        run: .\\gradlew.bat -p .\\examples\\beginner\\spring-api test" };
  // HTTP references follow the selected shell in every instructional panel.
  const httpText = (value: Text): Text => ({ ko: value.ko.replace(/\bcurl\b(?!\.exe)/g, "curl.exe"), en: value.en.replace(/\bcurl\b(?!\.exe)/g, "curl.exe") });
  for (const field of ["prerequisites", "guided", "failure", "exercise", "prediction", "hint", "solution", "criteria", "tradeoffs"] as const) chapter[field] = httpText(chapter[field]);
  chapter.concepts = chapter.concepts.map(section => ({ ...section, body: httpText(section.body), output: httpText(section.output) }));
  chapter.flow = chapter.flow.map(section => ({ ...section, body: httpText(section.body) }));
  return chapter;
}

export function platformPreparation(platform: LearningPlatform, chapterId: string): { body: Text; code: string; troubleshooting: Text } {
  const windows = platform === "windows";
  const advanced = chapters.findIndex(chapter => chapter.id === chapterId) >= 4;
  const java = chapterId !== "tools";
  const body = windows ? text(
    "기존 Windows 저장소 폴더에서 Get-Location으로 위치를 확인하세요. 폴더가 WSL에만 있으면 Linux (Bash)를 골라 WSL 안에서 실행할 수도 있습니다. PowerShell 경로에 공백이 있으면 따옴표와 & 호출 연산자를 사용합니다. Windows PowerShell의 curl 별칭을 피하려고 curl.exe를 씁니다. 여러 줄은 줄마다 실행하고 Bash의 \\ 줄 연결을 붙이지 않습니다.",
    "Use Get-Location in the existing Windows repository folder. If the repository is only in WSL, you can select Linux (Bash) and work inside WSL. Quote paths containing spaces and use & to invoke an executable. Use curl.exe to avoid the Windows PowerShell curl alias. Run separate lines; do not append Bash backslash continuations.") : text(
    "기존 Linux 저장소 루트에서 pwd로 위치를 확인합니다. WSL은 Windows에 설치되어 있어도 Bash 명령을 WSL 터미널 안에서 실행합니다. 공백 경로는 따옴표로 감쌉니다. Windows 경로 C:\\...나 gradlew.bat를 Bash에 붙여 넣지 않습니다. 필요한 도구·캐시·공간이 없으면 설치 없이 읽기 학습을 계속합니다.",
    "Check pwd at the existing Linux repository root. WSL runs these Bash commands inside the WSL terminal even though its host is Windows. Quote paths containing spaces. Do not paste C:\\... paths or gradlew.bat into Bash. If tools, caches or space are missing, continue reading without installing.");
  const code = [windows ? "Get-Location\nGet-Command git -ErrorAction SilentlyContinue\ngit --version" : "pwd\ncommand -v git\ngit --version"];
  if (java) code.push(windows ? "Get-Command java,javac -ErrorAction SilentlyContinue\njava -version\njavac -version" : "command -v java javac\njava -version\njavac -version");
  if (advanced || chapterId === "http") code.push(windows ? "Get-Command py -ErrorAction SilentlyContinue\npy -0p\npy -3 --version" : "command -v python3\npython3 --version");
  if (["http", "spring", "operations"].includes(chapterId)) code.push(windows ? "Get-Command curl.exe -ErrorAction SilentlyContinue\ntry { Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in 18181,18182 } } catch { netstat.exe -ano -p tcp | Select-String ':18181|:18182' }" : "command -v curl\nss -ltn");
  let troubleshooting = windows ? text(
    "java -version은 21이어야 합니다. 설치된 Java 21이 있어도 PATH가 Java 8을 선택할 수 있습니다. 자동 설치·관리자 실행·실행 정책 변경은 하지 않습니다. py 등록 경로가 없어 실행이 실패하면 py -0p와 실제 파일을 비교하고 이미 설치된 Python 실행 파일을 & '경로\\python.exe'로 호출하세요. Python 소스 자체는 두 OS에서 같습니다. Get-NetTCPConnection 접근 거부는 netstat.exe -ano -p tcp로 확인합니다. WSL 공유 경로의 JAR 읽기가 느리면 확인한 작은 JAR만 자기 실습 폴더에 복사해 사용하고 기존 캐시는 삭제하지 않습니다. 오프라인 Gradle/H2 캐시는 OS별로 따로 있을 수 있습니다. 캐시 없음을 프로그램 오류와 구분하고 다운로드 없이 기록합니다.",
    "java -version must report 21. PATH can select Java 8 even when Java 21 is installed. Do not install, elevate or change execution policy automatically. If a stale py registration fails, compare py -0p with actual files and invoke an already installed Python using & 'path\\python.exe'. Python sources work on both OSes. For denied Get-NetTCPConnection access, use netstat.exe -ano -p tcp. If reading a JAR through a WSL share is slow, copy only the verified small JAR to your exercise folder without clearing caches. Offline Gradle/H2 caches can be separate per OS; record missing caches separately from program errors without downloading.") : text(
    "Java 21과 Python 3(5–15단계)를 확인합니다. command not found는 도구/PATH, Permission denied는 파일·마운트 권한, Address already in use는 포트 문제입니다. gradlew가 실행 불가하되 읽을 수 있다면 bash ./gradlew로 기존 스크립트를 읽어 실행할 수 있습니다. chmod·sudo·설치·캐시 삭제를 자동으로 하지 않습니다. 오프라인 캐시가 없으면 실행 미검증으로 기록합니다.",
    "Check Java 21 and Python 3 (stages 5–15). command not found concerns tools/PATH; Permission denied concerns file/mount permissions; Address already in use concerns ports. If gradlew is readable but not executable, bash ./gradlew runs the existing script. Do not automatically chmod, sudo, install or clear caches. Record execution as unverified if offline caches are absent.");
  if (chapterId === "tools") troubleshooting = windows
    ? text("경로를 찾을 수 없으면 Get-Location과 Get-ChildItem으로 실제 위치·파일명을 확인합니다. 공백 경로는 따옴표로 감싸고 Get-Content -LiteralPath로 읽습니다. Get-NetTCPConnection이 접근 거부라면 netstat.exe -ano -p tcp로 확인합니다. 여기에는 Java나 Python이 필요 없습니다.", "For a missing path, inspect Get-Location/Get-ChildItem and compare the actual filename. Quote paths with spaces and read using Get-Content -LiteralPath. If Get-NetTCPConnection is denied, use netstat.exe -ano -p tcp. This lesson requires neither Java nor Python.")
    : text("No such file이면 pwd·ls로 현재 위치와 파일명을 비교합니다. Linux는 대소문자를 구분합니다. 공백 경로는 따옴표로 감쌉니다. Java·Python 없이 파일 읽기와 셸 명령만 확인합니다.", "For No such file, compare pwd/ls with the current folder and filename. Linux paths are case-sensitive. Quote paths with spaces. These checks need only file-reading and shell commands, without Java or Python.");
  if (chapterId === "java") troubleshooting = windows
    ? text("java -version과 javac -version이 21인지 확인합니다. 이미 설치된 21이 있어도 PATH가 8을 선택할 수 있습니다. 명령 경로를 확인하고 공백이 있는 실행 파일은 & '실제 경로\\java.exe'로 호출합니다. 새 설치나 시스템 설정 변경은 하지 않습니다. 이 단계에는 Python·HTTP 서버·Gradle이 필요 없습니다.", "Check that java -version and javac -version report 21. PATH may choose 8 even when 21 is installed. Inspect command locations and invoke paths with spaces using & 'actual path\\java.exe'. No installation or system setting change is needed. This stage requires neither Python, an HTTP server nor Gradle.")
    : text("java -version·javac -version에서 21인지 확인하고 command -v java로 경로를 확인합니다. 소스 경로는 저장소 루트 기준입니다. 잘못된 수량 메시지를 도구 실행 실패와 구분합니다. Python·HTTP 서버·Gradle 없이 확인합니다.", "Verify Java/javac 21 and inspect command -v java. Source paths are relative to the repository root. Distinguish rejected quantities from tool-launch failures. These checks need no Python, HTTP server or Gradle.");
  return { body, code: code.join("\n"), troubleshooting };
}

export const shellReference: Record<LearningPlatform, { body: Text; code: string }> = {
  windows: {
    body: text("이미 설치된 JDK 21 경로를 확인한 뒤 아래 자리표시자를 바꿉니다. 환경 변수는 현재 PowerShell에만 적용됩니다. 클래스 경로 항목 구분자는 ;이며 전체를 따옴표로 감쌉니다. javac는 .class를 만들고 java는 실행합니다. Compose의 config는 설정 검사만 합니다. Docker Desktop이 준비되지 않았으면 실행을 건너뜁니다. 예제 서버는 실행한 터미널에서 Ctrl+C로 종료합니다.", "Replace the placeholder with a verified installed JDK 21 path. Environment changes apply only to this PowerShell session. Classpath entries use ; and the entire value must be quoted. javac creates .class files; java executes them. Compose config validates configuration only. Skip it if Docker Desktop is unavailable. Stop your example server with Ctrl+C in its own terminal."),
    code: "# Optional: use your ALREADY INSTALLED JDK 21, replacing this path.\n$env:JAVA_HOME = 'C:\\path to installed\\jdk-21'\n$env:PATH = \"$env:JAVA_HOME\\bin;$env:PATH\"\n# Compile only your own copy; outputs go into your exercise folder.\nNew-Item -ItemType Directory -Force .\\lesson-classes\njavac -d .\\lesson-classes .\\examples\\beginner\\java\\Basics.java\njava -cp '.\\lesson-classes;.' Basics\n# Optional read-only configuration check (no containers started):\ndocker compose -f .\\docker-compose.yml config",
  },
  linux: {
    body: text("이미 설치된 JDK 21 경로로 자리표시자를 바꿉니다. export는 현재 Bash와 자식 프로세스에만 적용됩니다. 클래스 경로 항목 구분자는 :입니다. javac는 .class를 만들고 java는 실행합니다. Compose config는 설정 검사만 하며 컨테이너를 시작하지 않습니다. 예제 서버는 실행한 터미널에서 Ctrl+C로 종료합니다.", "Replace the placeholder with an already installed JDK 21 path. export applies to this Bash and its children. Classpath entries use :. javac creates .class files; java executes them. Compose config validates configuration without starting containers. Stop your example server with Ctrl+C in its own terminal."),
    code: "# Optional: use your ALREADY INSTALLED JDK 21, replacing this path.\nexport JAVA_HOME='/path to installed/jdk-21'\nexport PATH=\"$JAVA_HOME/bin:$PATH\"\n# Compile only your own copy; outputs go into your exercise folder.\nmkdir -p lesson-classes\njavac -d lesson-classes examples/beginner/java/Basics.java\njava -cp 'lesson-classes:.' Basics\n# Optional read-only configuration check (no containers started):\ndocker compose -f docker-compose.yml config",
  },
};

export function verificationCommands(platform: LearningPlatform, chapterId: string): string {
  if (chapterId === "tools") return "git status --short";
  const python = platform === "windows" ? "py -3 .\\examples\\beginner\\" : "python3 examples/beginner/";
  const gradle = platform === "windows" ? ".\\gradlew.bat -p .\\examples\\beginner\\" : "./gradlew -p examples/beginner/";
  if (chapterId === "java") return stageCommands[chapterId][platform];
  if (chapterId === "http") return `${python}verify.py`;
  if (chapterId === "spring") return `${gradle}spring-api --offline --no-daemon test`;
  if (chapterId === "transactions") return `${stageCommands[chapterId][platform]}\n${gradle}data-jpa --offline --no-daemon test`;
  return stageCommands[chapterId][platform];
}

export function verificationDescription(chapterId: string): Text {
  if (chapterId === "tools") return text("파일 내용과 예상 출력을 비교하고 현재 Git 변경 목록을 읽습니다. 저장소 파일을 수정하지 않습니다.", "Compare the file with expected output and read the current Git changes. These commands do not edit repository files.");
  if (chapterId === "java") return text("각 Java 예제를 실행해 위의 예상 출력과 비교합니다. two는 의도적인 잘못된 입력입니다. Python이나 웹 서버 없이 Java만으로 확인합니다.", "Run each Java example and compare with the expected output above. two is deliberately invalid input. These checks need only Java, with no Python or web server.");
  if (chapterId === "http") return text("선택 검사에는 Python 3이 필요합니다. 7개 Java 출력과 8개 HTTP 사례를 검사하며, 18181이 사용 중이면 멈춥니다. 자신이 시작한 장난감 서버만 종료합니다. 기존 IncidentLens에는 요청하지 않습니다.", "This optional check requires Python 3. It verifies seven Java outputs and eight HTTP cases, refusing an occupied 18181 port. It stops only its own toy server and does not request IncidentLens.");
  if (chapterId === "spring") return text("기존 오프라인 캐시로 Service·MockMvc 테스트를 실행합니다. 실제 포트를 열지 않으며 curl로 서버를 직접 확인한 결과와 구분합니다.", "Run Service/MockMvc tests with existing offline caches. They open no listening port; distinguish these results from direct curl checks against a running server.");
  return text("각 단계에서 명시한 실행·모형 범위만 검사합니다. 기존 서비스·실험·보고서에는 요청하지 않습니다. 6단계의 별도 JPA 테스트도 격리 H2 DB만 사용합니다.", "Checks apply only within the execution/model scope stated for each stage. They do not request existing services, experiments or reports. The separate stage-6 JPA tests also use only isolated H2 databases.");
}
