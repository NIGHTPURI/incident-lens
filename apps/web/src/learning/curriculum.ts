import type { Text } from "./content";
export type Section = { title: Text; body: Text; code: string; output: Text };
export type Chapter = {
  id: string; title: Text; summary: Text; prerequisites: Text; glossary: Text;
  concepts: Section[]; flow: Section[]; prediction: Text; answer: Text;
  guided: Text; failure: Text; exercise: Text; hint: Text; solution: Text;
  criteria: Text; tradeoffs: Text; run: string;
  scope?: Text; exampleFiles?: string[]; sources?: { label: Text; url: string }[];
};
export type Stage = { id: string; title: Text; summary: Text; status: "available" | "planned" };
export const chapters: Chapter[] = [
  {
    "id": "tools",
    "title": {
      "ko": "01 · 파일에서 실행까지",
      "en": "01 · From files to running programs"
    },
    "summary": {
      "ko": "설치 없이 읽기부터 시작합니다. 작은 상품 메모 파일 하나가 모든 예제의 출발점입니다.",
      "en": "Begin by reading without installing anything. One small product note starts the evolving example."
    },
    "prerequisites": {
      "ko": "사전 지식 없음. 실행 실습은 WSL Ubuntu 터미널과 기존 Git을 사용합니다. 터미널이 없으면 예제와 예상 출력을 읽고 실행은 나중에 합니다.",
      "en": "No prior knowledge. Hands-on steps use a WSL Ubuntu terminal and existing Git. Without a terminal, read the examples and expected output and defer execution."
    },
    "glossary": {
      "ko": "파일: 이름이 있는 저장 데이터. 폴더: 파일을 묶는 위치. 경로: 위치를 나타내는 주소. 터미널: 글자로 명령과 결과를 주고받는 창. 셸: 명령을 해석하는 프로그램. 프로세스: 실행 중인 프로그램. 포트: 한 컴퓨터에서 네트워크 프로그램을 구별하는 번호. 환경 변수: 프로세스에 전달하는 이름과 값. 저장소: 변경 이력을 관리하는 폴더.",
      "en": "File: named stored data. Folder: a location grouping files. Path: an address for a location. Terminal: a window exchanging text commands and results. Shell: the program interpreting commands. Process: a running program. Port: a number distinguishing network programs on a computer. Environment variable: a named value passed to a process. Repository: a folder whose changes are tracked."
    },
    "concepts": [
      {
        "title": {
          "ko": "파일과 명령의 위치",
          "en": "Files and command locations"
        },
        "body": {
          "ko": "텍스트 파일은 메모장으로도 볼 수 있는 글자입니다. 소스 파일은 프로그램의 지시를 글자로 적은 파일입니다. 명령은 현재 폴더를 기준으로 상대 경로를 찾습니다. pwd는 현재 위치, ls는 항목 목록, cd는 위치 이동입니다. 아래 명령은 기존 저장소 안에서 실행합니다. 첫 줄이 가리키는 폴더가 다르면 먼저 멈추세요. $나 > 프롬프트 기호는 명령에 포함하지 않습니다.",
          "en": "A text file contains characters readable in an editor. A source file contains program instructions as text. Commands resolve relative paths from the current folder. pwd prints that folder, ls lists entries, and cd changes it. Run these commands inside the existing repository. Stop if the first line shows a different folder. Do not type prompt symbols such as $ or >."
        },
        "code": "pwd\nls examples/beginner\ncat examples/beginner/product.txt",
        "output": {
          "ko": "Product: Notebook\nPrice: 1200",
          "en": "Product: Notebook\nPrice: 1200"
        }
      },
      {
        "title": {
          "ko": "프로그램, 프로세스, 포트",
          "en": "Programs, processes and ports"
        },
        "body": {
          "ko": "프로그램 파일과 실행 중인 프로세스는 다릅니다. 같은 프로그램을 두 번 실행하면 별도 프로세스가 생길 수 있습니다. 서버는 요청을 기다리는 프로세스입니다. 127.0.0.1은 내 컴퓨터, 포트는 그 안의 창구입니다. 나중에 예제 서버는 18181을 사용합니다. 포트가 이미 사용 중이면 다른 사람의 프로세스를 종료하지 말고 소유자와 용도를 확인합니다.",
          "en": "A program file differs from its running process. Starting one program twice may create two processes. A server is a process waiting for requests. 127.0.0.1 means this computer; a port selects a service on it. Our later example uses 18181. If that port is occupied, identify its owner and purpose instead of stopping someone else’s process."
        },
        "code": "ps -p $$ -o pid,comm\nss -ltn",
        "output": {
          "ko": "PID와 셸 이름은 실행 환경마다 다릅니다. ss는 대기 중인 TCP 포트를 보여줍니다.",
          "en": "PID and shell name vary; ss lists listening TCP ports."
        }
      },
      {
        "title": {
          "ko": "환경 변수와 Git의 역할",
          "en": "Environment variables and Git"
        },
        "body": {
          "ko": "환경 변수는 코드 수정 없이 실행 설정을 전달합니다. 아래 값은 이 명령의 자식 셸에만 적용되므로 다른 서비스 설정을 바꾸지 않습니다. 비밀번호는 Git에 넣지 않습니다. Git diff는 아직 저장하지 않은 코드 변경을, log는 기록된 변경을 보여줍니다. 지금은 읽기 명령만 실행합니다. 커밋은 파일 저장과 다르고, push는 다른 컴퓨터로 기록을 보내는 별도 동작입니다.",
          "en": "Environment variables supply runtime settings without editing code. This value applies only to the child shell of this command, leaving other service settings alone. Never put passwords in Git. git diff shows uncommitted changes; log shows recorded changes. Use only these read commands now. A commit differs from saving a file; push is a separate operation sending history to another computer."
        },
        "code": "PRODUCT_NAME=Notebook sh -c 'printf \"%s\\n\" \"$PRODUCT_NAME\"'\ngit status --short\ngit log -1 --oneline",
        "output": {
          "ko": "Notebook\nGit 출력은 현재 변경 사항과 커밋에 따라 다릅니다.",
          "en": "Notebook\nGit output depends on your current changes and commit."
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "입력",
          "en": "Input"
        },
        "body": {
          "ko": "터미널에 cat과 파일 경로를 입력합니다.",
          "en": "Type cat and a file path into the terminal."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "해석",
          "en": "Interpret"
        },
        "body": {
          "ko": "셸이 cat 프로그램과 경로 인자를 구분합니다. 파일이 없으면 여기서 경로를 확인합니다.",
          "en": "The shell separates the cat program from its path argument. If the file is missing, check the path."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "읽기",
          "en": "Read"
        },
        "body": {
          "ko": "cat 프로세스가 저장된 글자를 읽습니다. 파일을 실행하는 것이 아닙니다.",
          "en": "The cat process reads stored characters. It does not execute the file."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "출력",
          "en": "Output"
        },
        "body": {
          "ko": "표준 출력이 터미널에 표시됩니다. 프로그램이 끝나면 셸이 다음 명령을 받습니다.",
          "en": "Standard output appears in the terminal. When the program exits, the shell accepts another command."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "cat으로 파일을 읽은 뒤 터미널을 닫으면 파일도 없어질까요? 이유를 적으세요.",
      "en": "Does closing the terminal after cat remove the file? Explain why."
    },
    "answer": {
      "ko": "아니요. 프로세스 종료와 디스크 파일 삭제는 다릅니다. 파일은 저장된 상태로 남습니다.",
      "en": "No. Ending a process differs from deleting a disk file. The stored file remains."
    },
    "guided": {
      "ko": "1. pwd로 저장소 경로를 확인합니다. 2. product.txt를 읽고 이름과 가격을 적습니다. 3. PRODUCT_NAME을 Pencil로 바꿔 자식 셸 명령을 다시 실행합니다. 4. cat으로 원본 파일이 그대로인지 확인합니다. 환경 변수와 파일은 서로 다른 저장 장소입니다.",
      "en": "1. Verify the repository path with pwd. 2. Read product.txt and record the name and price. 3. Change PRODUCT_NAME to Pencil and repeat the child-shell command. 4. Use cat to confirm the original file is unchanged. Environment variables and files are separate storage locations."
    },
    "failure": {
      "ko": "의도적 오류: cat examples/beginner/missing.txt. 예상: No such file or directory. ① pwd 확인 ② ls examples/beginner로 실제 이름 확인 ③ 대소문자와 경로 비교 ④ product.txt로 고쳐 재실행. 이 오류는 서버 장애가 아니라 파일 경로 오류입니다.",
      "en": "Deliberate failure: cat examples/beginner/missing.txt. Expect No such file or directory. ① Check pwd ② list examples/beginner ③ compare spelling, case and path ④ retry with product.txt. This is a file-path error, not a server outage."
    },
    "exercise": {
      "ko": "원본 파일을 수정하지 않고 PRODUCT_NAME=Pen인 자식 셸의 출력과 원본 상품 메모를 비교하세요. 현재 위치·명령·실제 출력·왜 다른지 네 가지를 기록하고, 상대 경로를 다른 폴더에서 쓰면 왜 실패하는지 설명하세요.",
      "en": "Without changing the original file, compare a child shell with PRODUCT_NAME=Pen against the product note. Record location, command, actual output and why they differ. Explain why a relative path may fail from another folder."
    },
    "hint": {
      "ko": "cat은 파일을 읽고 printf는 전달받은 값을 출력합니다. 상대 경로는 현재 폴더에서 시작합니다.",
      "en": "cat reads a file; printf prints a supplied value. A relative path starts at the current folder."
    },
    "solution": {
      "ko": "환경 변수 명령은 Pen, cat은 Product: Notebook / Price: 1200을 출력해야 합니다. 파일을 고치지 않았으므로 두 결과가 달라도 정상입니다. 절대 경로 또는 올바른 작업 폴더로 경로 오류를 해결합니다.",
      "en": "The environment command should print Pen; cat should print Product: Notebook / Price: 1200. Different results are expected because the file was not edited. Fix path errors with an absolute path or the correct working folder."
    },
    "criteria": {
      "ko": "경로 오류를 스스로 고치고 파일·프로세스·포트·환경 변수를 자기 말로 구별하며 실제 출력 두 개를 기록할 수 있다.",
      "en": "Independently fix the path error, distinguish file/process/port/environment variable in your own words, and record both actual outputs."
    },
    "tradeoffs": {
      "ko": "터미널은 반복 작업과 정확한 기록에 유용합니다. 파일 한 개를 읽는 데는 편집기도 충분합니다. Git은 이력을 관리하지만 비밀 저장소나 자동 백업의 대체품은 아닙니다.",
      "en": "A terminal helps repeat tasks and record exact steps. An editor is sufficient for reading one file. Git tracks history but is not a secret store or a substitute for backups."
    },
    "run": "cat examples/beginner/product.txt"
  },
  {
    "id": "java",
    "title": {
      "ko": "02 · Java로 작은 계산 만들기",
      "en": "02 · Small calculations in Java"
    },
    "summary": {
      "ko": "상품 가격 계산을 통해 문법부터 객체·예외까지 배웁니다. 서버나 Spring 없이 Java 파일 하나씩 실행합니다.",
      "en": "Learn syntax through objects and exceptions using product totals. Run one Java file at a time without a server or Spring."
    },
    "prerequisites": {
      "ko": "1단계의 파일·경로·실행 개념. 실행에는 기존 Java 21이 필요합니다. java -version으로 확인하세요. 명령이 없으면 읽기 학습을 계속하고 설치는 별도 준비로 남깁니다.",
      "en": "File, path and execution concepts from stage 1. Execution needs existing Java 21; check java -version. If unavailable, continue reading and leave installation for a separate setup step."
    },
    "glossary": {
      "ko": "변수: 이름으로 참조하는 값. 타입: 값의 종류. int: 정수. String: 문자열. boolean: 참/거짓. 메서드: 이름 붙인 동작. 매개변수: 동작에 전달하는 입력. 반환값: 동작의 결과. 클래스: 데이터와 동작의 설계. 객체: 그 설계로 만든 값. List: 순서 있는 모음. 예외: 정상 흐름을 중단하는 오류 신호.",
      "en": "Variable: a named value. Type: the kind of value. int: integer. String: text. boolean: true/false. Method: a named operation. Parameter: its input. Return value: its result. Class: a definition grouping data and behavior. Object: a value made from that definition. List: an ordered collection. Exception: an error signal interrupting normal flow."
    },
    "concepts": [
      {
        "title": {
          "ko": "변수, 타입, 연산, 출력",
          "en": "Variables, types, arithmetic and output"
        },
        "body": {
          "ko": "아래 main은 실행을 시작하는 메서드입니다. String[] args는 터미널 입력들을 담는 배열입니다. 지금은 비어 있어도 됩니다. static은 객체를 만들지 않고 호출한다는 뜻, void는 반환값이 없다는 뜻입니다. 중괄호는 범위, 세미콜론은 문장의 끝입니다. =는 대입이고 ==는 비교입니다. 정수 나눗셈은 소수 부분을 버립니다. 상품 가격은 여기서 정수 원 단위로 다룹니다.",
          "en": "main below is the entry method. String[] args is an array of terminal inputs; it can be empty here. static means callable without creating an object, and void means no return value. Braces delimit a scope; a semicolon ends a statement. = assigns while == compares. Integer division discards the fractional part. Prices here use whole currency units."
        },
        "code": "class Basics {\n  public static void main(String[] args) {\n    String name = \"Notebook\";\n    int price = 1200;\n    int quantity = 2;\n    boolean available = quantity > 0;\n    System.out.println(name + \": \" + price * quantity);\n    System.out.println(available);\n    System.out.println(5 / 2);\n  }\n}",
        "output": {
          "ko": "Notebook: 2400\ntrue\n2",
          "en": "Notebook: 2400\ntrue\n2"
        }
      },
      {
        "title": {
          "ko": "조건, 반복, 메서드",
          "en": "Conditions, loops and methods"
        },
        "body": {
          "ko": "if는 조건이 참일 때만 실행합니다. for는 모음의 각 항목에 같은 동작을 반복합니다. total은 입력을 받아 결과를 반환하므로 화면 출력과 계산을 분리할 수 있습니다. <=는 이하 비교입니다. throw는 잘못된 입력을 정상 결과처럼 계산하지 않고 예외로 알립니다. 인덱스가 필요 없는 반복부터 시작합니다.",
          "en": "if runs only when its condition is true. for repeats an operation for each item. total returns a result from its inputs, separating calculation from display. <= means less than or equal. throw signals invalid input instead of calculating a normal result. Start with loops that do not need indexes."
        },
        "code": "class Totals {\n  static int total(int price, int quantity) {\n    if (quantity <= 0) {\n      throw new IllegalArgumentException(\"quantity must be positive\");\n    }\n    return price * quantity;\n  }\n  public static void main(String[] args) {\n    for (int quantity : new int[] {1, 2, 3}) {\n      System.out.println(total(1200, quantity));\n    }\n    if (total(1200, 2) != 2400) throw new AssertionError(\"total\");\n  }\n}",
        "output": {
          "ko": "1200\n2400\n3600",
          "en": "1200\n2400\n3600"
        }
      },
      {
        "title": {
          "ko": "객체와 컬렉션",
          "en": "Objects and collections"
        },
        "body": {
          "ko": "Product는 상품의 이름과 가격을 묶습니다. new는 생성자를 호출해 객체를 만듭니다. this는 지금 생성하는 객체입니다. final 필드는 한번 초기화하면 다른 값으로 대입할 수 없습니다. import는 다른 패키지의 타입 이름을 쓰게 합니다. List<Product>는 상품 객체들을 순서대로 담습니다. List.of의 목록 자체는 수정할 수 없습니다. 큰 시스템에서도 요청 데이터와 업무 데이터를 이렇게 구별해서 다룹니다.",
          "en": "Product groups a name and price. new calls a constructor to make an object; this refers to that object. A final field cannot be reassigned after initialization. import lets us use a type from another package. List<Product> holds product objects in order. The list created by List.of cannot be modified. Larger systems also distinguish request data from business data this way."
        },
        "code": "import java.util.List;\nclass Catalog {\n  static class Product {\n    final String name;\n    final int price;\n    Product(String name, int price) {\n      this.name = name;\n      this.price = price;\n    }\n  }\n  public static void main(String[] args) {\n    List<Product> products = List.of(new Product(\"Notebook\", 1200), new Product(\"Pen\", 500));\n    int sum = 0;\n    for (Product product : products) {\n      sum += product.price;\n    }\n    System.out.println(sum);\n  }\n}",
        "output": {
          "ko": "1700",
          "en": "1700"
        }
      },
      {
        "title": {
          "ko": "예외, 디버깅, 작은 테스트",
          "en": "Exceptions, debugging and small tests"
        },
        "body": {
          "ko": "Integer.parseInt는 글자를 정수로 바꿉니다. 잘못된 글자는 NumberFormatException을 일으킵니다. catch는 그 예외를 처리합니다. 모든 오류를 무시하면 버그가 숨겨집니다. 아래 테스트는 기대값이 틀리면 AssertionError로 실패합니다. 테스트는 실행 성공만 확인하지 않고 관찰할 값을 비교해야 합니다. 스택 추적은 예외 종류와 내 소스의 첫 관련 줄부터 읽습니다.",
          "en": "Integer.parseInt converts text to an integer; invalid text raises NumberFormatException. catch handles that exception. Ignoring every error hides bugs. This test fails with AssertionError if the expected value is wrong. A test should compare an observable value, not just whether a program ran. Read a stack trace from the exception type and first relevant line in your source."
        },
        "code": "class ParseQuantity {\n  public static void main(String[] args) {\n    String input = args.length == 0 ? \"2\" : args[0];\n    try {\n      int quantity = Integer.parseInt(input);\n      if (quantity <= 0) throw new IllegalArgumentException(\"quantity must be positive\");\n      int result = 1200 * quantity;\n      System.out.println(result);\n    } catch (IllegalArgumentException error) {\n      System.out.println(\"Invalid quantity: \" + input);\n    }\n  }\n}",
        "output": {
          "ko": "인자 없음: 2400\n인자 two: Invalid quantity: two\n인자 0: Invalid quantity: 0",
          "en": "No argument: 2400\nArgument two: Invalid quantity: two\nArgument 0: Invalid quantity: 0"
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "입력",
          "en": "Input"
        },
        "body": {
          "ko": "\"2\"라는 문자열을 args로 받습니다.",
          "en": "Receive the string \"2\" through args."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "변환·검증",
          "en": "Convert and validate"
        },
        "body": {
          "ko": "정수로 변환하고 0보다 큰지 검사합니다. 실패하면 계산하지 않습니다.",
          "en": "Convert to an integer and check it is positive. Do not calculate when validation fails."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "계산",
          "en": "Calculate"
        },
        "body": {
          "ko": "정수 가격 × 수량으로 합계를 구합니다.",
          "en": "Multiply integer price by quantity."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "출력",
          "en": "Output"
        },
        "body": {
          "ko": "계산 결과 또는 잘못된 입력 메시지를 출력합니다. 아직 HTTP 응답은 아닙니다.",
          "en": "Print the result or an invalid-input message. This is not an HTTP response yet."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "5 / 2와 5.0 / 2는 같은 값을 출력할까요? quantity가 0이면 계산 전에 무엇을 해야 할까요?",
      "en": "Do 5 / 2 and 5.0 / 2 print the same value? What must happen before calculation if quantity is zero?"
    },
    "answer": {
      "ko": "2와 2.5로 다릅니다. 첫 식은 정수 연산입니다. 수량은 업무 규칙에 따라 검증하고 0 이하는 거절합니다.",
      "en": "They differ: 2 and 2.5. The first uses integer arithmetic. Validate quantity against the business rule and reject zero or less."
    },
    "guided": {
      "ko": "1. examples/beginner/java/Basics.java를 읽고 출력을 예측합니다. 2. java examples/beginner/java/Basics.java로 실행합니다. 3. Totals.java와 Catalog.java도 각각 실행합니다. 4. ParseQuantity.java 뒤에 3, two, 0을 각각 전달해 결과를 비교합니다. Java 21의 소스 실행 기능을 사용하므로 별도 빌드나 라이브러리가 필요 없습니다.",
      "en": "1. Read examples/beginner/java/Basics.java and predict its output. 2. Run java examples/beginner/java/Basics.java. 3. Run Totals.java and Catalog.java separately. 4. Run ParseQuantity.java with 3, two and 0 and compare outcomes. Java 21 source-file execution needs no separate build or libraries."
    },
    "failure": {
      "ko": "의도적 오류: java examples/beginner/java/ParseQuantity.java two. ① 실제 입력 기록 ② 숫자 변환 지점 찾기 ③ catch가 출력한 메시지 확인 ④ 2로 고쳐 2400 확인. 추가 연습은 별도 복사본에서 세미콜론을 빼 보세요. 컴파일 오류는 실행 전 문법 문제이고, 숫자 변환 오류는 실행 중 값 문제입니다.",
      "en": "Deliberate failure: java examples/beginner/java/ParseQuantity.java two. ① Record the input ② locate numeric conversion ③ inspect the catch message ④ retry with 2 and verify 2400. In a separate copy, remove a semicolon. A compilation error is a syntax problem before execution; numeric conversion fails on a value during execution."
    },
    "exercise": {
      "ko": "별도 Practice.java에서 price와 quantity를 입력받는 total 메서드를 만드세요. 가격이 음수이거나 수량이 1~10 밖이면 거절합니다. (500,3)=1500, (0,1)=0, (-1,1)·(500,0)·(500,11)은 실패해야 합니다. 각 경우를 호출하는 작은 테스트를 작성하고 실패 조건을 하나씩 설명하세요.",
      "en": "In a separate Practice.java, write total(price, quantity). Reject negative prices and quantities outside 1–10. Require (500,3)=1500, (0,1)=0, and failures for (-1,1), (500,0), (500,11). Write small calls testing each case and explain each failure condition."
    },
    "hint": {
      "ko": "계산 전에 if (price < 0 || quantity < 1 || quantity > 10)을 검사하세요. ||는 둘 중 하나라도 참이라는 뜻입니다. 예외가 필요한 경우에는 예외가 안 나오는 것도 테스트 실패입니다.",
      "en": "Before calculating, check if (price < 0 || quantity < 1 || quantity > 10). || means either condition is true. A case expecting an exception must fail the test if no exception occurs."
    },
    "solution": {
      "ko": "검증 조건이 참이면 IllegalArgumentException을 던지고 아니면 price * quantity를 반환합니다. 정상 값은 기대값과 비교합니다. 오류 입력에서는 try 안에서 메서드 호출 뒤 AssertionError를 던지고 catch (IllegalArgumentException expected)만 허용합니다. 이렇게 하면 오류가 조용히 통과하지 않습니다.",
      "en": "Throw IllegalArgumentException when validation fails; otherwise return price * quantity. Compare normal results with expected values. For invalid input, call the method in try, then throw AssertionError if it returns; catch only IllegalArgumentException. This prevents invalid inputs from silently passing."
    },
    "criteria": {
      "ko": "예제를 보지 않고 계산·검증 메서드와 다섯 경계 테스트를 만들고, 문법 오류와 실행 오류의 차이를 설명한다.",
      "en": "Write the calculation/validation method and five boundary checks without copying, and explain syntax errors versus runtime errors."
    },
    "tradeoffs": {
      "ko": "단일 파일은 기초 학습에 간단합니다. 파일이 많아지면 빌드 도구와 테스트 프레임워크가 유용합니다. int에는 최대값이 있으므로 실제 금액 시스템에서는 범위·통화·반올림 정책을 정해야 합니다. 이번 작은 값 예제가 결제 시스템은 아닙니다.",
      "en": "Single files keep foundations simple. Larger projects benefit from build tools and test frameworks. int has a maximum value; real money systems need range, currency and rounding policies. This small-value example is not a payment system."
    },
    "run": "java examples/beginner/java/Basics.java\njava examples/beginner/java/Totals.java\njava examples/beginner/java/Catalog.java\njava examples/beginner/java/ParseQuantity.java two"
  },
  {
    "id": "http",
    "title": {
      "ko": "03 · 브라우저에서 HTTP까지",
      "en": "03 · From browser to HTTP"
    },
    "summary": {
      "ko": "같은 상품 계산을 HTTP로 요청합니다. Java 표준 라이브러리 서버 하나만 사용합니다.",
      "en": "Request the same product calculation over HTTP using one server from the Java standard library."
    },
    "prerequisites": {
      "ko": "1–2단계. Java 21, curl, 서로 다른 터미널 두 개. 사용하지 않는 로컬 포트 18181. 서버를 직접 실행하기 전 포트 사용 여부를 확인합니다.",
      "en": "Stages 1–2. Java 21, curl, two terminal windows and an unused local port 18181. Check port availability before starting the example server."
    },
    "glossary": {
      "ko": "프런트엔드: 사용자가 보는 화면. 백엔드: 요청을 처리하는 서버 쪽 프로그램. URL: 프로토콜·호스트·포트·경로·쿼리로 자원을 가리키는 주소. 메서드: 요청의 의도. 상태 코드: 응답 결과 분류. 헤더: 메시지에 붙는 설명. 본문: 실제 데이터. JSON: 객체·배열·문자열·숫자 등을 글자로 표현하는 형식. HTTPS: TLS로 전송을 보호하는 HTTP.",
      "en": "Frontend: the interface a user sees. Backend: server-side request processing. URL: an address with scheme, host, port, path and query. Method: request intent. Status code: result category. Header: message metadata. Body: payload. JSON: a text format for objects, arrays, strings and numbers. HTTPS: HTTP protected in transit by TLS."
    },
    "concepts": [
      {
        "title": {
          "ko": "네트워크와 URL",
          "en": "Networks and URLs"
        },
        "body": {
          "ko": "http://127.0.0.1:18181/total?quantity=2에서 http는 통신 규칙, 127.0.0.1은 내 컴퓨터, 18181은 포트, /total은 경로, quantity=2는 쿼리입니다. 도메인은 DNS로 IP 주소를 찾습니다. 같은 컴퓨터에서도 브라우저와 서버는 서로 다른 프로세스입니다. 요청이 도착하지 않은 연결 실패와 서버가 돌려준 404는 다릅니다.",
          "en": "In http://127.0.0.1:18181/total?quantity=2, http is the protocol, 127.0.0.1 is this computer, 18181 is the port, /total is the path, and quantity=2 is the query. DNS resolves domain names to IP addresses. Even on one computer, browser and server are different processes. A connection failure differs from a server returning 404."
        },
        "code": "java examples/beginner/http/TinyServer.java",
        "output": {
          "ko": "Listening on http://127.0.0.1:18181",
          "en": "Listening on http://127.0.0.1:18181"
        }
      },
      {
        "title": {
          "ko": "요청과 응답 읽기",
          "en": "Read a request and response"
        },
        "body": {
          "ko": "다른 터미널에서 아래 명령을 실행합니다. curl은 화면 대신 HTTP를 보내는 도구이고 -i는 응답 헤더도 보여줍니다. GET은 읽기, POST는 새 작업 제출, PUT은 지정 자원의 교체, DELETE는 삭제에 흔히 씁니다. 여기서는 읽기 전용 GET만 만듭니다. HTTP 요청은 문자열로 전달되므로 숫자 입력도 서버에서 변환·검증해야 합니다.",
          "en": "Run the command below in another terminal. curl sends HTTP without a browser UI; -i includes response headers. GET commonly reads, POST submits work, PUT replaces an identified resource and DELETE removes one. This example implements read-only GET. Request input arrives as text, so numeric input still needs conversion and validation."
        },
        "code": "curl -i \"http://127.0.0.1:18181/total?quantity=2\"",
        "output": {
          "ko": "HTTP/1.1 200 OK\nContent-type: application/json; charset=utf-8\n...\n{\"total\":2400}",
          "en": "HTTP/1.1 200 OK\nContent-type: application/json; charset=utf-8\n...\n{\"total\":2400}"
        }
      },
      {
        "title": {
          "ko": "JSON, 상태 코드, HTTPS",
          "en": "JSON, status codes and HTTPS"
        },
        "body": {
          "ko": "{\"total\":2400}은 total이라는 이름에 숫자 2400을 연결한 객체입니다. 문자열은 큰따옴표로 감싸고 숫자는 감싸지 않습니다. 2xx는 성공, 4xx는 요청 문제, 5xx는 서버 처리 문제입니다. 우리 서버는 잘못된 수량에 400, 없는 경로에 404, 지원하지 않는 메서드에 405를 줍니다. HTTPS는 전송을 암호화하지만 사용자 권한이나 입력 검증을 대신하지 않습니다. 이 로컬 예제는 HTTP만 사용하며 외부 공개용이 아닙니다.",
          "en": "{\"total\":2400} is an object associating the name total with the number 2400. Strings use double quotes; numbers do not. 2xx indicates success, 4xx a request problem and 5xx a server processing problem. Our server returns 400 for invalid quantity, 404 for unknown paths and 405 for unsupported methods. HTTPS encrypts transport but does not replace authorization or validation. This local HTTP example is not for public exposure."
        },
        "code": "curl -i \"http://127.0.0.1:18181/total?quantity=two\"\ncurl -i http://127.0.0.1:18181/missing",
        "output": {
          "ko": "400 및 {\"error\":\"quantity must be an integer from 1 to 10\"}\n404 및 {\"error\":\"not found\"}",
          "en": "400 with {\"error\":\"quantity must be an integer from 1 to 10\"}\n404 with {\"error\":\"not found\"}"
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "클라이언트",
          "en": "Client"
        },
        "body": {
          "ko": "curl이 GET, 경로, 쿼리를 보냅니다. 네트워크 오류면 먼저 주소와 서버 실행 여부를 확인합니다.",
          "en": "curl sends GET, path and query. For network errors, first check the address and whether the server is running."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "라우팅",
          "en": "Routing"
        },
        "body": {
          "ko": "서버가 /total과 GET을 확인합니다. 경로가 틀리면 404, 메서드가 틀리면 405입니다.",
          "en": "The server checks /total and GET. Unknown paths give 404; unsupported methods give 405."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "검증·계산",
          "en": "Validate and calculate"
        },
        "body": {
          "ko": "수량을 정수 1~10으로 검증하고 1200을 곱합니다. 잘못된 값은 400입니다.",
          "en": "Validate quantity as an integer from 1 to 10 and multiply by 1200. Invalid values give 400."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "직렬화·응답",
          "en": "Serialize and respond"
        },
        "body": {
          "ko": "결과를 JSON 글자로 만들고 상태·헤더·본문을 돌려줍니다. 데이터베이스는 아직 없습니다.",
          "en": "Turn the result into JSON text and return status, headers and body. There is no database yet."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "없는 서버 포트와 /missing 경로는 모두 404를 반환할까요?",
      "en": "Do an unused server port and the /missing path both return 404?"
    },
    "answer": {
      "ko": "아니요. 서버에 연결하지 못하면 HTTP 응답 자체가 없을 수 있습니다. 404는 서버에 도착해 경로를 찾지 못했다는 HTTP 응답입니다.",
      "en": "No. Failure to connect may produce no HTTP response at all. 404 is an HTTP response from a reached server that could not find the resource."
    },
    "guided": {
      "ko": "1. 서버 터미널을 열고 실행 메시지를 확인합니다. 2. 다른 터미널에서 수량 1과 3을 요청해 1200과 3600을 확인합니다. 3. 응답의 상태·Content-Type·본문을 나눠 적습니다. 4. 요청이 끝나도 서버가 계속 대기하는지 봅니다. 5. 실습 후 해당 예제 터미널에서 Ctrl+C로 자신이 시작한 서버만 종료합니다.",
      "en": "1. Start the server in one terminal and check its message. 2. In another, request quantities 1 and 3 and verify 1200 and 3600. 3. Record status, Content-Type and body separately. 4. Observe that the server keeps waiting after a request ends. 5. Finish with Ctrl+C in that example terminal to stop only the server you started."
    },
    "failure": {
      "ko": "의도적 오류: 수량 two 요청. ① curl 출력에서 실제 HTTP 400 확인 ② JSON 오류 문구 읽기 ③ TinyServer.java의 변환·범위 검사 찾기 ④ 수량 2로 고쳐 200 확인. 연결 거부라면 이 절차 전에 서버 실행 메시지·호스트·포트부터 확인합니다. 서버 내부 코드를 무작정 바꾸지 않습니다.",
      "en": "Deliberate failure: request quantity two. ① Confirm HTTP 400 in curl output ② read the JSON error ③ find conversion and range checks in TinyServer.java ④ retry with 2 and verify 200. For connection refusal, first check the server message, host and port. Do not randomly edit internal code."
    },
    "exercise": {
      "ko": "예제 코드를 바꾸지 않고 수량 누락·0·10·11·two, 없는 경로, POST 요청의 결과를 표로 만드세요. 먼저 예상 상태와 본문을 적고 실제 응답과 비교합니다. curl -X POST는 이 읽기 전용 장난감 서버 주소에만 사용하세요.",
      "en": "Without editing code, make a table for missing quantity, 0, 10, 11, two, an unknown path and POST. Predict status/body first, then compare actual responses. Use curl -X POST only against this read-only toy server address."
    },
    "hint": {
      "ko": "400은 입력, 404는 경로, 405는 메서드 문제입니다. 10은 허용되는 경계값이고 11은 아닙니다.",
      "en": "400 concerns input, 404 the path, 405 the method. 10 is an accepted boundary; 11 is not."
    },
    "solution": {
      "ko": "수량 누락·0·11·two는 400, 10은 200과 total 12000, 없는 경로는 404, /total에 POST는 405입니다. 성공 여부만 적지 말고 서버가 실제로 응답했는지도 구별합니다.",
      "en": "Missing quantity, 0, 11 and two give 400; 10 gives 200 and total 12000; unknown paths give 404; POST to /total gives 405. Distinguish whether the server responded at all, not only success versus failure."
    },
    "criteria": {
      "ko": "일곱 경우의 상태·본문을 설명하고 연결 실패와 HTTP 오류를 구별하며 URL의 각 부분을 짚을 수 있다.",
      "en": "Explain status/body for all seven cases, distinguish connection failure from HTTP errors, and identify each part of a URL."
    },
    "tradeoffs": {
      "ko": "표준 라이브러리 서버는 HTTP의 구조를 보기 좋지만 라우팅·검증·JSON 처리를 직접 해야 합니다. 작은 예제의 문자열 JSON 조립을 실제 사용자 입력에 그대로 적용하면 안 됩니다. 다음 단계는 프레임워크가 반복 코드를 맡게 합니다.",
      "en": "The standard-library server exposes HTTP mechanics but requires manual routing, validation and JSON handling. Do not generalize this tiny example’s string-built JSON to arbitrary user input. Next, a framework takes over repetitive work."
    },
    "run": "java examples/beginner/http/TinyServer.java"
  },
  {
    "id": "spring",
    "title": {
      "ko": "04 · Spring Boot로 API 나누기",
      "en": "04 · Separate an API with Spring Boot"
    },
    "summary": {
      "ko": "같은 상품 합계 기능을 Controller와 Service로 나눕니다. MySQL·Redis·Kafka 없이 실행하는 독립 예제입니다.",
      "en": "Split the same product-total feature into a Controller and Service. This standalone example needs no MySQL, Redis or Kafka."
    },
    "prerequisites": {
      "ko": "1–3단계의 메서드·객체·예외·HTTP·JSON. 기존 Java 21과 Gradle 캐시가 필요합니다. 아래 --offline 실행이 의존성 누락으로 실패하면 다운로드하지 말고 준비가 필요한 항목으로 기록합니다.",
      "en": "Methods, objects, exceptions, HTTP and JSON from stages 1–3. Existing Java 21 and Gradle caches are needed. If --offline fails due to missing dependencies, record the setup gap rather than downloading automatically."
    },
    "glossary": {
      "ko": "프레임워크: 실행 흐름과 공통 기능을 제공하고 내 코드를 호출하는 기반. Spring Boot: Spring 앱의 설정·시작을 돕는 도구. 애너테이션: @로 붙이는 코드 설명. Controller: HTTP 입출력 경계. Service: 업무 규칙. DI: 필요한 객체를 밖에서 전달받는 방식. Bean: Spring이 생성·관리하는 객체. DTO: 입출력 데이터를 담는 객체.",
      "en": "Framework: a foundation that supplies common behavior and calls your code. Spring Boot: tools for configuring and starting Spring apps. Annotation: metadata beginning with @. Controller: the HTTP boundary. Service: business rules. DI: receiving needed objects from outside. Bean: an object Spring creates/manages. DTO: an object carrying input/output data."
    },
    "concepts": [
      {
        "title": {
          "ko": "시작과 구성",
          "en": "Startup and configuration"
        },
        "body": {
          "ko": "Gradle은 소스를 컴파일하고 필요한 라이브러리를 연결합니다. 아래 -p는 예제의 빌드 폴더를 지정합니다. run은 예제 Java 진입점을 실행합니다. SpringApplication.run이 내장 서버를 시작합니다. @SpringBootApplication이 같은 패키지 아래 구성요소를 찾습니다. application.properties는 포트 18182와 로컬 주소를 지정합니다. 기존 IncidentLens 서비스는 시작하지 않습니다.",
          "en": "Gradle compiles sources and connects libraries. -p selects the example build folder; run executes its Java entry point. SpringApplication.run starts the embedded server. @SpringBootApplication discovers components in its package tree. application.properties selects local address and port 18182. It does not start existing IncidentLens services."
        },
        "code": "./gradlew -p examples/beginner/spring-api --offline run",
        "output": {
          "ko": "시작 성공 후: 127.0.0.1:18182의 HTTP 서버. 시작 로그는 환경마다 다르며 오프라인 의존성 누락은 준비 미완료를 뜻합니다.",
          "en": "After successful startup: HTTP server on 127.0.0.1:18182. Startup logs vary; missing offline dependencies mean setup is incomplete."
        }
      },
      {
        "title": {
          "ko": "Controller, DTO, Service, DI",
          "en": "Controller, DTO, Service and DI"
        },
        "body": {
          "ko": "아래 Controller는 URL을 Java 메서드에 연결합니다. @RequestParam은 쿼리 값을 받아 int로 변환합니다. TotalResult record는 불변 데이터 운반 객체를 간단히 선언하는 Java 문법이며 Spring이 JSON으로 변환합니다. 생성자에 TotalService를 받으므로 Controller가 직접 만들 필요가 없습니다. 이것이 생성자 DI입니다. Service는 HTTP를 모르고 계산 규칙만 압니다.",
          "en": "This Controller connects a URL to a Java method. @RequestParam reads a query value and converts it to int. TotalResult is a Java record, a compact immutable data carrier that Spring converts to JSON. The constructor receives TotalService instead of constructing it; that is constructor DI. The Service knows calculation rules but not HTTP."
        },
        "code": "@RestController\nclass TotalController {\n  private final TotalService service;\n  TotalController(TotalService service) { this.service = service; }\n  record TotalResult(int total) {}\n  @GetMapping(\"/total\")\n  TotalResult total(@RequestParam(\"quantity\") int quantity) {\n    return new TotalResult(service.total(quantity));\n  }\n}",
        "output": {
          "ko": "GET /total?quantity=2 → HTTP 200, {\"total\":2400}",
          "en": "GET /total?quantity=2 → HTTP 200, {\"total\":2400}"
        }
      },
      {
        "title": {
          "ko": "검증과 오류 응답",
          "en": "Validation and error responses"
        },
        "body": {
          "ko": "숫자가 아닌 입력은 HTTP 경계에서 변환에 실패합니다. 숫자여도 0이면 Service의 업무 규칙을 위반합니다. 두 경우를 별도로 테스트합니다. @RestControllerAdvice의 @ExceptionHandler는 예상 오류를 안정적인 400 응답으로 변환합니다. 예상하지 못한 내부 오류를 전부 400으로 숨기지 않습니다. 스택 추적이나 비밀 설정을 응답에 담지 않습니다.",
          "en": "Non-numeric input fails conversion at the HTTP boundary. A numeric zero violates the Service business rule. Test both cases separately. @ExceptionHandler in @RestControllerAdvice converts expected failures into a stable 400 response. Do not hide every unexpected internal failure as 400. Do not return stack traces or secret configuration."
        },
        "code": "@Service\nclass TotalService {\n  int total(int quantity) {\n    if (quantity < 1 || quantity > 10) {\n      throw new IllegalArgumentException(\"quantity must be from 1 to 10\");\n    }\n    return 1200 * quantity;\n  }\n}",
        "output": {
          "ko": "quantity=0 → HTTP 400, {\"error\":\"quantity must be an integer from 1 to 10\"}",
          "en": "quantity=0 → HTTP 400, {\"error\":\"quantity must be an integer from 1 to 10\"}"
        }
      },
      {
        "title": {
          "ko": "테스트 경계",
          "en": "Test boundaries"
        },
        "body": {
          "ko": "Service 테스트는 서버 없이 계산과 경계값을 확인합니다. HTTP 테스트는 경로·변환·상태·JSON을 확인합니다. 예제 test 작업은 MockMvc로 HTTP 경계를 검사하며 실제 포트를 열지 않습니다. MockMvc 통과와 실제 서버를 curl로 확인한 결과는 구분해서 기록합니다.",
          "en": "Service tests check calculations and boundaries without a server. HTTP tests check routes, conversion, status and JSON. The example test task checks the HTTP boundary using MockMvc without opening a port. Record MockMvc results separately from curl checks against a real server."
        },
        "code": "./gradlew -p examples/beginner/spring-api --offline test\ncurl -i \"http://127.0.0.1:18182/total?quantity=2\"",
        "output": {
          "ko": "테스트: 작업 결과는 실제 실행으로 확인합니다. 시작 후 curl: HTTP 200 및 {\"total\":2400}.",
          "en": "Tests: task result depends on your execution. curl after startup: HTTP 200 and {\"total\":2400}."
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "매핑",
          "en": "Mapping"
        },
        "body": {
          "ko": "Spring이 GET /total을 TotalController.total에 연결합니다. 다른 경로는 이 메서드에 도착하지 않습니다.",
          "en": "Spring maps GET /total to TotalController.total. Other routes do not reach this method."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "변환",
          "en": "Conversion"
        },
        "body": {
          "ko": "quantity 문자열을 int로 바꿉니다. 누락이나 잘못된 형식은 400입니다.",
          "en": "Convert the quantity string to int. Missing or malformed input gives 400."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "업무 규칙",
          "en": "Business rule"
        },
        "body": {
          "ko": "주입받은 Service가 범위를 검증하고 합계를 계산합니다. DB는 필요 없습니다.",
          "en": "The injected Service validates the range and computes the total. No database is needed."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "응답",
          "en": "Response"
        },
        "body": {
          "ko": "결과 record는 JSON으로 변환됩니다. 예상 예외는 Advice가 400 오류 객체로 바꿉니다.",
          "en": "The result record becomes JSON. Advice converts expected exceptions into a 400 error object."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "Controller에서 정상 숫자 0을 받으면 변환 성공이므로 요청도 성공해야 할까요?",
      "en": "If the Controller converts 0 successfully, must the request succeed?"
    },
    "answer": {
      "ko": "아니요. 형식 변환과 업무 검증은 다릅니다. 정수 0은 수량 범위 규칙을 위반하므로 400이어야 합니다.",
      "en": "No. Format conversion differs from business validation. Integer zero violates the quantity rule and should give 400."
    },
    "guided": {
      "ko": "1. examples/beginner/spring-api의 파일들을 읽어 시작·Controller·Service·Advice 위치를 찾습니다. 2. 여유 공간과 기존 캐시가 준비됐을 때만 offline test를 실행합니다. 3. 사용하지 않는 18182 포트에서 run 후 curl로 2와 0을 요청합니다. 4. 테스트 결과와 실제 HTTP 결과를 별도로 기록합니다. 5. 자신이 시작한 예제만 Ctrl+C로 종료합니다.",
      "en": "1. Locate startup, Controller, Service and Advice in examples/beginner/spring-api. 2. Run offline test only when disk space and existing caches are ready. 3. With port 18182 unused, run the example and request 2 and 0 with curl. 4. Record tests separately from real HTTP results. 5. Stop only your example with Ctrl+C."
    },
    "failure": {
      "ko": "의도적 오류: /total?quantity=two 요청. ① HTTP 상태·본문 확인 ② Controller의 int 변환 경계 확인 ③ Advice 처리 확인 ④ 2로 재검증. 애플리케이션 자체가 시작되지 않으면 먼저 로그의 첫 원인을 읽으세요. 포트 충돌, 누락된 캐시, Bean 생성 실패는 서로 다른 문제입니다.",
      "en": "Deliberate failure: request /total?quantity=two. ① Inspect status/body ② locate the Controller int-conversion boundary ③ check Advice handling ④ retry with 2. If the app never starts, read the first underlying cause in startup logs. Port conflicts, missing cached dependencies and Bean creation failures are different problems."
    },
    "exercise": {
      "ko": "별도 연습 복사본에서 /total에 선택 쿼리 price를 추가하고 기본값 1200을 유지하세요. Service에 가격을 전달하고 음수 가격은 거절하세요. (500,3)=1500, 기본 가격·수량 2=2400, 가격 -1=400, 수량 two=400을 테스트하세요. 기존 서비스를 수정하는 대신 이 작은 예제에서 연습합니다.",
      "en": "In a separate practice copy, add optional query price to /total with default 1200. Pass it to the Service and reject negative prices. Test (500,3)=1500, default price with quantity 2=2400, price -1=400, and quantity two=400. Practice in this small example instead of modifying existing services."
    },
    "hint": {
      "ko": "@RequestParam(value=\"price\", defaultValue=\"1200\") int price로 받습니다. HTTP 코드인 Controller와 순수 계산인 Service를 동시에 확인하되 역할은 섞지 않습니다.",
      "en": "Use @RequestParam(value=\"price\", defaultValue=\"1200\") int price. Check both the HTTP Controller and pure calculation Service while keeping their roles separate."
    },
    "solution": {
      "ko": "Controller가 price와 quantity를 service.total(price, quantity)에 전달합니다. Service는 price < 0 또는 수량 범위 밖이면 IllegalArgumentException, 아니면 곱을 반환합니다. 기존 Advice가 400으로 바꿉니다. 기본값 누락 요청과 명시 값 요청을 모두 검사해야 기존 계약을 보존했는지 알 수 있습니다.",
      "en": "Pass price and quantity from the Controller to service.total(price, quantity). The Service throws IllegalArgumentException for a negative price or invalid quantity; otherwise it returns their product. Existing Advice maps that failure to 400. Test both omitted and explicit price to verify the old contract remains intact."
    },
    "criteria": {
      "ko": "Controller·Service·DI의 역할을 설명하고 기존 기본 동작을 보존하는 변경과 정상·실패 HTTP 테스트를 독립적으로 만들 수 있다.",
      "en": "Explain Controller, Service and DI, and independently implement a change preserving defaults with success/failure HTTP tests."
    },
    "tradeoffs": {
      "ko": "Spring은 반복 코드를 줄이지만 설정과 의존성 비용이 있습니다. 작은 계산 도구에는 2단계의 단일 파일이면 충분합니다. 데이터 저장이 필요해진 뒤에만 다음 단계에서 MySQL을 도입합니다.",
      "en": "Spring reduces repetitive code but adds configuration and dependencies. A small calculator may need only the stage-2 single file. Introduce MySQL in the next stage only when persistence is needed."
    },
    "run": "./gradlew -p examples/beginner/spring-api --offline test"
  },
  {
    "prerequisites": {
      "ko": "1–4단계의 변수·객체·HTTP. Python 3은 제공된 실행 도우미를 시작하는 데만 쓰며 Python 코드를 작성할 필요는 없습니다. 도우미는 Java 21과 기존 H2 JAR만 사용하고 다운로드하지 않습니다.",
      "en": "Stages 1–4: variables, objects and HTTP. Python 3 only launches the supplied runner; you need not write Python. It uses Java 21 and the existing H2 jar without downloading anything."
    },
    "scope": {
      "ko": "실제 SQL 실행: 독립 H2 파일 DB의 CRUD·외래 키·닫기/다시 열기. MySQL 서버·실제 상품 DB에는 연결하지 않습니다. H2 통과가 MySQL의 잠금·문법·실행 계획 검증을 뜻하지 않습니다.",
      "en": "Actual SQL: CRUD, foreign keys and file close/reopen in an isolated H2 database. No MySQL server or real product database is contacted. Passing H2 does not validate MySQL locking, dialect or query plans."
    },
    "glossary": {
      "ko": "영속성: 프로그램 종료 뒤에도 저장 내용이 남는 성질. 테이블: 같은 모양의 행을 모은 구조. 행/열: 한 항목/그 속성. 기본 키: 행을 구별하는 유일한 값. 외래 키: 다른 행과의 관계를 지키는 제약. NULL: 값 없음. SQL: 관계형 DB에 작업을 요청하는 언어. CRUD: 생성·조회·수정·삭제.",
      "en": "Persistence: retaining stored data beyond program execution. Table: rows sharing a structure. Row/column: an item/its property. Primary key: a unique row identifier. Foreign key: a constraint preserving a relationship. NULL: missing value. SQL: a language for relational database operations. CRUD: create, read, update, delete."
    },
    "concepts": [
      {
        "title": {
          "ko": "왜 메모리 다음에 DB인가",
          "en": "Why a database follows memory"
        },
        "body": {
          "ko": "List에 담은 상품은 프로세스가 사라지면 잃습니다. 파일은 저장할 수 있지만 중복 ID, 관계, 동시 수정 규칙을 직접 구현해야 합니다. MySQL은 별도 서버 프로세스가 여러 연결의 SQL 요청을 처리하는 관계형 DB입니다. 이 수업은 운영 서버 대신 앱 안에서 실행되는 H2로 같은 관계형 기초를 연습합니다. JDBC는 Java 코드와 DB 드라이버 사이의 표준 인터페이스입니다.",
          "en": "A product in a List is lost with its process. Files can persist data, but you must implement duplicate-ID, relationship and concurrent-update rules yourself. MySQL is a relational database server handling SQL over multiple connections. We practice relational basics with embedded H2 instead of an operating server. JDBC is Java’s standard interface to a database driver."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "상품과 주문을 표로 설계하기",
          "en": "Model products and purchases as tables"
        },
        "body": {
          "ko": "상품 이름을 주문마다 복사하는 대신 product_id로 연결합니다. 이름은 바뀔 수 있으므로 식별 키로 쓰지 않습니다. PRIMARY KEY는 중복·NULL을 막고, UNIQUE는 업무상 중복을 제한하며, NOT NULL과 CHECK는 잘못된 값이 다른 클라이언트에서 들어와도 거절합니다. 주문 시점 가격을 보존하려면 현재 상품 가격을 매번 조회하는 대신 주문에 가격 스냅샷을 저장해야 합니다.",
          "en": "Relate purchases through product_id instead of copying product names everywhere. Names can change, so they are poor identifiers. PRIMARY KEY prevents duplicate/null identity, UNIQUE restricts business duplicates, and NOT NULL/CHECK reject invalid values even from another client. To preserve purchase-time pricing, store a price snapshot in the purchase rather than always reading the current product price."
        },
        "code": "CREATE TABLE product(\n  id INT PRIMARY KEY, name VARCHAR(80) NOT NULL UNIQUE,\n  price INT NOT NULL CHECK(price>=0)\n);\nCREATE TABLE purchase(\n  id INT PRIMARY KEY, product_id INT NOT NULL REFERENCES product(id),\n  quantity INT CHECK(quantity>0)\n);",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "CRUD와 조인",
          "en": "CRUD and joins"
        },
        "body": {
          "ko": "INSERT는 행 추가, SELECT는 조회, UPDATE와 DELETE는 변경입니다. WHERE를 빼면 모든 행에 적용될 수 있으므로 먼저 같은 WHERE로 SELECT해서 대상을 확인합니다. JOIN은 외래 키 조건으로 두 표를 연결해 필요한 결과를 만듭니다. SELECT * 대신 필요한 열을 명시하면 계약을 읽기 쉽습니다. 아래 SQL은 제공된 임시 DB에서만 사용합니다.",
          "en": "INSERT adds rows, SELECT reads, UPDATE and DELETE change them. Omitting WHERE can affect every row; first SELECT with the same WHERE to confirm the target. JOIN connects tables using a relationship condition. Naming required columns instead of SELECT * makes the contract clearer. Use this SQL only in the supplied temporary database."
        },
        "code": "INSERT INTO product VALUES(1,'Notebook',1200);\nUPDATE product SET price=1500 WHERE id=1;\nINSERT INTO purchase VALUES(10,1,2);\nSELECT p.name,p.price*o.quantity AS total\nFROM product p JOIN purchase o ON o.product_id=p.id;",
        "output": {
          "ko": "Notebook total=3000",
          "en": "Notebook total=3000"
        }
      },
      {
        "title": {
          "ko": "매개변수와 리소스 수명",
          "en": "Parameters and resource lifetime"
        },
        "body": {
          "ko": "사용자 문자열을 SQL에 이어 붙이지 않습니다. PreparedStatement의 ?는 값 자리이며 드라이버가 값과 SQL 구조를 분리합니다. try-with-resources는 성공·실패 모두 연결·결과를 닫습니다. 실행 도우미는 고유한 임시 폴더에 작은 H2 파일을 만들고 연결을 닫았다가 다시 열어 1500이 남았는지 검사합니다. 기존 파일은 삭제하거나 덮어쓰지 않습니다.",
          "en": "Do not concatenate user text into SQL. A PreparedStatement ? is a value placeholder; the driver separates values from SQL structure. try-with-resources closes connections/results on success and failure. The runner creates a small H2 file in a unique temporary folder, closes it and reopens it to verify price 1500 persisted. Existing files are not deleted or overwritten."
        },
        "code": "try (PreparedStatement q = db.prepareStatement(\"SELECT name FROM product WHERE id=?\")) {\n  q.setInt(1, 1);\n  try (ResultSet rows = q.executeQuery()) {\n    while (rows.next()) System.out.println(rows.getString(\"name\"));\n  }\n}",
        "output": {
          "ko": "Notebook",
          "en": "Notebook"
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "요청 값",
          "en": "Request value"
        },
        "body": {
          "ko": "상품 ID를 정수로 검증합니다. SQL문 자체를 클라이언트로부터 받지 않습니다.",
          "en": "Validate the product ID as an integer; never accept the SQL statement itself from the client."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "쿼리",
          "en": "Query"
        },
        "body": {
          "ko": "JDBC가 SQL과 값을 드라이버에 전달합니다.",
          "en": "JDBC passes the SQL and bound values to the driver."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "제약·저장",
          "en": "Constraints and storage"
        },
        "body": {
          "ko": "DB가 키와 제약을 확인하고 행을 저장합니다. 위반은 정상 성공이 아닙니다.",
          "en": "The database enforces keys/constraints and stores rows. A violation is not success."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "결과",
          "en": "Result"
        },
        "body": {
          "ko": "행을 DTO로 읽어 응답합니다. 연결은 응답 후에도 무한히 보유하지 않습니다.",
          "en": "Read rows into a DTO and respond; do not hold connections indefinitely."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "상품 ID 99가 없는데 purchase.product_id=99를 저장하면 무엇이 일어나야 할까요?",
      "en": "What should happen if a purchase references product 99, which does not exist?"
    },
    "answer": {
      "ko": "외래 키 위반으로 거절해야 합니다. 응답 성공을 먼저 보내거나 존재하지 않는 상품을 임의 생성하면 관계 오류를 숨깁니다.",
      "en": "Reject it as a foreign-key violation. Sending success first or inventing a product would hide the relationship error."
    },
    "guided": {
      "ko": "1. Stage05Persistence.java의 CREATE·INSERT·UPDATE·JOIN·DELETE를 찾습니다. 2. 실행해 total=3000을 확인합니다. 3. product_id=99 실패가 예상된 실패로 처리되는지 읽습니다. 4. 연결 재개 후 가격 1500 검증 위치를 찾습니다. 5. 이 결과가 MySQL 실행 결과가 아님을 기록합니다.",
      "en": "1. Locate CREATE/INSERT/UPDATE/JOIN/DELETE in Stage05Persistence.java. 2. Run it and verify total=3000. 3. Inspect how product_id=99 is treated as an expected failure. 4. Find the price=1500 check after reopening. 5. Record that this is not a MySQL execution result."
    },
    "failure": {
      "ko": "의도적 오류는 존재하지 않는 외래 키입니다. 진단: SQLState 23 계열의 제약 오류 확인 → product에서 ID 99 조회 → 입력 ID와 관계 확인 → 존재하는 ID 1로 다시 시도. 가격 -1은 CHECK, 중복 이름은 UNIQUE 문제입니다. 세 오류를 같은 “DB가 꺼짐”으로 처리하지 마세요.",
      "en": "The deliberate error is a missing foreign key. Diagnose: inspect SQLState class 23 → look up product 99 → check the input and relationship → retry with existing ID 1. Price -1 violates CHECK; a duplicate name violates UNIQUE. Do not classify all three as “database down.”"
    },
    "exercise": {
      "ko": "독립 연습: 다른 ID의 Pen(500)을 추가하고 수량 3 주문을 저장하세요. 두 상품 총액이 각각 3000·1500인지 조인으로 확인하고, 음수 가격과 중복 ID도 거절되는지 검사하세요. 현재 가격 변경이 과거 주문 합계에 영향을 주는 문제를 설명하고 가격 스냅샷 열 설계를 제안하세요.",
      "en": "Independently add Pen(500) under another ID and purchase quantity 3. Verify joined totals 3000 and 1500, and rejection of negative price/duplicate ID. Explain how changing current prices affects old purchase totals and propose a price-snapshot column."
    },
    "hint": {
      "ko": "새 행의 ID와 외래 키를 함께 확인합니다. 스냅샷은 주문 생성 시의 단가이며 product.price를 덮어쓰는 것이 아닙니다.",
      "en": "Check the new ID and foreign key together. A snapshot is the unit price at purchase creation, not an overwrite of product.price."
    },
    "solution": {
      "ko": "product(2,Pen,500)과 purchase(20,2,3)를 넣고 JOIN 결과를 확인합니다. purchase.unit_price에 생성 시 단가를 넣으면 total=unit_price*quantity가 현재 상품 가격과 독립적입니다. 제약 실패 전후 행 수가 변하지 않았는지도 검사합니다.",
      "en": "Insert product(2,Pen,500) and purchase(20,2,3), then inspect the JOIN. Capturing unit_price at purchase time makes total=unit_price*quantity independent of current price. Also verify failed inserts did not change row counts."
    },
    "criteria": {
      "ko": "CRUD·관계·제약을 직접 실행해 결과를 기록하고, 메모리/H2/MySQL의 차이와 가격 스냅샷 이유를 설명한다.",
      "en": "Execute CRUD/relationships/constraints, record results, and explain memory versus H2 versus MySQL and price snapshots."
    },
    "tradeoffs": {
      "ko": "관계형 제약은 일관성을 돕지만 설계·마이그레이션 비용이 있습니다. 작은 읽기 전용 설정은 파일이 더 간단할 수 있습니다. H2의 편의성을 운영 MySQL 호환성 보장으로 해석하지 않습니다.",
      "en": "Relational constraints help consistency but add schema/migration work. A small read-only configuration may be simpler as a file. H2 convenience is not a guarantee of production MySQL compatibility."
    },
    "id": "persistence",
    "title": {
      "ko": "05 · 저장과 MySQL",
      "en": "05 · Persistence and MySQL"
    },
    "summary": {
      "ko": "표·행·키·관계·제약·SQL·CRUD. 재시작 후에도 상품을 보존하는 작은 저장 계층.",
      "en": "Tables, rows, keys, relations, constraints, SQL and CRUD. Add a small storage layer preserving products across restarts."
    },
    "run": "python3 examples/beginner/advanced/run.py 5",
    "exampleFiles": [
      "examples/beginner/advanced/Stage05Persistence.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "5단계의 SQL·키·JDBC, 4단계의 Spring·DI. JPA 예제도 기존 캐시만 사용하며 H2 테스트 DB가 각 테스트에서 격리됩니다.",
      "en": "Stage 5 SQL/keys/JDBC and stage 4 Spring/DI. The JPA example uses existing caches and an isolated H2 test database."
    },
    "scope": {
      "ko": "실제 검증: JDBC 롤백·커밋, Hibernate가 생성한 SQL 수, fetch join, 페이지 결과. MySQL 격리 수준과 운영 쿼리 성능은 별도 검증이 필요합니다.",
      "en": "Actual checks: JDBC rollback/commit, Hibernate-generated SQL counts, fetch joins and page results. MySQL isolation and production query performance still need separate validation."
    },
    "glossary": {
      "ko": "트랜잭션: 함께 확정하거나 취소할 작업 묶음. 커밋/롤백: 확정/취소. 원자성: 일부만 적용되지 않음. JDBC: SQL 실행을 위한 Java 인터페이스. JPA: 객체와 관계형 저장을 연결하는 규약. Hibernate: JPA 구현체. 영속성 컨텍스트: 관리 중인 엔티티 모음. 지연 로딩: 필요할 때 관계를 조회. N+1: 목록 1회 뒤 관계 N회 조회.",
      "en": "Transaction: work committed or rolled back together. Atomicity: no partial application. JDBC: Java’s SQL execution interface. JPA: a specification mapping objects to relational persistence. Hibernate: a JPA implementation. Persistence context: managed entities. Lazy loading: fetching a relationship when needed. N+1: one list query followed by N relationship queries."
    },
    "concepts": [
      {
        "title": {
          "ko": "재고와 주문을 함께 확정하기",
          "en": "Commit stock and purchase together"
        },
        "body": {
          "ko": "재고만 줄고 주문 저장이 실패하면 상품이 사라진 것처럼 됩니다. 같은 DB 연결에서 자동 커밋을 끄고 두 쓰기를 수행한 뒤 commit합니다. 하나라도 실패하면 rollback합니다. 트랜잭션이 외부 HTTP나 Kafka 작업까지 자동으로 되돌리지는 않습니다. 길게 열린 트랜잭션은 연결과 잠금을 오래 잡으므로 사용자 입력을 기다리는 곳까지 넓히지 않습니다.",
          "en": "If stock decreases but purchase storage fails, inventory effectively disappears. Disable auto-commit on one connection, perform both writes, then commit; roll back on failure. A database transaction does not automatically undo external HTTP or Kafka work. Long transactions hold connections/locks, so do not extend one across waiting for user input."
        },
        "code": "db.setAutoCommit(false);\ntry {\n  updateStock(db);\n  insertPurchase(db);\n  db.commit();\n} catch (SQLException error) {\n  db.rollback();\n  throw error;\n}",
        "output": {
          "ko": "실행 예제: 실패 후 stock=2, 성공 후 stock=1",
          "en": "Executable example: stock=2 after failure; stock=1 after commit"
        }
      },
      {
        "title": {
          "ko": "JDBC에서 JPA로",
          "en": "From JDBC to JPA"
        },
        "body": {
          "ko": "JDBC는 SQL을 직접 제어합니다. JPA는 @Entity 객체를 관리하고 조회·변경에서 SQL을 생성합니다. @Id는 식별자, @ManyToOne은 여러 상품이 하나의 분류를 참조하는 관계입니다. LAZY라고 썼다고 SQL이 사라지는 것은 아닙니다. 관리 중인 객체와 분리된 객체의 수명도 중요합니다. @Transactional은 Spring이 호출 경계를 감싸는 방식이므로 같은 객체 내부 호출에 무조건 적용된다고 가정하지 않습니다.",
          "en": "JDBC gives explicit SQL control. JPA manages @Entity objects and generates SQL for reads/changes. @Id identifies an entity; @ManyToOne lets many products reference one category. LAZY does not eliminate SQL. Managed versus detached object lifetimes matter too. Spring wraps @Transactional call boundaries; do not assume an internal call on the same object always receives that interception."
        },
        "code": "@Entity\nclass Product {\n  @Id @GeneratedValue Long id;\n  String name;\n  @ManyToOne(fetch=FetchType.LAZY) Category category;\n}",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "N+1을 쿼리 수로 확인하기",
          "en": "Observe N+1 through query counts"
        },
        "body": {
          "ko": "서로 다른 분류를 가진 상품 3개를 조회하고 각각 category.getName()을 읽으면 목록 1회와 분류 3회가 생길 수 있습니다. 준비 단계의 1차 캐시를 em.clear()로 비우고 통계를 초기화해야 실제 추가 조회가 보입니다. 예제는 Hibernate 통계로 4회를 확인한 뒤 필요한 관계를 fetch join한 조회가 1회인지 검사합니다. 모든 관계를 EAGER로 바꾸는 만능 해법은 아닙니다.",
          "en": "Reading category.getName() for three products with different categories can issue one product query plus three category queries. Clear setup entities with em.clear() and reset statistics to expose additional queries. The example asserts four statements, then one with a targeted fetch join. Making every relationship EAGER is not a universal solution."
        },
        "code": "@Query(\"select p from Product p join fetch p.category order by p.id\")\nList<Product> withCategories();\n// Separate isolated test project:\n// ./gradlew -p examples/beginner/data-jpa --offline test",
        "output": {
          "ko": "검증 목표: 지연 조회 4회, fetch join 1회",
          "en": "Check: lazy traversal 4 statements, fetch join 1 statement"
        }
      },
      {
        "title": {
          "ko": "페이지는 정렬 계약이다",
          "en": "Pagination includes an ordering contract"
        },
        "body": {
          "ko": "한 번에 모든 행을 반환하면 응답과 메모리가 커집니다. PageRequest.of(0,2,Sort.by(\"id\"))는 0번째 페이지의 최대 2행을 요청합니다. 유일하고 안정적인 정렬이 없으면 페이지 사이에 중복·누락이 생기기 쉽습니다. Page의 전체 개수는 추가 count 쿼리를 유발할 수 있습니다. 깊은 OFFSET이나 일대다 컬렉션 fetch join과 페이지 조합은 별도 설계가 필요합니다.",
          "en": "Returning all rows increases memory and payload size. PageRequest.of(0,2,Sort.by(\"id\")) requests at most two rows from page zero. Without stable unique ordering, page boundaries can duplicate or miss items. A Page total may require another count query. Deep OFFSET or collection fetch joins combined with pagination need additional design."
        },
        "code": "var first = products.findAll(PageRequest.of(0,2,Sort.by(\"id\")));\nvar next = products.findAll(PageRequest.of(1,2,Sort.by(\"id\")));",
        "output": {
          "ko": "첫 페이지 2행, 다음 1행, 전체 3행",
          "en": "First page 2 rows, next page 1 row, total 3 rows"
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "서비스 경계",
          "en": "Service boundary"
        },
        "body": {
          "ko": "함께 성공해야 하는 쓰기를 정합니다.",
          "en": "Choose writes that must succeed together."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "DB 작업",
          "en": "Database work"
        },
        "body": {
          "ko": "한 연결/트랜잭션에서 재고 수정과 주문 삽입을 실행합니다.",
          "en": "Update stock and insert the purchase in one connection/transaction."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "실패 또는 확정",
          "en": "Failure or commit"
        },
        "body": {
          "ko": "제약 실패는 롤백, 모든 조건 성공은 커밋입니다.",
          "en": "A constraint failure rolls back; all conditions succeeding permits commit."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "조회·관측",
          "en": "Read and observe"
        },
        "body": {
          "ko": "결과 행과 생성 SQL 수를 따로 검증합니다.",
          "en": "Verify result rows separately from generated SQL counts."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "재고 UPDATE 다음 주문 INSERT가 실패하면 앞선 UPDATE도 항상 자동 취소될까요?",
      "en": "If the purchase INSERT fails after a stock UPDATE, is the UPDATE always automatically undone?"
    },
    "answer": {
      "ko": "아니요. 두 문장이 자동 커밋으로 각각 확정됐다면 앞선 변경은 남습니다. 같은 트랜잭션에 넣고 오류 시 롤백해야 합니다.",
      "en": "No. If each statement committed separately, the earlier change remains. They need one transaction and rollback on failure."
    },
    "guided": {
      "ko": "1. 6단계 runner로 stock=2→실패→2, 성공→1을 확인합니다. 2. data-jpa 프로젝트에서 offline test를 실행합니다. 3. DataLessonTest의 SQL 수 4/1, 페이지 2/1 검사를 읽습니다. 4. SQL 로그와 객체 접근 줄을 연결해 설명합니다.",
      "en": "1. Run stage 6 and verify stock 2→failure→2, then success→1. 2. Run the data-jpa offline tests. 3. Read SQL-count 4/1 and page-size 2/1 checks in DataLessonTest. 4. Relate SQL logs to object-access lines."
    },
    "failure": {
      "ko": "의도적 오류는 quantity=0 주문입니다. 제약 오류 → 롤백 호출 확인 → stock과 purchase 행 수 재조회 순으로 진단합니다. N+1은 응답 성공 여부로 발견되지 않습니다. 반복되는 category 조회와 요청당 SQL 수를 봅니다. 캐시 때문에 재현이 안 되면 새 영속성 컨텍스트인지 확인합니다.",
      "en": "The deliberate failure is quantity=0. Diagnose the constraint error → verify rollback → requery stock and purchase count. N+1 does not necessarily fail a response; inspect repeated category queries and SQL per request. If caching hides it, check that the persistence context is fresh."
    },
    "exercise": {
      "ko": "독립 연습: 분류 4개와 상품 4개로 바꿔 지연 조회 5회/fetch join 1회를 검증하세요. 페이지 크기 3에서 3/1행을 확인하세요. 별도로 주문 실패 뒤 재고가 보존된다는 회귀 테스트를 작성하고 트랜잭션 경계를 설명하세요.",
      "en": "Independently use four categories/products and verify five lazy statements versus one fetch-join statement. With page size three, verify 3/1 rows. Add a regression asserting failed purchase leaves stock intact, and explain the transaction boundary."
    },
    "hint": {
      "ko": "상품 수만 늘리고 분류를 공유하면 추가 조회 수는 같은 식으로 늘지 않을 수 있습니다. SQL 수와 데이터 구성을 함께 적으세요.",
      "en": "Adding products that share categories may not increase queries the same way. Record both query counts and data relationships."
    },
    "solution": {
      "ko": "각 상품에 다른 분류를 지정하고 flush/clear 후 목록+관계 접근을 실행합니다. 비교 조회는 같은 데이터와 새 컨텍스트를 사용합니다. 실패 테스트는 예외 발생만이 아니라 재고와 주문 수의 불변성을 확인해야 합니다.",
      "en": "Give each product a distinct category, flush/clear, then traverse the list and relationships. Compare with identical data and a fresh context. The failure test must assert unchanged stock/order count, not merely that an exception occurred."
    },
    "criteria": {
      "ko": "실제 SQL 수와 페이지 결과를 재현하고, 롤백·캐시·지연 로딩을 구별해 설명한다.",
      "en": "Reproduce actual SQL counts/page results and distinguish rollback, caching and lazy loading."
    },
    "tradeoffs": {
      "ko": "JPA는 반복 매핑을 줄이지만 SQL 관찰을 대신하지 않습니다. 복잡한 집계에는 명시적 SQL이 더 명확할 수 있습니다. H2의 쿼리 수 실습과 MySQL 운영 성능 측정은 별개입니다.",
      "en": "JPA reduces mapping repetition but does not replace SQL inspection. Explicit SQL can be clearer for complex aggregation. H2 query-count practice and MySQL production performance are separate."
    },
    "sources": [
      {
        "label": {
          "ko": "Spring Data JPA 조회 문서",
          "en": "Spring Data JPA query reference"
        },
        "url": "https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html"
      }
    ],
    "id": "transactions",
    "title": {
      "ko": "06 · 트랜잭션과 데이터 접근",
      "en": "06 · Transactions and data access"
    },
    "summary": {
      "ko": "원자성·JDBC·JPA·생성 SQL·N+1·페이지네이션. 실제 SQL과 결과를 비교하는 연습.",
      "en": "Atomicity, JDBC, JPA, generated SQL, N+1 and pagination. Compare executed SQL with results."
    },
    "run": "python3 examples/beginner/advanced/run.py 6",
    "exampleFiles": [
      "examples/beginner/advanced/Stage06Transactions.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "HTTP의 헤더·쿠키 개념을 여기서 확장합니다. 4단계의 오류 응답과 5단계의 매개변수 SQL을 먼저 이해하세요. 예제는 학습용 가짜 계정만 사용합니다.",
      "en": "We extend HTTP headers into cookie concepts here. First understand stage-4 error responses and stage-5 parameterized SQL. The example uses fictional teaching accounts only."
    },
    "scope": {
      "ko": "실제 실행은 비밀번호 파생·비교와 H2 바인딩입니다. 소유자/CSRF 검사는 순수 정책 모형이며 브라우저 로그인·세션 서버·HTTPS·CORS 구현이 아닙니다.",
      "en": "Actual execution covers password derivation/comparison and H2 parameter binding. Owner/CSRF checks are pure policy models, not browser login, a session server, HTTPS or CORS implementation."
    },
    "glossary": {
      "ko": "인증: 누구인지 확인. 인가: 그 사람이 이 자원에 무엇을 할 수 있는지 확인. 세션: 서버가 보관하는 로그인 상태. 쿠키: 브라우저가 정해진 범위로 보내는 값. 토큰: 권한 또는 세션을 나타내는 값. 솔트: 비밀번호별 무작위 값. 해싱: 원문 복원 대신 검증용 값을 계산. XSS: 신뢰하지 않는 입력이 브라우저 코드로 실행됨. CSRF: 다른 사이트가 사용자 브라우저의 자동 자격을 악용해 요청함. CORS: 브라우저의 교차 출처 응답 접근 정책.",
      "en": "Authentication: establish identity. Authorization: decide permitted actions on a resource. Session: server-side login state. Cookie: a value the browser sends within a scope. Token: a value representing a session or authority. Salt: per-password random data. Hashing: deriving a verification value rather than reversible plaintext. XSS: untrusted input executes as browser code. CSRF: another site abuses automatically attached browser credentials. CORS: browser policy for cross-origin response access."
    },
    "concepts": [
      {
        "title": {
          "ko": "로그인 성공과 소유권은 다르다",
          "en": "Login is not ownership"
        },
        "body": {
          "ko": "alice로 로그인해도 bob의 주문을 볼 수 없어야 합니다. 클라이언트가 보낸 ownerId를 그대로 믿지 않고 검증된 사용자 ID와 저장된 소유자를 비교합니다. 서버의 모든 민감한 조회·변경 경계에서 확인해야 하며 버튼을 숨기는 것만으로는 막지 못합니다. 인증이 없으면 보통 401, 인증된 사용자의 권한 부족은 보통 403으로 구별합니다.",
          "en": "Logging in as alice must not grant access to bob’s orders. Compare verified identity with the stored owner rather than trusting a client-supplied ownerId. Check every sensitive server read/write boundary; hiding a button is insufficient. Missing authentication is commonly 401; insufficient permission for an authenticated user is commonly 403."
        },
        "code": "static boolean mayRead(Principal user, String owner) {\n  return user != null && (user.admin() || user.id().equals(owner));\n}",
        "output": {
          "ko": "모형: alice→alice 허용, bob→alice 거절",
          "en": "Model: alice→alice allowed, bob→alice denied"
        }
      },
      {
        "title": {
          "ko": "세션, 쿠키, 토큰의 이동",
          "en": "How sessions, cookies and tokens move"
        },
        "body": {
          "ko": "로그인 확인 뒤 서버가 추측하기 어려운 세션 ID를 발급하고 브라우저는 쿠키로 보낼 수 있습니다. Secure는 HTTPS 전송, HttpOnly는 스크립트의 쿠키 읽기 제한, SameSite는 교차 사이트 전송 정책에 관여합니다. 모두 만능 방어는 아닙니다. 로그아웃·만료·재발급·세션 고정 방지 설계가 필요합니다. JWT는 단지 문자열을 디코딩했다고 검증된 것이 아니며 서명·발급자·대상·만료 확인이 필요합니다.",
          "en": "After authenticating, a server can issue an unguessable session ID that the browser sends in a cookie. Secure concerns HTTPS transport, HttpOnly limits script access to the cookie, and SameSite affects cross-site sending. None is a complete defense. Design logout, expiry, rotation and session-fixation prevention. Decoding a JWT does not validate it; signature, issuer, audience and expiry checks are still needed."
        },
        "code": "Set-Cookie: session=<random-id>; Secure; HttpOnly; SameSite=Lax; Path=/",
        "output": {
          "ko": "설명용 헤더: 예제 서버에 로그인 기능을 추가한 것은 아닙니다.",
          "en": "Illustrative header: login was not added to the example server."
        }
      },
      {
        "title": {
          "ko": "비밀번호 저장과 비교",
          "en": "Password storage and comparison"
        },
        "body": {
          "ko": "평문·빠른 SHA-256 한 번으로 비밀번호를 저장하지 않습니다. 전용 비밀번호 해시와 무작위 솔트, 조정 가능한 작업 비용을 사용합니다. 예제는 JDK에 있는 PBKDF2-HMAC-SHA256을 실행해 같은 입력·솔트는 검증되고 틀린 입력은 실패하는지 확인합니다. 운영 선택에서는 Argon2id 등 검토된 라이브러리와 현재 지침, 비용 측정·재해시 정책을 확인해야 합니다. 이 예제의 한 가지 숫자를 모든 서비스의 정책으로 복사하지 마세요.",
          "en": "Do not store plaintext or a single fast SHA-256 password hash. Use a dedicated password hash, random salt and tunable work factor. The example runs JDK PBKDF2-HMAC-SHA256, verifying correct input with the same salt and rejecting wrong input. For production, assess reviewed libraries such as Argon2id implementations, current guidance, measured cost and rehash policy. Do not copy one example number as a universal policy."
        },
        "code": "byte[] salt = new byte[16];\nnew SecureRandom().nextBytes(salt);\n// The complete example derives PBKDF2 and compares with MessageDigest.isEqual.\n// Never log the password, hash or session token.",
        "output": {
          "ko": "정답 검증 성공, 잘못된 비밀번호 검증 실패",
          "en": "Correct password accepted; wrong password rejected"
        }
      },
      {
        "title": {
          "ko": "서로 다른 웹 공격의 경계",
          "en": "Different web attacks have different boundaries"
        },
        "body": {
          "ko": "SQL 주입은 값을 SQL 구조로 취급할 때 생기므로 매개변수를 바인딩합니다. XSS에는 렌더링 문맥에 맞는 출력 인코딩과 안전한 템플릿을 사용합니다. 쿠키 인증의 변경 요청은 CSRF 토큰·출처 확인 등의 적절한 방어가 필요합니다. CORS 허용 목록은 인증이나 CSRF 방어를 대체하지 않으며, 브라우저 밖 클라이언트는 같은 정책으로 차단되지 않습니다. 예제 CSRF 함수는 원리를 보는 모형이고 전체 보안 미들웨어가 아닙니다.",
          "en": "SQL injection occurs when values become SQL structure, so bind parameters. For XSS, use context-appropriate output encoding and safe templates. State-changing cookie-authenticated requests need suitable CSRF defenses such as tokens and origin checks. A CORS allowlist does not replace authentication or CSRF protection; non-browser clients are not blocked by the same policy. The example CSRF function illustrates a principle, not complete security middleware."
        },
        "code": "query.setString(1, \"alice' OR '1'='1\");\n// Bound as one literal name, not executable SQL.",
        "output": {
          "ko": "반환 계정 0개",
          "en": "0 accounts returned"
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "인증",
          "en": "Authenticate"
        },
        "body": {
          "ko": "자격을 검증하고 서버가 신뢰하는 사용자 ID를 얻습니다.",
          "en": "Validate credentials and obtain a server-trusted identity."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "요청 방어",
          "en": "Protect request"
        },
        "body": {
          "ko": "쿠키·토큰 범위와 변경 요청의 CSRF 조건을 확인합니다.",
          "en": "Check cookie/token scope and CSRF conditions for state changes."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "인가",
          "en": "Authorize"
        },
        "body": {
          "ko": "저장된 소유자와 사용자·역할을 비교합니다.",
          "en": "Compare identity/role with the stored owner."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "안전한 데이터 처리",
          "en": "Handle data safely"
        },
        "body": {
          "ko": "SQL 값 바인딩, 출력 문맥 인코딩, 비밀 없는 오류를 사용합니다.",
          "en": "Bind SQL values, encode for the output context, and return errors without secrets."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "CORS로 내 프런트엔드만 허용하면 curl이나 다른 서버의 요청도 인증 없이 안전하게 막을까요?",
      "en": "Does allowing only your frontend with CORS securely block curl or another server without authentication?"
    },
    "answer": {
      "ko": "아니요. CORS는 브라우저의 응답 접근 규칙입니다. 서버 인증·인가와 CSRF 설계를 따로 해야 합니다.",
      "en": "No. CORS controls browser response access. Server authentication/authorization and CSRF defenses remain separate."
    },
    "guided": {
      "ko": "1. 7단계 예제를 실행합니다. 2. 비밀번호 비교와 소유자 정책을 구분합니다. 3. SQL 주입 모양의 입력이 계정을 반환하지 않는지 확인합니다. 4. 정책 모형의 한계 문구를 적고 실제 브라우저 보안 검증을 했다고 기록하지 않습니다.",
      "en": "1. Run stage 7. 2. Separate password verification from ownership policy. 3. Verify injection-shaped input returns no account. 4. Record the model limits; do not report browser security as tested."
    },
    "failure": {
      "ko": "의도적 실패는 bob이 alice 자원을 요청하는 경우입니다. 확인 순서: 인증된 ID → 저장된 소유자 → 정책 결정 → 실제 서버 경계의 적용 여부. 로그에는 비밀번호나 토큰을 남기지 않습니다. SQL 오류와 권한 거절을 서로 다른 문제로 분류하세요.",
      "en": "The deliberate failure is bob requesting alice’s resource. Check authenticated ID → stored owner → policy decision → application at the actual server boundary. Never log passwords or tokens. Classify SQL errors separately from authorization denial."
    },
    "exercise": {
      "ko": "소유자·다른 사용자·관리자·미인증 사용자별 읽기/수정 허용 표를 작성하고 정책 테스트를 추가하세요. 관리자라도 가격 변경은 별도 권한이 필요하다는 규칙을 설계하세요. XSS·CSRF·SQL 주입 각각에 입력 위치, 신뢰 경계, 방어 위치를 한 줄씩 적으세요.",
      "en": "Write an allow/deny table and policy tests for owner, other user, administrator and anonymous user, covering reads and writes. Design a rule requiring separate permission for price changes even for administrators. For XSS, CSRF and SQL injection, identify input location, trust boundary and defense location."
    },
    "hint": {
      "ko": "인증 여부 하나로 모든 권한을 반환하지 않습니다. 행동과 자원의 소유권을 정책 입력으로 분리하세요.",
      "en": "Do not return every permission from a single logged-in flag. Separate action and resource ownership in policy inputs."
    },
    "solution": {
      "ko": "읽기와 수정에 별도 결정 함수를 두고 각 행의 허용·거절을 검사합니다. SQL은 DB 호출 전 값 바인딩, XSS는 출력 문맥, CSRF는 변경 요청 검증 경계에서 처리합니다. 모형 통과 뒤에도 실제 세션·브라우저 통합 검증은 남습니다.",
      "en": "Use separate read/write decisions and test every allow/deny row. Bind SQL values at the database call, address XSS at the output context, and check CSRF at the state-changing request boundary. Real session/browser integration testing remains after model tests pass."
    },
    "criteria": {
      "ko": "인증·인가와 세 공격을 구별하고 최소 권한 정책을 독립 테스트하며, 모형 검증과 실제 웹 보안 검증의 차이를 명시한다.",
      "en": "Distinguish authentication/authorization and the three attacks, independently test least-privilege rules, and state model versus real web-security coverage."
    },
    "tradeoffs": {
      "ko": "직접 만든 로그인 체계보다 검토된 보안 프레임워크가 일반적으로 검증 범위를 줄여 줍니다. 세션은 서버 상태·폐기가 명확하고 자체 포함 토큰은 분산 검증이 편하지만 폐기·키 회전이 복잡합니다.",
      "en": "Reviewed security frameworks generally reduce the surface you must validate compared with homemade login. Sessions provide explicit server state/revocation; self-contained tokens ease distributed verification but complicate revocation and key rotation."
    },
    "sources": [
      {
        "label": {
          "ko": "OWASP 비밀번호 저장",
          "en": "OWASP password storage"
        },
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html"
      },
      {
        "label": {
          "ko": "OWASP CSRF 방어",
          "en": "OWASP CSRF prevention"
        },
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html"
      }
    ],
    "id": "security",
    "title": {
      "ko": "07 · 인증과 권한",
      "en": "07 · Authentication and authorization"
    },
    "summary": {
      "ko": "세션·쿠키·토큰·비밀번호 해싱·SQL 주입·XSS·CSRF·CORS를 구별하고 경계를 테스트.",
      "en": "Distinguish sessions, cookies, tokens, password hashing, SQL injection, XSS, CSRF and CORS; test boundaries."
    },
    "run": "python3 examples/beginner/advanced/run.py 7",
    "exampleFiles": [
      "examples/beginner/advanced/Stage07Security.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "2단계 계산·예외, 4단계 HTTP 테스트, 6단계 트랜잭션. “명령이 성공했다”와 “요구 동작이 맞다”의 차이를 먼저 떠올리세요.",
      "en": "Stage-2 calculations/exceptions, stage-4 HTTP tests, and stage-6 transactions. Recall the difference between a successful command and correct required behavior."
    },
    "scope": {
      "ko": "실제 실행: 검증이 빠진 계산기의 실패를 잡고 수정된 계산기로 같은 계약을 통과시킵니다. 외부 장애를 생성하지 않습니다.",
      "en": "Actual execution: detect a missing-validation bug and pass the same contract with the corrected calculator. No external fault is generated."
    },
    "glossary": {
      "ko": "테스트 케이스: 입력·기대 결과·검사. 단위 테스트: 좁은 기능의 동작 확인. 통합 테스트: 구성요소 사이 계약 확인. 픽스처: 재현 가능한 준비 데이터. 회귀: 고친 문제가 다시 생김. 테스트 더블: 실제 의존성을 대신하는 객체. 불변식: 여러 입력에서도 유지할 규칙. 최소 재현: 문제를 보이는 가장 작은 조건.",
      "en": "Test case: input, expected result and assertion. Unit test: narrow behavior check. Integration test: checks between components. Fixture: reproducible setup data. Regression: a fixed problem returns. Test double: a replacement dependency. Invariant: a rule that holds across inputs. Minimal reproduction: the smallest conditions exposing a problem."
    },
    "concepts": [
      {
        "title": {
          "ko": "행동을 먼저 적기",
          "en": "State behavior first"
        },
        "body": {
          "ko": "price=500, quantity=3이면 1500을 반환한다는 것은 관찰 가능한 계약입니다. 내부 메서드가 몇 번 호출됐는지만 확인하면 잘못된 결과가 통과할 수 있습니다. 정상·경계·잘못된 입력을 함께 고릅니다. 예제의 첫 구현은 곱셈만 해서 0 수량을 허용합니다. 같은 테스트가 그 버그를 잡고 수정된 구현은 통과해야 테스트가 유용한지 볼 수 있습니다.",
          "en": "Returning 1500 for price=500 and quantity=3 is an observable contract. Checking only internal call counts can let wrong results pass. Include normal, boundary and invalid cases. The first implementation only multiplies, incorrectly accepting zero quantity. Having the same test reject it and accept the corrected implementation demonstrates useful detection."
        },
        "code": "try {\n  calculate.total(500, 0);\n  throw new AssertionError(\"invalid quantity accepted\");\n} catch (IllegalArgumentException expected) {\n  // Expected behavior, not a swallowed arbitrary failure.\n}",
        "output": {
          "ko": "RED detected: invalid quantity accepted",
          "en": "RED detected: invalid quantity accepted"
        }
      },
      {
        "title": {
          "ko": "테스트 경계를 맞추기",
          "en": "Choose the test boundary"
        },
        "body": {
          "ko": "Service 테스트는 계산 규칙을 빠르게 확인합니다. MockMvc는 HTTP 변환·상태·JSON을 검사하지만 실제 네트워크는 아닙니다. JPA/H2는 매핑과 SQL을 검사하지만 MySQL 잠금과 같다고 보장하지 않습니다. 테스트 더블은 없는 결함을 숨길 수 있으므로 중요한 계약은 실제 경계 테스트로 보강합니다. 무조건 많은 테스트보다 어떤 실패를 검출하는지 설명할 수 있어야 합니다.",
          "en": "Service tests quickly check calculation rules. MockMvc checks HTTP conversion/status/JSON without real networking. JPA/H2 checks mapping and SQL without guaranteeing MySQL locking behavior. Test doubles can hide mismatches, so reinforce important contracts with actual-boundary tests. Explain which failures each test detects instead of simply maximizing test count."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "재현에서 원인까지",
          "en": "From reproduction to cause"
        },
        "body": {
          "ko": "예상 400인데 200이면 실제 입력·응답·버전을 먼저 기록합니다. 같은 입력으로 반복 재현한 뒤 변환, 업무 규칙, 예외 매핑 중 어디서 갈라지는지 가설을 세웁니다. 한 번에 한 경계를 바꾸고 기존 실패 테스트를 다시 실행합니다. 로그를 무작정 늘리거나 테스트 기대값을 현재 버그에 맞추면 원인을 해결하지 못합니다.",
          "en": "If you expected 400 but got 200, first record input, response and version. Reproduce with the same input, then hypothesize whether conversion, business validation or exception mapping diverged. Change one boundary and rerun the original failing test. Adding arbitrary logs or changing expectations to match the bug does not fix its cause."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "경계값과 불변식",
          "en": "Boundaries and invariants"
        },
        "body": {
          "ko": "수량 1과 10은 허용, 0과 11은 거절입니다. 가격 0은 허용하고 음수는 거절합니다. 허용된 작은 범위에서 total(500,q)=q*total(500,1)도 확인합니다. 이 속성만으로 입력 검증을 증명하지 못하므로 명시적 오류 케이스와 함께 사용합니다. 테스트는 실제 시간·순서·공유 DB에 의존하지 않도록 시계와 데이터를 제어합니다.",
          "en": "Quantities 1 and 10 are allowed; 0 and 11 are rejected. Price zero is allowed; negative price is rejected. In the small valid range, also check total(500,q)=q*total(500,1). That property alone does not prove validation, so combine it with explicit error cases. Control clocks/data instead of relying on real time, execution order or a shared database."
        },
        "code": "for (int q=1; q<=10; q++) {\n  if (correct(500,q) != q*correct(500,1)) throw new AssertionError();\n}",
        "output": {
          "ko": "GREEN: normal, boundary, invalid-input and invariant checks passed",
          "en": "GREEN: normal, boundary, invalid-input and invariant checks passed"
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "요구",
          "en": "Requirement"
        },
        "body": {
          "ko": "입력과 관찰할 출력 또는 실패를 정합니다.",
          "en": "Define input and observable output or failure."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "실패 재현",
          "en": "Reproduce failure"
        },
        "body": {
          "ko": "버그 있는 구현에서 검사 실패를 확인합니다.",
          "en": "Confirm the assertion fails against the buggy implementation."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "최소 수정",
          "en": "Minimal fix"
        },
        "body": {
          "ko": "검증 경계 한 곳을 고칩니다.",
          "en": "Fix the relevant validation boundary."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "회귀 확인",
          "en": "Check regression"
        },
        "body": {
          "ko": "같은 테스트와 영향을 받는 주변 계약을 실행합니다.",
          "en": "Run the same test and affected neighboring contracts."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "코드 실행이 예외 없이 끝나면 quantity=0 검증 테스트도 통과한 것일까요?",
      "en": "If code finishes without an exception, has the quantity=0 validation test passed?"
    },
    "answer": {
      "ko": "아니요. 이 계약은 예외를 요구하므로 예외가 안 난 것이 실패입니다. 기대 결과를 명시해야 합니다.",
      "en": "No. This contract requires an exception, so returning normally is failure. Expected behavior must be explicit."
    },
    "guided": {
      "ko": "1. 8단계를 실행해 RED와 GREEN을 모두 확인합니다. 2. 잘못된 구현과 수정된 구현이 같은 contract를 받는지 봅니다. 3. 이미 있는 Spring·JPA 테스트를 단위/HTTP/저장 경계로 분류합니다. 4. 검증하지 않은 실제 네트워크·MySQL 동작을 따로 적습니다.",
      "en": "1. Run stage 8 and observe both RED and GREEN. 2. Confirm buggy and corrected implementations use the same contract. 3. Classify existing Spring/JPA tests by unit/HTTP/persistence boundary. 4. List real network/MySQL behavior they do not cover."
    },
    "failure": {
      "ko": "의도적 실패는 검증 없는 곱셈입니다. 입력 0 → 실제 반환 0 → 기대 예외 없음 → 검증 경계 누락 순으로 원인을 좁힙니다. AssertionError를 catch(Exception)으로 숨기거나 오류 기대값을 0으로 바꾸지 않습니다.",
      "en": "The deliberate failure is multiplication without validation. Narrow it down: input 0 → actual result 0 → missing expected exception → missing validation. Do not hide the AssertionError or change the expected error into a zero result."
    },
    "exercise": {
      "ko": "가격 상한 100000을 요구사항에 추가하세요. 수정 전에 100001 거절 테스트가 실패하는지 확인하고, 수정 후 0·100000·100001 및 기존 수량 케이스를 검사하세요. 실패 재현·수정 이유·검증 경계를 5줄 이내로 리뷰어에게 설명하세요.",
      "en": "Add a price limit of 100000. Before fixing code, verify a rejection test for 100001 fails. After fixing, check 0/100000/100001 and existing quantity cases. Explain reproduction, fix rationale and test boundary to a reviewer in five lines."
    },
    "hint": {
      "ko": "새 규칙을 테스트에 먼저 표현하세요. 기존 정상 결과와 수량 규칙이 유지되는지도 확인합니다.",
      "en": "Express the new rule in a test first. Verify existing normal results and quantity rules remain intact."
    },
    "solution": {
      "ko": "price>100000을 기존 입력 검증에 추가합니다. 허용 경계 100000은 성공, 초과 100001은 IllegalArgumentException이어야 합니다. 새 테스트가 수정 전 실패했다는 기록이 회귀 검사의 근거입니다.",
      "en": "Add price>100000 to validation. The boundary 100000 succeeds; 100001 throws IllegalArgumentException. Recording that the new test failed before the fix supports its regression value."
    },
    "criteria": {
      "ko": "의도적으로 잘못된 구현을 잡는 테스트를 만들고 최소 수정으로 통과시키며 테스트가 보장하지 않는 범위를 설명한다.",
      "en": "Write a test that detects an intentionally wrong implementation, pass it with a minimal fix, and explain what the test does not guarantee."
    },
    "tradeoffs": {
      "ko": "지나친 모킹은 실제 연결 문제를 놓치고, 모든 테스트를 무거운 통합 테스트로 만들면 피드백이 늦습니다. 변경 위험에 맞는 가장 작은 유효 경계를 선택합니다.",
      "en": "Excessive mocking misses integration problems; making every test heavy slows feedback. Choose the smallest valid boundary for the change’s risk."
    },
    "id": "testing",
    "title": {
      "ko": "08 · 테스트와 체계적 디버깅",
      "en": "08 · Testing and systematic debugging"
    },
    "summary": {
      "ko": "초기 단계의 작은 테스트를 단위·통합·HTTP 테스트로 확장. 재현→가설→한 가지 변경→재검증.",
      "en": "Expand early checks into unit, integration and HTTP tests. Reproduce, hypothesize, change one thing and verify."
    },
    "run": "python3 examples/beginner/advanced/run.py 8",
    "exampleFiles": [
      "examples/beginner/advanced/Stage08Testing.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "1단계 Git의 저장·커밋 구분과 8단계 테스트. 실제 저장소의 커밋·push·PR 생성은 이 실습에서 자동 실행하지 않습니다.",
      "en": "Stage-1 Git save/commit distinction and stage-8 tests. This exercise does not automatically commit, push or create a PR in the real repository."
    },
    "scope": {
      "ko": "실행은 응답 계약 모형과 기존 로컬 검사입니다. CI YAML은 설명용 파일이며 GitHub 워크플로 설치·원격 실행을 하지 않습니다.",
      "en": "Execution covers a response-contract model and existing local checks. CI YAML is illustrative; no GitHub workflow is installed or remotely run."
    },
    "glossary": {
      "ko": "이슈: 해결할 문제와 수용 조건. 브랜치: 변경 이력의 작업 줄기. 커밋: 검토 가능한 이력 단위. PR: 변경 제안과 검토 공간. 리뷰: 정확성·이해 가능성·위험 검토. 계약: 호출자와 제공자의 입력·출력 약속. CI: 변경 때 자동 검사하는 작업. 호환성: 기존 사용자가 계속 동작하는 성질.",
      "en": "Issue: a problem with acceptance criteria. Branch: a line of development. Commit: a reviewable history unit. PR: a proposed change and review space. Review: checking correctness, clarity and risk. Contract: agreed inputs/outputs. CI: automated checks on changes. Compatibility: existing consumers continue working."
    },
    "concepts": [
      {
        "title": {
          "ko": "작업을 작고 검토 가능하게",
          "en": "Make work small and reviewable"
        },
        "body": {
          "ko": "“API 개선” 대신 “음수 가격 요청이 400이고 기존 수량 2는 total=2400”처럼 수용 조건을 씁니다. 브랜치를 나누어도 공유 파일의 충돌은 사라지지 않습니다. 수정 전 status와 diff로 다른 작업을 확인하고 예상하지 못한 변경을 되돌리지 않습니다. 커밋에는 관련 변경과 검증만 묶고 실패한 검사도 숨기지 않습니다.",
          "en": "Replace “improve API” with acceptance criteria such as “negative price gives 400 and existing quantity=2 still gives total=2400.” Branches do not eliminate shared-file conflicts. Inspect status/diff before edits and do not revert unexpected work. Group related changes and verification into commits; do not hide failing checks."
        },
        "code": "git status --short\ngit diff --stat\ngit diff --check",
        "output": {
          "ko": "출력은 현재 작업 트리에 따라 달라집니다. 마지막 명령은 공백 오류가 없으면 출력 없이 종료합니다.",
          "en": "Output depends on the working tree. The last command exits silently when there are no whitespace errors."
        }
      },
      {
        "title": {
          "ko": "응답 모양도 계약이다",
          "en": "Response shape is a contract"
        },
        "body": {
          "ko": "total이라는 숫자 필드를 amount로 바꾸거나 문자열 \"2400\"으로 바꾸면 기존 클라이언트가 깨질 수 있습니다. 추가 필드는 클라이언트가 모르는 필드를 허용할 때만 호환됩니다. 예제의 oldClient는 그 정책을 명시합니다. 실제 JSON 직렬화는 4단계 MockMvc 테스트로 확인하고, 순수 Map 모형을 HTTP 검증으로 부르지 않습니다.",
          "en": "Renaming numeric total to amount or changing it to string \"2400\" can break an existing client. Added fields are compatible only when the client tolerates unknown fields. The oldClient example states that policy explicitly. Use stage-4 MockMvc tests for actual JSON serialization; do not call a pure Map model an HTTP test."
        },
        "code": "oldClient(Map.of(\"total\",2400));\noldClient(Map.of(\"total\",2400,\"currency\",\"KRW\"));\n// Rejected: {\"amount\":2400}, {\"total\":\"2400\"}",
        "output": {
          "ko": "기존 필드·추가 필드 허용, 이름·타입 변경 거절",
          "en": "Existing/additional fields accepted; rename/type changes rejected"
        }
      },
      {
        "title": {
          "ko": "CI를 로컬 검사와 연결하기",
          "en": "Connect CI with local checks"
        },
        "body": {
          "ko": "CI는 깨끗한 환경에서 같은 검사 명령을 실행하고 종료 코드를 기준으로 실패를 표시합니다. 캐시가 빠졌을 때 네트워크 준비가 필요한 일반 CI와 이 PC의 offline 조건은 다릅니다. 예제 계획은 checkout→Java 준비→테스트→결과 업로드 순서입니다. 비밀을 로그에 출력하거나 PR 코드를 신뢰된 배포 자격과 함께 실행하지 않습니다. 지금은 워크플로를 켜지 않습니다.",
          "en": "CI runs the same checks in a clean environment and reports failures from exit codes. A general CI runner may need network setup when caches are missing; this PC uses offline constraints. The example plan is checkout→prepare Java→test→upload results. Do not log secrets or run untrusted PR code with trusted deployment credentials. We do not enable a workflow now."
        },
        "code": "# Illustrative CI step; not installed as a workflow\n- name: Verify isolated Spring API\n  run: ./gradlew -p examples/beginner/spring-api test",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "리뷰어가 필요한 설명",
          "en": "What reviewers need"
        },
        "body": {
          "ko": "PR 설명은 문제·변경 후 동작·검증·한계를 먼저 씁니다. “테스트 통과”만 쓰지 말고 어떤 경계가 확인됐는지 밝힙니다. 예: 수량 변환 실패와 업무 범위 위반이 모두 400, MockMvc 4검사, 실제 배포 미검증. 리뷰 의견은 사람의 능력이 아니라 구체적 코드·재현·대안에 연결합니다.",
          "en": "Lead a PR description with problem, resulting behavior, verification and limits. Instead of only “tests pass,” identify the checked boundary. Example: conversion and business-range failures both give 400; four MockMvc checks; deployment unverified. Tie review comments to concrete code, reproduction and alternatives rather than a person’s ability."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "이슈",
          "en": "Issue"
        },
        "body": {
          "ko": "입력·결과·제약으로 완료 조건을 씁니다.",
          "en": "Write acceptance criteria as inputs, outcomes and constraints."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "변경",
          "en": "Change"
        },
        "body": {
          "ko": "현재 작업을 확인하고 작은 diff를 만듭니다.",
          "en": "Inspect current work and create a small diff."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "검사",
          "en": "Checks"
        },
        "body": {
          "ko": "로컬과 CI의 테스트 경계를 기록합니다.",
          "en": "Record local and CI test boundaries."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "리뷰",
          "en": "Review"
        },
        "body": {
          "ko": "호환성·검증·남은 위험을 설명합니다.",
          "en": "Explain compatibility, verification and remaining risks."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "JSON에 필드를 추가하는 변경은 언제나 하위 호환일까요?",
      "en": "Is adding a JSON field always backward-compatible?"
    },
    "answer": {
      "ko": "아니요. 엄격한 스키마 클라이언트는 알 수 없는 필드를 거절할 수 있습니다. 실제 소비자 계약을 검사해야 합니다.",
      "en": "No. A strict-schema consumer can reject unknown fields. Check the actual consumer contract."
    },
    "guided": {
      "ko": "9단계 모형을 실행하고 허용된 추가 필드와 거절된 이름·타입 변경을 비교합니다. git diff --check를 읽기 검사로 실행합니다. 실제 push 없이 8단계 수정의 PR 설명 초안을 작성합니다.",
      "en": "Run stage 9 and compare the tolerated added field with rejected rename/type changes. Run git diff --check as a read-only check. Draft a PR description for the stage-8 change without pushing."
    },
    "failure": {
      "ko": "의도적 실패는 total→amount 이름 변경입니다. 클라이언트 기대 필드 → 실제 응답 → 변경 diff → 호환 경로 순으로 확인합니다. 테스트를 새 이름으로만 바꿔 기존 소비자 파손을 숨기지 마세요.",
      "en": "The deliberate failure is total→amount. Inspect the consumer’s expected field → actual response → diff → compatible path. Do not update only the test’s name and hide the old consumer’s breakage."
    },
    "exercise": {
      "ko": "기존 total을 유지하면서 currency를 추가하는 변경 제안서를 만드세요. 엄격한 소비자와 관대한 소비자의 결과를 따로 적고, CI 실패 시 병합을 막을 조건과 실제로 실행하지 않은 항목을 명시하세요.",
      "en": "Propose adding currency while preserving total. Describe strict versus tolerant consumers separately, define checks that block merging, and state what was not actually run."
    },
    "hint": {
      "ko": "새 필드가 “추가”라는 사실과 소비자가 추가 필드를 허용한다는 사실은 별개입니다.",
      "en": "Being additive and being tolerated by a consumer are separate facts."
    },
    "solution": {
      "ko": "total의 이름·타입·의미를 유지하고 소비자별 계약 검사를 추가합니다. 엄격한 소비자는 스키마 확장 또는 버전 전환이 필요합니다. PR에는 입력 예시, 예상 JSON, 검사 결과와 미실행 CI를 구분해 적습니다.",
      "en": "Preserve total’s name/type/meaning and add consumer-specific checks. Strict consumers need schema expansion or version migration. Distinguish sample input, expected JSON, executed checks and unrun CI in the PR."
    },
    "criteria": {
      "ko": "검토 가능한 변경 설명과 계약 검사를 만들고 로컬 통과·원격 CI·배포를 구별한다.",
      "en": "Produce a reviewable change description and contract checks, distinguishing local passes, remote CI and deployment."
    },
    "tradeoffs": {
      "ko": "작은 PR은 리뷰를 쉽게 하지만 의미 없이 쪼개면 전체 계약을 놓칠 수 있습니다. 브랜치·CI는 협업 도구이지 테스트의 의미나 리뷰 판단을 대신하지 않습니다.",
      "en": "Small PRs aid review, but arbitrary splitting can obscure the complete contract. Branches and CI support collaboration; they do not replace meaningful tests or review judgment."
    },
    "id": "collaboration",
    "title": {
      "ko": "09 · 협업과 CI",
      "en": "09 · Collaboration and CI"
    },
    "summary": {
      "ko": "이슈·브랜치·PR·리뷰·API 계약·CI. 작은 변경을 다른 사람이 검토할 수 있게 설명.",
      "en": "Issues, branches, PRs, review, API contracts and CI. Explain a small change so another person can review it."
    },
    "run": "python3 examples/beginner/advanced/run.py 9",
    "exampleFiles": [
      "examples/beginner/advanced/Stage09Contract.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "1단계 프로세스·포트·환경 변수, 4단계 서버 시작, 9단계 CI. Docker 설치나 이미지 다운로드 없이 개념·모형부터 학습합니다.",
      "en": "Stage-1 processes/ports/environment, stage-4 server startup and stage-9 CI. Learn concepts/models without installing Docker or downloading images."
    },
    "scope": {
      "ko": "실행은 설정 검증과 배포 결정 모형입니다. 컨테이너 생성·배포·라우팅 변경·롤백을 실제 수행하지 않습니다.",
      "en": "Execution checks configuration and a deployment-decision model. It does not create containers, deploy, change routing or perform a real rollback."
    },
    "glossary": {
      "ko": "Linux: 서버에서 흔히 쓰는 운영체제. 이미지: 컨테이너 실행에 필요한 파일 묶음. 컨테이너: 격리된 프로세스 환경. 볼륨: 컨테이너 수명과 분리한 데이터 저장. Compose: 여러 서비스의 실행 관계 정의. liveness: 프로세스가 살아 응답 가능한지. readiness: 트래픽을 받을 준비가 됐는지. 롤백: 이전 호환 버전으로 되돌림.",
      "en": "Linux: an operating system common on servers. Image: packaged files for container execution. Container: an isolated process environment. Volume: data storage independent of container lifetime. Compose: a definition of related services. Liveness: whether a process is alive/responsive. Readiness: whether it is ready for traffic. Rollback: returning to a compatible prior version."
    },
    "concepts": [
      {
        "title": {
          "ko": "서버도 프로세스다",
          "en": "A server is still a process"
        },
        "body": {
          "ko": "로컬에서 성공한 앱도 서버에서는 작업 폴더·환경 변수·권한·포트가 다를 수 있습니다. ps는 프로세스, ss는 대기 포트, curl은 HTTP 경계를 확인합니다. Connection refused는 보통 연결할 리스너를 찾지 못했다는 단서이며 500과 다릅니다. 로그의 첫 원인을 읽고 자신이 시작하지 않은 프로세스를 종료하지 않습니다.",
          "en": "An app that works locally may encounter different folders, environment, permissions and ports on a server. ps checks processes, ss listeners and curl the HTTP boundary. Connection refused is a clue that no listener accepted the connection, unlike HTTP 500. Read the first underlying log cause and do not stop processes you did not start."
        },
        "code": "ps -p $$ -o pid,comm\nss -ltn\n# For your own already-started lesson server only:\ncurl -i \"http://127.0.0.1:18182/total?quantity=2\"",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "Docker와 Compose가 해결하는 문제",
          "en": "What Docker and Compose solve"
        },
        "body": {
          "ko": "이미지는 실행 파일·런타임을 묶어 환경 차이를 줄입니다. 컨테이너는 작은 가상 머신과 완전히 같지 않으며 호스트 커널과 자원을 공유합니다. 컨테이너 안 localhost는 그 컨테이너를 가리킵니다. 다른 서비스는 Compose 서비스 이름과 내부 포트로 찾는 구성이 일반적입니다. 포트 공개와 네트워크 접근 범위, 읽기 전용 파일, 비밀 주입을 명시적으로 설계합니다.",
          "en": "An image packages application files/runtime to reduce environmental differences. A container is not simply a small virtual machine; it shares host kernel/resources. localhost inside a container refers to that container. Other services commonly use Compose service names and internal ports. Design published ports, network reachability, read-only files and secret injection explicitly."
        },
        "code": "# Illustrative only; no image build is performed\nservices:\n  api:\n    image: example/product-api:reviewed-version\n    ports: [\"127.0.0.1:18182:8080\"]\n    environment:\n      SERVER_PORT: \"8080\"",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "설정과 상태 검사",
          "en": "Configuration and health checks"
        },
        "body": {
          "ko": "포트가 eighty면 시작 단계에서 명확히 거절해야 합니다. readiness가 실패한 새 버전에 트래픽을 보내지 않습니다. liveness를 DB 장애와 무조건 묶으면 재시작 폭풍을 만들 수 있습니다. 상태 검사는 실제 핵심 경계를 확인하되 비밀과 상세 내부 정보를 노출하지 않습니다. 예제는 준비 안 됨·스키마 불일치 후보를 선택하지 않는 순수 함수입니다.",
          "en": "Reject port eighty clearly during startup. Do not route traffic to a new version failing readiness. Tying liveness unconditionally to database failure can cause restart storms. Health checks should test relevant boundaries without exposing secrets or excessive internals. The example uses a pure function that rejects unready/schema-incompatible candidates."
        },
        "code": "if (!candidate.healthy() || candidate.minimumSchema()>schema) {\n  return current;\n}\nreturn candidate;",
        "output": {
          "ko": "모형: 준비 안 됨/비호환 후보 거절",
          "en": "Model: unready/incompatible candidate rejected"
        }
      },
      {
        "title": {
          "ko": "배포보다 복구까지 설계하기",
          "en": "Plan recovery with deployment"
        },
        "body": {
          "ko": "코드만 이전 버전으로 돌려도 DB 열을 이미 삭제했다면 작동하지 않을 수 있습니다. 먼저 새 열 추가와 구버전 호환 쓰기/읽기를 준비하고, 전환 확인 뒤 오래된 구조를 제거하는 확장→축소 전략을 고려합니다. 롤백 조건·담당자·데이터 호환성·검증 요청을 미리 적습니다. Compose down과 볼륨 삭제는 다른 일이며 이 실습은 둘 다 실행하지 않습니다.",
          "en": "Rolling code back may fail if a required database column was already removed. Consider expand→contract: add compatible structures, migrate reads/writes, verify the transition, then remove old structures. Define rollback triggers, owner, data compatibility and verification requests beforehand. Compose down differs from deleting volumes; neither is executed here."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "설정",
          "en": "Configuration"
        },
        "body": {
          "ko": "포트와 필수 값을 검증합니다.",
          "en": "Validate port and required values."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "후보 실행",
          "en": "Candidate"
        },
        "body": {
          "ko": "별도 후보의 상태와 데이터 호환성을 검사하는 계획을 세웁니다.",
          "en": "Plan checks of candidate health and data compatibility."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "트래픽 판단",
          "en": "Traffic decision"
        },
        "body": {
          "ko": "readiness 통과 후보만 선택하는 모형을 실행합니다.",
          "en": "Run the model selecting only ready candidates."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "복구 검증",
          "en": "Recovery check"
        },
        "body": {
          "ko": "이전 버전도 현재 스키마와 호환인지 확인합니다.",
          "en": "Check that the prior version remains compatible with the current schema."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "프로세스가 실행 중이면 데이터베이스 연결이 없어도 readiness는 항상 성공해야 할까요?",
      "en": "Must readiness always succeed whenever a process is running, even without a needed database connection?"
    },
    "answer": {
      "ko": "아니요. 살아 있음과 업무 요청을 받을 준비는 다릅니다. 필요한 의존성과 트래픽 정책에 따라 readiness를 정해야 합니다.",
      "en": "No. Being alive differs from being ready for business requests. Define readiness from required dependencies and traffic policy."
    },
    "guided": {
      "ko": "10단계 모형을 실행해 잘못된 포트·준비 안 된 버전·스키마 불일치를 구별합니다. 실제 배포 없이 4단계 서버의 시작·검사·종료 절차와 롤백 계획을 문서로 작성합니다.",
      "en": "Run stage 10 and distinguish invalid port, unready release and schema mismatch. Without deploying, document startup/check/shutdown and a rollback plan for the stage-4 server."
    },
    "failure": {
      "ko": "의도적 실패는 healthy=false인 v2입니다. 모형이 v1을 유지하는지 확인합니다. 실제 운영 진단이라면 먼저 새 버전 로그·readiness 응답·설정·스키마 호환성을 확인해야 하며 “재시작”을 첫 정답으로 삼지 않습니다.",
      "en": "The deliberate failure is v2 with healthy=false. Verify the model keeps v1. Real diagnosis would inspect candidate logs, readiness response, configuration and schema compatibility rather than assuming restart is the first answer."
    },
    "exercise": {
      "ko": "새 버전이 schema 2를 필요로 하고 현재는 1인 경우, 단순 롤백이 불가능한 파괴적 마이그레이션의 위험을 설명하세요. 호환 열 추가→검증→트래픽 전환→관찰→후속 제거 순서와 중단 기준을 작성하고 모형에 실패 케이스를 추가하세요.",
      "en": "For a release needing schema 2 while current schema is 1, explain destructive-migration rollback risk. Write compatible expansion→verification→traffic switch→observation→later removal steps and stop criteria, then add model failure cases."
    },
    "hint": {
      "ko": "버전 번호가 낮다고 현재 데이터와 자동 호환인 것은 아닙니다. 역방향 호환 조건도 적으세요.",
      "en": "An older version number does not guarantee compatibility with current data. State reverse-compatibility conditions too."
    },
    "solution": {
      "ko": "먼저 v1이 읽을 수 있는 스키마 변경만 적용하고 v2를 검증한 뒤 전환합니다. 오류율·readiness 등 중단 기준을 충족하면 호환성이 확인된 v1으로 돌리는 계획을 사용합니다. 열 삭제 후에는 복원·전진 수정이 필요할 수 있습니다.",
      "en": "First apply schema changes v1 can still read, verify v2, then switch. If error/readiness stop criteria trigger, use a rollback plan with verified v1 compatibility. After destructive column removal, restoration or a forward fix may be necessary."
    },
    "criteria": {
      "ko": "컨테이너·프로세스·볼륨, liveness/readiness를 구분하고 호환성 있는 배포·롤백 계획과 실패 검사를 작성한다.",
      "en": "Distinguish containers/processes/volumes and liveness/readiness; write a compatible deployment/rollback plan and failure checks."
    },
    "tradeoffs": {
      "ko": "컨테이너는 재현성을 돕지만 이미지·디스크·네트워크·운영 비용을 추가합니다. 처음 계산기를 만드는 단계에는 필요하지 않습니다. 모형 통과는 실제 배포 검증을 대신하지 않습니다.",
      "en": "Containers help reproducibility but add image, disk, networking and operations costs. They are unnecessary for a first calculator. Passing a model does not replace deployment verification."
    },
    "id": "operations",
    "title": {
      "ko": "10 · Linux와 배포",
      "en": "10 · Linux and deployment"
    },
    "summary": {
      "ko": "Linux·Docker·Compose·설정·상태 검사·배포·롤백. 작게 실행한 앱의 운영 경계부터 학습.",
      "en": "Linux, Docker, Compose, configuration, health checks, deployment and rollback. Start with the small app’s operating boundaries."
    },
    "run": "python3 examples/beginner/advanced/run.py 10",
    "exampleFiles": [
      "examples/beginner/advanced/Stage10Operations.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "3단계 요청 흐름, 8단계 재현·검증, 10단계 운영 경계. 평균과 정렬된 목록을 읽을 수 있으면 시작할 수 있습니다.",
      "en": "Stage-3 request flow, stage-8 reproduction/verification and stage-10 operating boundaries. Begin with understanding averages and sorted lists."
    },
    "scope": {
      "ko": "계산은 실제 Java로 실행하지만 입력 시간·오류·추적은 합성 픽스처입니다. 실제 IncidentLens 부하·성능 개선·RCA 보고서를 생성하지 않습니다.",
      "en": "Calculations run in Java, but timings/errors/traces are synthetic fixtures. No real IncidentLens load, performance improvement or RCA report is produced."
    },
    "glossary": {
      "ko": "로그: 개별 사건 기록. 지표: 수치 집계. 추적: 한 요청의 여러 구간 연결. span: 추적의 작업 구간. 지연: 요청에 걸린 시간. p95: 선택한 계산법에서 표본 95% 위치의 값. 처리량: 시간당 완료 작업 수. 오류율: 정의한 전체 중 오류 비율. RCA: 관측 근거에서 원인 가설과 검증을 만드는 과정.",
      "en": "Log: an event record. Metric: numeric aggregation. Trace: connected work spans of one request. Span: a traced operation segment. Latency: time for a request. p95: the 95th-percentile position under a specified calculation method. Throughput: completed work per time. Error rate: errors divided by the defined total. RCA: reasoning from observations to causal hypotheses and checks."
    },
    "concepts": [
      {
        "title": {
          "ko": "세 종류의 증거를 연결하기",
          "en": "Connect three forms of evidence"
        },
        "body": {
          "ko": "지표는 언제 느려졌는지, 로그는 어떤 오류가 났는지, 추적은 어느 구간을 지났는지 보여줍니다. requestId/traceId로 같은 작업을 연결하고 시간대·단위·관측 구간을 맞춥니다. 사용자 ID·상품 ID를 무제한 지표 라벨로 쓰면 시계열 수가 폭증할 수 있습니다. 로그에 비밀·개인 입력을 그대로 넣지 않습니다.",
          "en": "Metrics show when behavior changed, logs show events/errors, and traces show the path through work. Correlate with requestId/traceId and align timezone, units and observation window. Unbounded user/product IDs as metric labels can explode series count. Do not log secrets or raw personal input."
        },
        "code": "{\"event\":\"catalog_read\",\"traceId\":\"t1\",\"durationMs\":100,\"outcome\":\"ok\"}",
        "output": {
          "ko": "합성 로그 1행: 실제 수집 결과가 아닙니다.",
          "en": "One synthetic log line, not collected evidence."
        }
      },
      {
        "title": {
          "ko": "평균과 p95는 다른 질문",
          "en": "Mean and p95 answer different questions"
        },
        "body": {
          "ko": "예제 표본은 10,20,…,190,1000ms의 20개입니다. 합계 2900/20=145ms가 평균입니다. nearest-rank p95는 ceil(0.95*20)=19번째 값 190ms입니다. 가장 느린 1000ms를 지우면 tail 문제를 숨깁니다. 다른 백분위 계산법이나 히스토그램은 다른 추정치를 낼 수 있으므로 표본 수·방법을 함께 기록합니다. 빈 표본은 0ms가 아닙니다.",
          "en": "The fixture has twenty values: 10,20,…,190,1000ms. Sum 2900/20 gives mean 145ms. Nearest-rank p95 uses ceil(0.95*20)=the 19th value, 190ms. Removing the slowest 1000ms hides a tail issue. Other percentile definitions or histograms may estimate differently; record sample size and method. No samples does not mean 0ms."
        },
        "code": "int rank = (int)Math.ceil(0.95 * sorted.length);\nint p95 = sorted[rank - 1];",
        "output": {
          "ko": "n=20 mean=145ms p95=190ms max=1000ms",
          "en": "n=20 mean=145ms p95=190ms max=1000ms"
        }
      },
      {
        "title": {
          "ko": "통제된 부하의 질문",
          "en": "Ask a controlled-load question"
        },
        "body": {
          "ko": "먼저 한 요청이 맞는지 검사한 뒤 제한된 사용자 수·시간·요청 종류를 정합니다. 오류율·완료 수·기간·데이터 상태·캐시 예열·다른 트래픽을 함께 기록합니다. 요청 설정이 같아도 실제 완료량은 다를 수 있습니다. 이 실습은 부하를 만들지 않으며 앞선 장난감 HTTP 검사도 성능 벤치마크가 아닙니다. 운영 용량으로 일반화하지 않습니다.",
          "en": "Verify one request first, then define bounded concurrency, duration and request mix. Record error rate, completed count, duration, data state, cache warm-up and competing traffic. Equal settings can still yield different completions. This exercise generates no load; earlier toy HTTP checks are not benchmarks. Do not generalize to production capacity."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "관찰에서 가설과 검증으로",
          "en": "From observation to hypothesis and validation"
        },
        "body": {
          "ko": "“DB span 60ms”는 관찰이고 “DB가 유일한 원인”은 가설입니다. 전체 span 100ms에서 하위 span을 단순히 더하면 겹침·비동기 때문에 틀릴 수 있습니다. 경쟁 가설, 빠진 근거, 반증 조건을 적습니다. RCA는 그럴듯한 문장보다 인용 가능한 증거 ID와 다음 검사가 중요합니다. 회복 후에도 같은 조건과 데이터 상태를 확인해야 합니다.",
          "en": "“DB span 60ms” is an observation; “DB is the only cause” is a hypothesis. Simply adding child spans to a 100ms parent can be wrong because of overlap/asynchrony. Record competing explanations, missing evidence and falsification conditions. RCA needs traceable evidence IDs and next checks more than plausible prose. Recovery comparisons still require comparable conditions/data state."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "수집 정의",
          "en": "Define collection"
        },
        "body": {
          "ko": "요청 종류·시간 구간·단위·누락 처리 규칙을 정합니다.",
          "en": "Define request type, time window, units and missing-data treatment."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "관찰",
          "en": "Observe"
        },
        "body": {
          "ko": "로그·지표·추적을 같은 작업으로 연결합니다.",
          "en": "Connect logs, metrics and traces for the same work."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "가설",
          "en": "Hypothesize"
        },
        "body": {
          "ko": "원인 후보와 불확실성을 분리합니다.",
          "en": "Separate candidate causes from uncertainty."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "검증",
          "en": "Validate"
        },
        "body": {
          "ko": "반증 가능한 한 가지 검사를 설계하고 같은 조건에서 비교합니다.",
          "en": "Design one falsifiable check and compare under comparable conditions."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "평균 145ms이면 모든 요청이 145ms 근처였다고 말할 수 있을까요?",
      "en": "Does a mean of 145ms imply every request was close to 145ms?"
    },
    "answer": {
      "ko": "아니요. 표본에는 1000ms가 있습니다. 평균은 분포와 꼬리를 숨길 수 있으므로 표본·백분위·최댓값을 함께 봅니다.",
      "en": "No. The fixture contains 1000ms. Means can hide distribution/tails; inspect samples, percentiles and maximum together."
    },
    "guided": {
      "ko": "11단계를 실행하고 19번째 값을 손으로 확인합니다. 빈 표본 검사에서 예외가 나는 이유를 설명합니다. 합성 trace의 관찰 2개와 확정할 수 없는 주장 2개를 적습니다.",
      "en": "Run stage 11 and manually identify the 19th value. Explain why empty samples raise an error. Write two observations and two unproven claims about the synthetic trace."
    },
    "failure": {
      "ko": "의도적 실패는 빈 배열입니다. 수집 요청 성공 여부 → 실제 표본 수 → 구간과 필터 → 누락 표기 순으로 진단합니다. 자료가 없는데 0으로 채우면 정상처럼 보이는 거짓 결론이 됩니다.",
      "en": "The deliberate failure is an empty array. Diagnose collection success → actual sample count → window/filters → missing-data display. Filling absent data with zero creates a false healthy result."
    },
    "exercise": {
      "ko": "표본 20개 중 느린 값을 2개로 바꾸고 평균·nearest-rank p95를 직접 계산하세요. 오류 2개라면 오류율도 구하세요. 관찰/가설/추가 검사 표를 만들고 이 합성 데이터로 실제 개선을 주장할 수 없는 이유를 쓰세요.",
      "en": "Change the twenty-sample fixture to have two slow values and compute mean/nearest-rank p95. With two errors, calculate error rate. Make an observation/hypothesis/next-check table and explain why synthetic data cannot prove a real improvement."
    },
    "hint": {
      "ko": "기존 190을 1000으로 바꾸면 합계는 810 늘고 19번째 값은 1000이 됩니다. 분모 20을 유지하세요.",
      "en": "Replacing 190 with 1000 increases the sum by 810 and makes the 19th value 1000. Keep the denominator at 20."
    },
    "solution": {
      "ko": "수정 합계 3710, 평균 185.5ms, p95 1000ms, 오류율 2/20=10%입니다. 계산 검증과 원인 검증은 다릅니다. 실제 구간·부하·추적 없이는 운영 개선을 결론 내릴 수 없습니다.",
      "en": "The new sum is 3710, mean 185.5ms, p95 1000ms, and error rate 2/20=10%. Validating arithmetic differs from validating causes. Without real windows/load/traces, no production improvement follows."
    },
    "criteria": {
      "ko": "백분위와 오류율을 재현하고 누락을 0과 구별하며 관찰·가설·반증 검사를 따로 작성한다.",
      "en": "Reproduce percentile/error-rate calculations, distinguish missing from zero, and separately state observations, hypotheses and falsification checks."
    },
    "tradeoffs": {
      "ko": "관측 도구는 저장·수집·샘플링 비용이 있습니다. 작은 서비스는 구조화 로그와 기본 지표부터 시작할 수 있습니다. 많은 대시보드가 좋은 인과 추론을 보장하지 않습니다.",
      "en": "Observability costs storage, collection and sampling effort. A small service can start with structured logs and basic metrics. More dashboards do not guarantee sound causal reasoning."
    },
    "id": "observability",
    "title": {
      "ko": "11 · 관측과 RCA",
      "en": "11 · Observability and RCA"
    },
    "summary": {
      "ko": "로그·지표·추적·지연 백분위·통제된 부하·근거 기반 RCA. 관찰과 추론을 구분.",
      "en": "Logs, metrics, traces, latency percentiles, controlled load and evidence-based RCA. Separate observations from inference."
    },
    "run": "python3 examples/beginner/advanced/run.py 11",
    "exampleFiles": [
      "examples/beginner/advanced/Stage11Observability.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "5–6단계 SQL·인덱스 필요성·쿼리 관찰, 11단계 지연·표본·인과 구분. 캐시를 먼저 추가하기보다 어떤 작업을 줄일지 정합니다.",
      "en": "Stages 5–6 SQL/query inspection and stage 11 latency, samples and causality. Decide which work to avoid before adding a cache."
    },
    "scope": {
      "ko": "실제 H2 EXPLAIN으로 인덱스 선택을 확인합니다. 캐시는 Java Map과 제어된 시계의 모형이며 Redis 연결·분산 잠금·실제 성능 개선은 검증하지 않습니다.",
      "en": "Actual H2 EXPLAIN verifies index selection. Caching is a Java Map/controlled-clock model; no Redis connection, distributed lock or real performance improvement is validated."
    },
    "glossary": {
      "ko": "인덱스: 조건에 맞는 행을 찾도록 돕는 추가 구조. 선택도: 조건이 얼마나 좁게 행을 고르는지. 실행 계획: DB가 쿼리를 수행하는 방법. 캐시: 원본에서 계산/조회한 값을 재사용하는 저장. 적중/미적중: 저장 값 있음/없음. TTL: 유효 기간. 무효화: 더 이상 쓰면 안 되는 저장 값을 제거. Redis: 네트워크로 접근하는 메모리 중심 데이터 저장소.",
      "en": "Index: an additional structure helping locate matching rows. Selectivity: how narrowly a condition selects rows. Query plan: how the database executes a query. Cache: stored results reused from an authoritative source. Hit/miss: usable value present/absent. TTL: validity period. Invalidation: removing a value that should no longer be reused. Redis: a network-accessible, memory-oriented data store."
    },
    "concepts": [
      {
        "title": {
          "ko": "인덱스도 측정 대상",
          "en": "Indexes also need evidence"
        },
        "body": {
          "ko": "상품 1000개 중 category=3을 찾을 때 모든 행을 읽는 방법과 인덱스를 따라가는 방법이 있습니다. 예제는 category 인덱스 생성 뒤 H2 계획에 그 이름이 등장하는지 확인합니다. 인덱스 사용이 곧 응답 p95 개선이라는 뜻은 아닙니다. 작은 표, 낮은 선택도, 쓰기 비용 때문에 이익이 작을 수 있습니다. MySQL에서는 실제 쿼리와 데이터 분포의 EXPLAIN·측정을 별도로 봐야 합니다.",
          "en": "For category=3 among 1000 products, the database may scan or use an index. The example creates a category index and checks that H2’s plan names it. Index use does not by itself prove improved response p95. Small tables, low selectivity and write costs can limit benefits. Inspect actual MySQL queries/data distribution and measure separately."
        },
        "code": "CREATE INDEX idx_product_category ON product(category);\nEXPLAIN SELECT id FROM product WHERE category=3;",
        "output": {
          "ko": "H2 계획에 IDX_PRODUCT_CATEGORY 포함",
          "en": "H2 plan includes IDX_PRODUCT_CATEGORY"
        }
      },
      {
        "title": {
          "ko": "Redis가 필요한 시점",
          "en": "When Redis becomes useful"
        },
        "body": {
          "ko": "반복 상품 조회에서 DB 작업이 병목이라는 근거가 있고 약간의 오래된 값을 허용할 때 캐시를 검토합니다. Redis는 여러 프로세스가 네트워크로 공유할 수 있지만 직렬화·연결 실패·만료·메모리 관리가 추가됩니다. 원본 DB가 기준이고 캐시가 원본인지 별도 저장소인지 역할을 명확히 해야 합니다. 지금 모형의 Map은 한 프로세스 안에만 있습니다.",
          "en": "Consider caching when evidence shows repeated catalog reads cause database work and some staleness is acceptable. Redis can be shared across processes over a network, but adds serialization, connection failures, expiry and memory management. Make the authoritative source explicit. The example Map exists in one process only."
        },
        "code": "# Illustrative Redis commands; not executed by the runner\nGET product:1\nSET product:1 1200 EX 30",
        "output": {
          "ko": "설명용 Redis 명령이며 실제 응답을 수집하지 않습니다.",
          "en": "Illustrative Redis commands; no real responses are collected."
        }
      },
      {
        "title": {
          "ko": "cache-aside의 세 경계",
          "en": "Three cache-aside boundaries"
        },
        "body": {
          "ko": "먼저 캐시를 읽고 미적중이면 원본을 읽은 뒤 TTL과 함께 저장합니다. 예제는 첫 조회에서 loads=1, 두 번째에서 여전히 1입니다. DB 가격을 1500으로 바꿔도 TTL 전에는 1200을 반환하는 오래된 읽기를 의도적으로 보여줍니다. 정확히 만료 시점 now=100이면 다시 읽습니다. 시계를 주입하면 sleep 없이 경계값을 재현할 수 있습니다.",
          "en": "Read the cache first; on a miss, load the source and store with a TTL. The first example read sets loads=1; the second leaves it at 1. Changing the database price to 1500 deliberately still returns cached 1200 before expiry. At exactly now=100 it reloads. Controlling the clock makes boundaries reproducible without sleep."
        },
        "code": "Entry found = cache.get(\"product:1\");\nif (found != null && now < found.expiresAt()) return found.value();\nloads++;\ncache.put(\"product:1\", new Entry(databasePrice, now + 100));\nreturn databasePrice;",
        "output": {
          "ko": "첫 조회/적중: loads=1; 만료: loads=2; 변경 후 무효화: loads=3",
          "en": "First read/hit: loads=1; expiry: loads=2; invalidate after change: loads=3"
        }
      },
      {
        "title": {
          "ko": "장애, 무효화, 몰림",
          "en": "Failure, invalidation and stampedes"
        },
        "body": {
          "ko": "가격 변경 후 키를 지우면 다음 읽기가 최신 값을 가져오지만, 동시 읽기·쓰기 순서 때문에 오래된 값을 다시 저장할 수도 있습니다. TTL만으로 강한 일관성을 보장하지 않습니다. 캐시 장애 때 모두 DB로 보내면 DB까지 과부하가 될 수 있으므로 제한된 우회·동시 요청 모으기·시간 제한을 설계합니다. 적중률만 보지 말고 원본 로드·오류·지연·신선도를 함께 봅니다.",
          "en": "Deleting a key after a price change lets the next read fetch fresh data, but concurrent read/write ordering can repopulate stale values. TTL alone does not guarantee strong consistency. Sending all traffic to the database during cache failure can overload it, so design bounded fallback, coalescing and timeouts. Inspect source loads, errors, latency and freshness, not only hit rate."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "캐시 읽기",
          "en": "Cache read"
        },
        "body": {
          "ko": "키와 만료를 확인합니다. 사용자·권한별 데이터라면 키 경계도 검증합니다.",
          "en": "Check key and expiry; also verify scope for user/permission-specific data."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "미적중",
          "en": "Miss"
        },
        "body": {
          "ko": "원본 읽기를 수행하고 로드 수를 셉니다.",
          "en": "Read the source and count backing loads."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "저장",
          "en": "Store"
        },
        "body": {
          "ko": "정해진 TTL로 결과를 저장합니다. 동시 쓰기 경합은 별도 문제입니다.",
          "en": "Store with a defined TTL; concurrent write races are a separate problem."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "응답·관측",
          "en": "Respond and observe"
        },
        "body": {
          "ko": "값의 신선도와 작업 감소를 지연 변화와 구분합니다.",
          "en": "Distinguish freshness and avoided work from latency changes."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "캐시 적중률이 높으면 항상 데이터가 최신이고 서비스가 빠르다고 말할 수 있을까요?",
      "en": "Does a high hit rate always mean fresh data and a fast service?"
    },
    "answer": {
      "ko": "아니요. 오래된 값을 빠르게 반환할 수도 있고 다른 병목이 남을 수도 있습니다. 신선도·원본 로드·전체 지연을 별도로 확인합니다.",
      "en": "No. It may quickly serve stale values, and another bottleneck may remain. Check freshness, source loads and overall latency separately."
    },
    "guided": {
      "ko": "12단계를 실행합니다. DB 가격 변경 직후 오래된 값, 만료 경계의 새 값, 무효화 후 새 값을 순서대로 적습니다. H2 계획의 인덱스 선택과 실제 응답 시간 개선을 구별합니다.",
      "en": "Run stage 12. Record stale value immediately after a source update, fresh value at expiry, and fresh value after invalidation. Separate H2 index selection from actual response-time improvement."
    },
    "failure": {
      "ko": "의도적 실패 상황은 DB=1500, 캐시=1200입니다. 확인 순서: 요청 키 → 캐시 만료 시간 → 원본 값 → 쓰기 후 무효화 순서. 값을 억지로 같게 수정하기 전에 허용 신선도 계약을 확인합니다.",
      "en": "The deliberate failure situation is database=1500 while cache=1200. Inspect request key → expiry → source value → invalidation order. Check the freshness contract before forcing values to match."
    },
    "exercise": {
      "ko": "키를 상품 ID별로 분리하고 서로 다른 상품이 값을 공유하지 않게 만드세요. now=99와 100을 각각 검사하고, TTL 0은 매번 원본을 읽는지 확인하세요. 캐시 실패 시 최대 동시 DB 조회 수를 제한하는 설계를 글과 테스트 계획으로 제안하세요.",
      "en": "Separate keys by product ID and prevent cross-product values. Test now=99 and 100 and verify TTL zero reloads every time. Propose a design and test plan bounding concurrent database fallbacks during cache failure."
    },
    "hint": {
      "ko": "만료 조건의 <와 <= 차이를 확인합니다. 공유 키 오류는 적중률을 높여도 잘못된 상품을 반환할 수 있습니다.",
      "en": "Check < versus <= at expiry. A shared-key bug can improve hit rate while returning the wrong product."
    },
    "solution": {
      "ko": "product:<id>별 Entry를 보관하고 now<expiresAt에서만 재사용합니다. TTL 0은 저장 시각과 만료 시각이 같으므로 적중하지 않습니다. 동시 우회 제한은 세마포어·대기 한도·시간 제한을 함께 정의하고 과부하 시 명확히 거절하는 계획이 필요합니다.",
      "en": "Store Entries under product:<id> and reuse only while now<expiresAt. TTL zero expires at storage time and never hits. A bounded-fallback plan needs concurrency limits, bounded waiting, deadlines and explicit rejection under overload."
    },
    "criteria": {
      "ko": "실행 계획·캐시 신선도·원본 로드·전체 지연을 구분하고 키/TTL 경계 테스트를 독립 작성한다.",
      "en": "Distinguish plans, freshness, source loads and overall latency; independently test key and TTL boundaries."
    },
    "tradeoffs": {
      "ko": "캐시는 복잡성과 오래된 읽기를 대가로 작업을 줄입니다. 최신 가격·재고 확정은 원본의 트랜잭션 검증이 필요합니다. 먼저 쿼리·인덱스·불필요한 호출을 개선하는 편이 더 단순할 수 있습니다.",
      "en": "Caches trade complexity/staleness for avoided work. Final price/stock decisions need authoritative transactional validation. Improving queries/indexes/unnecessary calls first may be simpler."
    },
    "id": "performance",
    "title": {
      "ko": "12 · 성능과 Redis",
      "en": "12 · Performance and Redis"
    },
    "summary": {
      "ko": "인덱스·측정·Redis·캐시 적중·만료·무효화·대안. 측정 후 필요한 캐시만 추가.",
      "en": "Indexes, measurement, Redis, cache hits, expiry, invalidation and alternatives. Add caching only after measurement."
    },
    "run": "python3 examples/beginner/advanced/run.py 12",
    "exampleFiles": [
      "examples/beginner/advanced/Stage12Cache.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "2단계 변수·메서드, 6단계 트랜잭션, 12단계 동시 캐시 경계. Thread는 동시에 진행할 수 있는 실행 흐름이며 공유 변수의 여러 연산은 자동으로 한 묶음이 되지 않습니다.",
      "en": "Stage-2 variables/methods, stage-6 transactions and stage-12 cache races. A Thread is an execution flow that may run concurrently; multiple shared-variable operations are not automatically one atomic action."
    },
    "scope": {
      "ko": "실제 Java 스레드의 잃어버린 갱신과 원자적 증가, H2 버전 조건 UPDATE를 검사합니다. 멱등성 저장은 프로세스 내부 모형이며 MySQL 격리·분산 보장을 실험하지 않습니다.",
      "en": "Checks use real Java threads for lost updates/atomic increments and H2 conditional-version updates. Idempotency storage is process-local; MySQL isolation and distributed guarantees are not exercised."
    },
    "glossary": {
      "ko": "동시성: 여러 작업이 겹쳐 진행됨. 경합: 같은 자원을 경쟁함. 원자성: 중간 상태 없이 한 동작처럼 적용. 격리: 동시에 실행되는 트랜잭션이 서로 보이는 방식. 잠금: 공유 자원 접근 조정. 낙관적 잠금: 읽은 버전이 여전히 같은지 조건으로 변경. 교착: 서로 가진 자원을 기다려 진행 불가. 멱등성: 같은 의도 재시도의 효과를 중복 적용하지 않음.",
      "en": "Concurrency: overlapping work. Contention: competing for a resource. Atomicity: applying as one action without exposed intermediate state. Isolation: how concurrent transactions observe one another. Lock: coordination of shared access. Optimistic locking: change only if the read version still matches. Deadlock: circular waiting prevents progress. Idempotency: retrying the same intent without duplicating its effect."
    },
    "concepts": [
      {
        "title": {
          "ko": "get과 set이 각각 안전해도",
          "en": "Safe get and set do not make a safe sequence"
        },
        "body": {
          "ko": "두 스레드가 각각 0을 읽고 1을 쓰면 두 번 증가시켰는데 결과가 1입니다. 예제는 CountDownLatch로 두 읽기가 끝난 뒤 쓰게 해서 문제를 재현합니다. AtomicInteger의 개별 get/set이 안전해도 둘을 이어 붙인 연산은 원자적이지 않습니다. incrementAndGet은 증가 전체를 원자적으로 수행해 결과 2를 만듭니다.",
          "en": "If two threads both read 0 and write 1, two increments leave 1. A CountDownLatch makes both reads finish before either write to reproduce this. Individual AtomicInteger get/set operations are safe, but their combined read-modify-write sequence is not atomic. incrementAndGet atomically performs the whole increment and produces 2."
        },
        "code": "int old = counter.get();\n// Another thread can read the same old value here.\ncounter.set(old + 1);\n// Compare with counter.incrementAndGet();",
        "output": {
          "ko": "분리된 get/set 결과 1, 원자적 증가 결과 2",
          "en": "Split get/set result 1; atomic increment result 2"
        }
      },
      {
        "title": {
          "ko": "DB에서는 조건과 영향 행 수",
          "en": "In a database, check conditions and affected rows"
        },
        "body": {
          "ko": "이전 version=0을 읽은 두 요청 중 첫 요청만 version=0 조건으로 성공합니다. 두 번째 UPDATE의 영향 행 수가 0이면 충돌이지 정상 저장이 아닙니다. 최신 데이터를 다시 읽고 재시도할지 사용자에게 충돌을 알릴지 업무 규칙으로 결정합니다. MySQL InnoDB의 읽기 격리와 잠금 읽기는 별도 의미가 있으므로 H2 결과를 그대로 옮겨 해석하지 않습니다.",
          "en": "Of two requests that read version=0, only the first succeeds with the version=0 condition. Zero affected rows for the second UPDATE means conflict, not a successful save. Decide by business rules whether to reread/retry or report conflict. MySQL InnoDB isolation and locking reads have distinct semantics; do not transfer H2 observations unchanged."
        },
        "code": "UPDATE product\nSET stock=stock-1, version=version+1\nWHERE id=1 AND version=0 AND stock>0;",
        "output": {
          "ko": "첫 갱신 영향 행 1, 오래된 버전 재시도 영향 행 0",
          "en": "First update affects 1 row; stale-version retry affects 0"
        }
      },
      {
        "title": {
          "ko": "잠금과 격리의 비용",
          "en": "Costs of locks and isolation"
        },
        "body": {
          "ko": "잠금은 동시에 변경하는 작업을 조정하지만 대기와 교착 위험을 만듭니다. 여러 자원을 같은 순서로 잠그고 트랜잭션을 짧게 유지합니다. 교착으로 취소된 트랜잭션은 전체 단위로 제한된 재시도가 필요할 수 있습니다. “격리 수준을 높이면 모든 문제가 해결”은 아닙니다. 어떤 읽기·쓰기 이상을 막아야 하는지와 처리량·대기 비용을 함께 정합니다.",
          "en": "Locks coordinate concurrent changes but introduce waiting and deadlock risks. Lock multiple resources in a consistent order and keep transactions short. A deadlock-aborted transaction may need a bounded whole-transaction retry. Higher isolation is not a universal fix. Define the anomalies to prevent alongside throughput and waiting costs."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "재시도와 멱등 키",
          "en": "Retries and idempotency keys"
        },
        "body": {
          "ko": "네트워크 응답을 잃어도 서버는 이미 주문을 저장했을 수 있습니다. 같은 사용자 범위의 키와 요청 지문을 저장해 같은 요청은 이전 결과를 반환하고 다른 payload 재사용은 충돌로 거절합니다. 예제는 synchronized로 한 프로세스의 확인+저장을 묶습니다. 실제 여러 인스턴스에서는 DB 고유 제약, 트랜잭션, 진행 중 상태, 보존 기간과 응답 복원이 필요합니다.",
          "en": "A server may have saved an order even when its response was lost. Store a user-scoped key and request fingerprint; return the previous result for the same request and reject changed payload reuse as conflict. The example uses synchronized to combine lookup/save within one process. Multiple real instances need database uniqueness, transactions, in-progress handling, retention and response reconstruction."
        },
        "code": "Result prior = keys.get(key);\nif (prior != null) {\n  if (!prior.fingerprint().equals(fingerprint)) throw new IllegalArgumentException();\n  return prior.orderId();\n}",
        "output": {
          "ko": "같은 키+의도: 같은 주문 ID; 같은 키+다른 의도: 충돌",
          "en": "Same key+intent: same order ID; same key+different intent: conflict"
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "동시 입력",
          "en": "Concurrent input"
        },
        "body": {
          "ko": "두 요청이 같은 재고·버전을 읽는 상황을 정의합니다.",
          "en": "Define two requests reading the same stock/version."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "조정",
          "en": "Coordinate"
        },
        "body": {
          "ko": "원자 연산·잠금·조건부 UPDATE 중 맞는 경계를 선택합니다.",
          "en": "Choose the appropriate atomic operation, lock or conditional UPDATE."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "결과 판별",
          "en": "Classify result"
        },
        "body": {
          "ko": "영향 행 0과 중복 키를 성공으로 숨기지 않습니다.",
          "en": "Do not hide zero affected rows or duplicate keys as success."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "재시도",
          "en": "Retry"
        },
        "body": {
          "ko": "같은 의도인지 확인하고 제한된 재시도나 이전 결과 반환을 합니다.",
          "en": "Check request intent and perform bounded retry or return the prior result."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "AtomicInteger를 썼으니 get()+set()도 증가 전체가 원자적일까요?",
      "en": "Does using AtomicInteger make a get()+set() increment sequence atomic?"
    },
    "answer": {
      "ko": "아니요. 개별 동작과 복합 동작의 경계가 다릅니다. 증가 전체를 원자 연산으로 표현해야 합니다.",
      "en": "No. Individual and compound operation boundaries differ. Express the entire increment as an atomic operation."
    },
    "guided": {
      "ko": "13단계 예제를 실행해 1과 2를 비교합니다. latch가 타이밍을 재현하는 이유를 설명합니다. H2 영향 행 1/0과 멱등 키 재사용 결과를 각각 기록합니다.",
      "en": "Run stage 13 and compare 1 and 2. Explain how the latch makes the schedule reproducible. Record H2 affected rows 1/0 and idempotency-key results separately."
    },
    "failure": {
      "ko": "의도적 실패는 오래된 version=0 갱신과 같은 키의 다른 수량입니다. 진단: 원래 읽은 버전/의도 → 저장된 버전/지문 → 영향 행/충돌 → 재읽기 또는 거절. 무한 재시도나 새 키 생성으로 중복을 숨기지 않습니다.",
      "en": "Deliberate failures are a stale version=0 update and changed quantity with the same key. Diagnose original version/intent → stored version/fingerprint → affected rows/conflict → reread or reject. Do not hide duplicates with infinite retries or fresh keys."
    },
    "exercise": {
      "ko": "멱등 키를 사용자별로 분리하고 alice:k1과 bob:k1이 충돌하지 않게 만드세요. 같은 사용자의 같은 의도는 주문 1개, 다른 의도는 충돌이어야 합니다. 재시작 뒤 Map이 비면 어떤 중복 위험이 있는지 설명하고 영속화 테스트 계획을 작성하세요.",
      "en": "Scope idempotency keys by user so alice:k1 and bob:k1 do not collide. Same-user same-intent retries must create one order; changed intent must conflict. Explain restart risk when the Map is empty and write a persistence test plan."
    },
    "hint": {
      "ko": "키의 범위와 요청 지문은 다릅니다. (사용자,키)를 인덱스로, 정규화된 요청 값을 비교 대상으로 사용하세요.",
      "en": "Key scope differs from request fingerprint. Use (user,key) for lookup and normalized request content for comparison."
    },
    "solution": {
      "ko": "복합 키로 저장하고 두 사용자 독립 결과, 같은 사용자 재시도 동일 ID, payload 충돌을 테스트합니다. 영속화 버전은 프로세스 재시작과 동시 요청을 별도로 검증해야 하며 Map 테스트만으로 보장하지 않습니다.",
      "en": "Store under a composite key and test independent users, same-user stable IDs and payload conflicts. A persistent implementation must separately test restarts and concurrent requests; Map tests do not establish those guarantees."
    },
    "criteria": {
      "ko": "경합을 결정적으로 재현하고 원자 경계·버전 충돌·멱등 재시도를 구별하며 분산 보장 범위를 명시한다.",
      "en": "Reproduce a race deterministically, distinguish atomic boundaries/version conflicts/idempotent retries, and state distributed-guarantee limits."
    },
    "tradeoffs": {
      "ko": "잠금은 단순한 일관성을 주지만 대기를 늘리고, 낙관적 잠금은 충돌 시 재작업을 요구합니다. 멱등 기록에는 저장·보존 비용이 있습니다. 정확성 요구와 경합률에 따라 선택합니다.",
      "en": "Locks simplify some consistency rules but increase waiting; optimistic locking requires rework on conflict. Idempotency records cost storage/retention. Choose based on correctness needs and contention."
    },
    "sources": [
      {
        "label": {
          "ko": "MySQL InnoDB 격리 수준",
          "en": "MySQL InnoDB isolation levels"
        },
        "url": "https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html"
      }
    ],
    "id": "concurrency",
    "title": {
      "ko": "13 · 동시성과 멱등성",
      "en": "13 · Concurrency and idempotency"
    },
    "summary": {
      "ko": "격리 수준·경합·잠금·멱등성. 중복 요청과 동시에 발생하는 변경을 테스트.",
      "en": "Isolation levels, contention, locks and idempotency. Test duplicate requests and concurrent changes."
    },
    "run": "python3 examples/beginner/advanced/run.py 13",
    "exampleFiles": [
      "examples/beginner/advanced/Stage13Concurrency.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "6단계 트랜잭션, 11단계 관측, 13단계 중복·멱등성. HTTP 접수 완료와 후속 처리 완료가 서로 다른 상태임을 먼저 정합니다.",
      "en": "Stage-6 transactions, stage-11 observation and stage-13 duplicates/idempotency. First distinguish HTTP acceptance from completion of follow-up work."
    },
    "scope": {
      "ko": "주문/outbox 저장·롤백·중복 효과 방지는 실제 H2 트랜잭션입니다. 브로커·재전송·큐·DLQ는 로컬 모형이며 Kafka 클러스터·네트워크 장애·재할당은 실행하지 않습니다.",
      "en": "Order/outbox persistence, rollback and duplicate-effect prevention use real H2 transactions. Broker/redelivery/queue/DLQ behavior is modeled locally; no Kafka cluster, network failure or reassignment is exercised."
    },
    "glossary": {
      "ko": "비동기: 요청자가 후속 완료를 기다리지 않고 진행. producer/consumer: 메시지 발행자/처리자. topic: 메시지 흐름의 이름. partition: 순서가 있는 로그 분할. offset: 파티션 안의 위치. consumer group: 분담 처리하는 소비자 묶음. outbox: 업무 저장과 함께 기록한 발행 의도. DLQ: 반복 실패한 메시지의 검토 대기 장소. 역압: 처리 한도에 맞춰 유입을 제한.",
      "en": "Asynchronous: proceed without waiting for follow-up completion. Producer/consumer: publisher/processor. Topic: a named message stream. Partition: an ordered log segment. Offset: position within a partition. Consumer group: consumers sharing work. Outbox: publication intent stored with business data. DLQ: a review destination for repeatedly failing messages. Backpressure: limiting intake to processing capacity."
    },
    "concepts": [
      {
        "title": {
          "ko": "Kafka를 큐 한 개로만 보면 놓치는 것",
          "en": "Kafka is more than one simple queue"
        },
        "body": {
          "ko": "Kafka는 파티션 로그에 레코드를 보관하고 소비자가 offset을 따라 읽습니다. 그룹 안의 처리 분담과 다른 그룹의 독립 읽기는 다른 개념입니다. 순서는 파티션 단위이며 모든 topic의 전역 순서가 아닙니다. 키 선택이 같은 업무의 순서와 부하 분산에 영향을 줍니다. 재시도 큐나 병렬 처리를 추가하면 애플리케이션의 효과 순서도 따로 검토해야 합니다.",
          "en": "Kafka retains records in partition logs; consumers read via offsets. Shared processing within a group differs from independent reading by another group. Ordering is per partition, not global across topics. Key choice affects ordering for related work and load distribution. Retry queues or parallel processing require separate consideration of application-effect ordering."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "DB 커밋과 발행 사이의 틈",
          "en": "The gap between commit and publication"
        },
        "body": {
          "ko": "주문 저장 뒤 직접 Kafka 발행이 실패하면 주문은 있는데 이벤트는 없을 수 있습니다. 먼저 발행하면 나중에 롤백된 주문을 알릴 수 있습니다. 주문과 outbox를 같은 DB 트랜잭션에 저장하고 relay가 나중에 발행하면 발행 의도를 잃지 않게 설계할 수 있습니다. 그래도 발행 확인 뒤 완료 표시 전에 죽으면 중복 발행이 가능합니다.",
          "en": "Publishing directly after saving an order can fail, leaving an order without an event. Publishing first can announce an order later rolled back. Storing order and outbox in one database transaction lets a relay publish later without losing publication intent. A crash after publication acknowledgment but before marking completion can still cause duplicate publication."
        },
        "code": "db.setAutoCommit(false);\n// INSERT purchase\n// INSERT outbox referencing that purchase\ndb.commit();\n// A relay publishes later; this is a different boundary.",
        "output": {
          "ko": "주문과 발행 의도는 함께 저장, 메시지 전달은 별도",
          "en": "Order and publication intent commit together; delivery is separate"
        }
      },
      {
        "title": {
          "ko": "한 번 전달과 한 번 효과는 다르다",
          "en": "One delivery differs from one effect"
        },
        "body": {
          "ko": "consumer는 처리 효과를 저장한 뒤 offset 확인 전에 종료될 수 있어 같은 이벤트를 다시 받습니다. 예제는 processed의 이벤트 ID 삽입과 effect 갱신을 한 트랜잭션으로 묶습니다. 중복 PK면 둘 다 롤백해 효과를 다시 적용하지 않습니다. 이것은 해당 DB 효과에 대한 중복 방지이지 모든 외부 결제·이메일까지 포함하는 exactly-once 보장이 아닙니다.",
          "en": "A consumer may stop after storing an effect but before acknowledging its offset, so the event can arrive again. The example inserts an event ID into processed and updates effect in one transaction. Duplicate primary keys roll back both, preventing a second effect. This deduplicates that database effect; it is not exactly-once across arbitrary external payments or email."
        },
        "code": "try {\n  insertProcessedEvent(db, eventId);\n  applyDatabaseEffect(db);\n  db.commit();\n} catch (SQLException duplicateOrFailure) {\n  db.rollback();\n  // Ignore only the expected duplicate-key case; rethrow other failures.\n}",
        "output": {
          "ko": "같은 event-1을 2번 전달 → effect=1",
          "en": "Deliver event-1 twice → effect=1"
        }
      },
      {
        "title": {
          "ko": "재시도, 순서, 역압, DLQ",
          "en": "Retries, ordering, backpressure and DLQ"
        },
        "body": {
          "ko": "일시 오류와 영구 입력 오류를 구분하고 재시도 횟수·대기·최종 경로를 제한합니다. DLQ로 보냈다는 사실은 업무가 성공했다는 뜻이 아닙니다. 원인·소유자·재처리·중복 방지 계획이 필요합니다. 크기 2인 큐의 세 번째 offer는 실패해야 하며 무한 메모리 증가로 받지 않습니다. Kafka lag와 outbox pending은 서로 다른 대기량이므로 함께 관측합니다.",
          "en": "Separate transient failures from permanent bad input and bound attempts, waiting and terminal handling. Reaching a DLQ does not mean business success; define cause, owner, replay and deduplication. A third offer to a capacity-two queue must fail instead of growing memory forever. Kafka lag and outbox pending measure different backlogs; observe both."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "접수·원자 저장",
          "en": "Accept and commit"
        },
        "body": {
          "ko": "요청을 검증하고 주문과 outbox를 함께 커밋합니다.",
          "en": "Validate and commit the order with its outbox row."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "relay",
          "en": "Relay"
        },
        "body": {
          "ko": "저장된 의도를 읽어 발행합니다. 확인을 잃으면 재발행될 수 있습니다.",
          "en": "Publish persisted intent; lost acknowledgment/marking can cause republication."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "소비·중복 방지",
          "en": "Consume and deduplicate"
        },
        "body": {
          "ko": "이벤트 ID와 업무 효과를 같은 트랜잭션으로 저장합니다.",
          "en": "Store the event ID and business effect in one transaction."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "완료·복구",
          "en": "Completion and recovery"
        },
        "body": {
          "ko": "offset·재시도·DLQ·대기량을 별도 상태로 확인합니다.",
          "en": "Inspect offsets, retries, DLQ and backlogs as separate states."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "Kafka가 이벤트를 받았다고 했는데 relay의 완료 표시가 실패하면 다음 시도에서 한 번 더 보낼 수 있을까요?",
      "en": "If Kafka accepted the event but the relay failed to mark it complete, can the next attempt publish it again?"
    },
    "answer": {
      "ko": "네. outbox는 발행 의도 유실을 줄이지만 중복 발행 가능성은 남습니다. 소비 효과를 멱등하게 설계해야 합니다.",
      "en": "Yes. Outbox preserves publication intent, but duplicate publication remains possible. Design idempotent consumer effects."
    },
    "guided": {
      "ko": "14단계를 실행해 두 번 전달에도 effect=1인지 확인합니다. 주문 2의 롤백 후 행 수 1도 확인합니다. 실제 H2 검증과 브로커·큐 모형 출력을 구분해 기록합니다.",
      "en": "Run stage 14 and verify effect=1 after duplicate delivery. Check one purchase remains after purchase-2 rollback. Record actual H2 checks separately from broker/queue-model output."
    },
    "failure": {
      "ko": "의도적 실패는 발행 완료 표시 유실과 poison 메시지입니다. 관측 순서: 주문/outbox 존재 → 발행 시도 → consumer 처리 ID → 업무 효과 → offset/DLQ. HTTP 200이나 Kafka lag 하나만으로 끝까지 성공했다고 결론 내리지 않습니다.",
      "en": "Deliberate failures are lost publication marking and a poison message. Inspect order/outbox existence → publication attempts → processed IDs → business effects → offset/DLQ. HTTP 200 or Kafka lag alone cannot establish end-to-end success."
    },
    "exercise": {
      "ko": "effect 갱신 직전에 예외가 나도록 독립 복사본을 수정하세요. processed ID도 롤백되어 재시도가 효과를 정확히 한 번 적용하는지 검사하세요. 이후 DB 커밋 뒤 응답을 잃은 경우를 모형으로 만들고 중복 전달 결과를 비교하세요.",
      "en": "In an independent copy, fail immediately before updating effect. Verify the processed ID rolls back too so retry applies the effect once. Then model losing acknowledgment after commit and compare the duplicate-delivery result."
    },
    "hint": {
      "ko": "processed를 먼저 별도 커밋하면 재시도가 “이미 처리됨”으로 빠져 실제 효과가 영원히 빠질 수 있습니다.",
      "en": "Committing processed separately first can make retries skip an effect that never happened."
    },
    "solution": {
      "ko": "processed 삽입과 effect 변경을 같은 트랜잭션에 유지합니다. 커밋 전 실패는 둘 다 0, 재시도 성공은 둘 다 1입니다. 커밋 후 재전달은 중복 키로 롤백해 둘 다 1을 유지합니다. 외부 부작용은 같은 트랜잭션에 들어가지 않으므로 별도 멱등 계약이 필요합니다.",
      "en": "Keep processed insertion and effect update in one transaction. Before-commit failure leaves both zero; successful retry makes both one. After-commit redelivery hits the duplicate key and keeps both one. External side effects need their own idempotency contract because they are outside this transaction."
    },
    "criteria": {
      "ko": "커밋 전/후 실패와 중복 전달을 구별하고 실제 효과·processed 불변성을 검사하며 Kafka 모형의 한계를 명시한다.",
      "en": "Distinguish before/after-commit failures and duplicate delivery; test effect/processed invariants and state Kafka-model limits."
    },
    "tradeoffs": {
      "ko": "비동기는 접수와 처리 속도를 분리하지만 최종 일관성·중복·순서·재처리·운영 부담을 추가합니다. 작고 빠른 작업은 동기 호출이 더 단순합니다.",
      "en": "Asynchrony separates intake and processing rates but adds eventual consistency, duplicates, ordering, replay and operational work. Small fast work may be simpler synchronously."
    },
    "sources": [
      {
        "label": {
          "ko": "Apache Kafka 설계·전달 의미",
          "en": "Apache Kafka design and delivery semantics"
        },
        "url": "https://kafka.apache.org/41/design/design/"
      }
    ],
    "id": "messaging",
    "title": {
      "ko": "14 · 비동기와 Kafka",
      "en": "14 · Asynchrony and Kafka"
    },
    "summary": {
      "ko": "worker·Kafka·outbox·재시도·순서·역압. 접수와 완료를 구별하고 실패 경계를 실험.",
      "en": "Workers, Kafka, outbox, retries, ordering and backpressure. Distinguish acceptance from completion and test failure boundaries."
    },
    "run": "python3 examples/beginner/advanced/run.py 14",
    "exampleFiles": [
      "examples/beginner/advanced/Stage14Messaging.java"
    ]
  },
  {
    "prerequisites": {
      "ko": "1–14단계. 독립 과제 기록을 검토하고 아직 도움 없이 못 하는 부분을 적습니다. 이 과정 완주나 참고 구현 실행을 취업 준비 완료로 간주하지 않습니다.",
      "en": "Stages 1–14. Review independent-work evidence and list what still requires help. Finishing pages or running a reference solution does not establish job readiness."
    },
    "scope": {
      "ko": "참고 구현은 순차 H2 서비스 경계 테스트입니다. HTTP 어댑터·운영 인증·동시 중복키 회복·실제 Kafka는 학습자가 통합하고 별도 검증할 과제입니다. LLM 부분은 출력 검증 모형이며 제공자 호출이 없습니다.",
      "en": "The reference checks sequential H2 service boundaries. HTTP adapters, production authentication, concurrent duplicate-key recovery and actual Kafka remain learner integration tasks with separate validation. The LLM section models output validation without provider calls."
    },
    "glossary": {
      "ko": "수용 기준: 완료를 판단할 관찰 가능한 조건. 불변식: 실패·재시도에도 유지할 관계. 어댑터: 외부 입출력을 업무 코드에 연결. 평가셋: 결과를 비교할 고정 입력과 기준. 근거 ID: 원본 관찰을 찾는 식별자. 예산: 시간·요청 수·입출력 크기·비용의 상한. fallback: 검증 실패 때 사용하는 제한된 대체 동작.",
      "en": "Acceptance criterion: an observable condition for completion. Invariant: a relation preserved across failure/retry. Adapter: connects external I/O to business code. Evaluation set: fixed inputs and criteria for comparing results. Evidence ID: identifies an original observation. Budget: bounds on time, requests, size or cost. Fallback: limited alternative behavior when validation fails."
    },
    "concepts": [
      {
        "title": {
          "ko": "작은 상품 API를 통합 과제로",
          "en": "Turn the small product API into an integration task"
        },
        "body": {
          "ko": "기존 total 계산에서 시작해 주문 생성·재고 차감·소유자 조회·멱등 키·outbox를 연결합니다. 한 번에 프레임워크를 더하지 말고 수용 조건별 세로 기능을 만듭니다. 첫 조건은 alice가 수량 2를 주문하면 total=2400, 재고 3→1, 주문 1개, outbox 1개입니다. 같은 의도 재시도는 같은 결과여야 하고 bob의 조회는 거절해야 합니다.",
          "en": "Evolve total calculation into order creation, stock decrement, owner access, idempotency keys and outbox. Build vertical slices per acceptance criterion instead of adding frameworks at once. First: alice orders quantity 2, yielding total=2400, stock 3→1, one order and one outbox row. Same-intent retry returns the same result; bob’s access is denied."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "참고 구현의 실제 보장과 한계",
          "en": "Reference guarantees and limits"
        },
        "body": {
          "ko": "예제는 권한과 수량을 검증하고 사용자+키의 이전 결과를 찾은 뒤 조건부 재고 차감·주문·outbox를 같은 트랜잭션에 저장합니다. 재고 부족은 롤백합니다. 순차 재시도와 키 payload 충돌을 검사하지만 두 연결이 동시에 같은 키를 넣는 경쟁에서 결과를 복원하는 로직은 포함하지 않습니다. 그 부분은 13단계의 동시성 설계와 고유 제약을 연결할 독립 과제입니다.",
          "en": "The example validates owner/quantity, looks up a previous user+key result, then conditionally decrements stock and saves order/outbox in one transaction. Insufficient stock rolls back. It checks sequential retries and payload conflicts, but does not recover the prior result when two connections concurrently insert the same key. Connecting stage-13 concurrency design with the unique constraint is an independent task."
        },
        "code": "Receipt first = order(db,\"alice\",\"alice\",\"k1\",2);\nReceipt retry = order(db,\"alice\",\"alice\",\"k1\",2);\n// Assert equal receipts, stock=1, purchase count=1, outbox count=1.",
        "output": {
          "ko": "total=2400, stock=1, purchase=1, outbox=1",
          "en": "total=2400, stock=1, purchase=1, outbox=1"
        }
      },
      {
        "title": {
          "ko": "실패를 설계하고 설명하기",
          "en": "Design and explain failure cases"
        },
        "body": {
          "ko": "정상 화면만 보여주지 말고 잘못된 수량, 다른 소유자, 같은 키의 다른 요청, 재고 부족, DB 실패, 중복 이벤트를 검사합니다. 재현 입력·실제 응답·상관 ID·DB 불변식·수정 근거를 기록합니다. 캐시나 비동기를 넣기 전에 단순 동기 버전이 맞는지 확인하고, 넣은 뒤 무엇이 개선됐고 무엇이 아직 불확실한지 분리합니다.",
          "en": "Do not demonstrate only a happy-path screen. Check invalid quantity, wrong owner, changed intent under one key, insufficient stock, database failure and duplicate events. Record reproduction input, actual response, correlation ID, database invariants and fix rationale. Validate the simple synchronous version before caching/asynchrony; then separate measured improvement from uncertainty."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "선택 과제: 제한된 LLM 설명",
          "en": "Optional: bounded LLM explanations"
        },
        "body": {
          "ko": "LLM은 필수가 아닙니다. 먼저 규칙 기반 설명과 고정 평가셋을 만듭니다. 실제 연동을 추가한다면 입력 근거만 전달하고 비밀을 제거하며 요청 시간·재시도·토큰·비용을 제한합니다. 출력은 스키마·크기·존재하는 근거 ID를 확인하고 실패 시 확정 진단 대신 제한된 대체 설명을 반환합니다. 예제는 512바이트와 근거 ID 검사를 모형으로 실행하며 유료 호출이나 제공자 품질을 평가하지 않습니다.",
          "en": "An LLM is optional. Start with a rule-based explanation and fixed evaluation set. If later integrating a provider, send only relevant evidence, remove secrets, and bound deadlines, retries, tokens and cost. Validate schema, size and existing evidence IDs; on failure return a limited fallback rather than a definite diagnosis. The example models a 512-byte/evidence-ID check; it makes no paid call or provider-quality evaluation."
        },
        "code": "Draft candidate = new Draft(\"Cause is proven\", Set.of(\"invented-id\"));\nDraft checked = evaluate(candidate, Set.of(\"e1\"));\n// Unknown citations must not be accepted as evidence.",
        "output": {
          "ko": "존재하지 않는 근거는 거절; 실제 제공자 평가 미실행",
          "en": "Unknown evidence rejected; actual provider evaluation not run"
        }
      },
      {
        "title": {
          "ko": "숙련 증거와 리뷰",
          "en": "Evidence of independent work and review"
        },
        "body": {
          "ko": "완료 체크 대신 저장소 diff, 실행 명령, 테스트 결과, 실패 분석, 독립적으로 설명한 설계 선택을 모읍니다. 도움 받은 부분은 숨기지 않습니다. 리뷰어가 새 입력을 주었을 때 재현·수정·검증할 수 있는지가 중요합니다. 예제 복사와 독립 구현, 자기 보고와 외부 리뷰, 모형과 실제 통합을 서로 다른 칸으로 기록합니다.",
          "en": "Collect diffs, commands, test results, failure analysis and design choices you can explain independently instead of merely checking completion. Disclose help received. What matters is whether you can reproduce, fix and verify a new case from a reviewer. Record copying versus independent implementation, self-report versus external review, and model versus actual integration separately."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "flow": [
      {
        "title": {
          "ko": "HTTP 어댑터",
          "en": "HTTP adapter"
        },
        "body": {
          "ko": "학습자가 계약과 인증된 사용자 문맥을 Service 요청으로 연결합니다. 참고 실행은 이 경계를 생략합니다.",
          "en": "The learner maps the HTTP contract and authenticated identity into the Service request; the reference run omits this boundary."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "정책·멱등성",
          "en": "Policy and idempotency"
        },
        "body": {
          "ko": "소유자·수량·같은 사용자 키의 의도를 검사합니다.",
          "en": "Check owner, quantity and intent under a user-scoped key."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "트랜잭션",
          "en": "Transaction"
        },
        "body": {
          "ko": "재고·주문·outbox의 불변식을 유지합니다.",
          "en": "Preserve stock/order/outbox invariants."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      },
      {
        "title": {
          "ko": "후속·근거",
          "en": "Follow-up and evidence"
        },
        "body": {
          "ko": "중복 안전한 소비와 관측을 추가하고 근거와 추론을 분리합니다.",
          "en": "Add duplicate-safe consumption and observation, separating evidence from inference."
        },
        "code": "",
        "output": {
          "ko": "",
          "en": ""
        }
      }
    ],
    "prediction": {
      "ko": "참고 코드와 모든 페이지를 실행하면 독립 구현과 실제 서비스 운영까지 검증됐다고 말할 수 있을까요?",
      "en": "Does running the reference code and finishing every page establish independent implementation and actual service-operation competence?"
    },
    "answer": {
      "ko": "아니요. 참고 실행은 특정 입력과 경계만 확인합니다. 새 요구 구현·실패 진단·실제 통합·리뷰 결과를 별도 증거로 남겨야 합니다.",
      "en": "No. Reference execution checks specific inputs and boundaries. Independent changes, diagnosis, real integration and review need separate evidence."
    },
    "guided": {
      "ko": "15단계를 실행하고 실제 H2 불변식과 LLM 검증 모형을 분리해 기록합니다. 기존 4단계 HTTP와 6단계 저장 테스트를 연결할 위치를 표시합니다. 아래 독립 과제를 작은 이슈로 나누고 코드 작성 전 수용 기준을 정합니다.",
      "en": "Run stage 15 and record actual H2 invariants separately from LLM-validation modeling. Identify how stage-4 HTTP and stage-6 persistence tests connect. Split the independent work below into small issues and define acceptance criteria before coding."
    },
    "failure": {
      "ko": "의도적 실패는 남은 재고 1에서 수량 2 주문입니다. 입력·소유자·키 → UPDATE 영향 행 → 롤백 → 재고/주문/outbox 수 확인 순으로 진단합니다. LLM 모형은 invented-id를 거절해야 하며 유창한 문장이 검증을 우회하지 못하게 합니다.",
      "en": "The deliberate failure orders quantity 2 with only 1 left. Diagnose input/owner/key → UPDATE row count → rollback → stock/order/outbox counts. The LLM model must reject invented-id; fluent prose must not bypass validation."
    },
    "exercise": {
      "ko": "독립 과제: 별도 학습 프로젝트에서 POST /orders와 소유자 주문 조회를 구현하세요. 사용자 문맥은 명시적인 테스트 fixture로 시작하고 운영 인증이라고 부르지 마세요. 정상·잘못된 수량·다른 소유자·같은 키 재시도·다른 payload·동시 같은 키·재고 부족·커밋 전 실패·이벤트 중복을 테스트하세요. 최소 1개 처음 보는 실패를 재현하고 수정한 뒤 리뷰 메모를 작성하세요.",
      "en": "Independently implement POST /orders and owner-scoped order reads in a separate learning project. Start with explicit identity fixtures and do not call them production authentication. Test success, invalid quantity, wrong owner, same-key retry, changed payload, concurrent same key, insufficient stock, pre-commit failure and duplicate events. Reproduce and fix at least one unfamiliar failure, then write review notes."
    },
    "hint": {
      "ko": "처음에는 HTTP→Service→DB 한 줄기를 완성합니다. 같은 키의 동시 삽입은 고유 제약 실패 후 트랜잭션을 정리하고 이미 저장된 결과를 새 읽기로 복원하는 설계가 필요합니다. 모든 예외를 성공으로 바꾸면 안 됩니다.",
      "en": "First complete one HTTP→Service→database slice. Concurrent same-key insertion needs a design that cleans up the failed transaction and reads the committed prior result afresh after a uniqueness conflict. Do not convert every exception into success."
    },
    "solution": {
      "ko": "수용표를 입력/기대 상태/DB 불변식/검증 경계로 나눕니다. 정상은 1주문=1outbox, 재시도는 같은 ID, 다른 payload는 충돌, 재고 부족·커밋 전 실패는 쓰기 없음, 중복 이벤트는 효과 1회여야 합니다. 동시성·실제 인증·Kafka·제공자 호출은 실행한 항목만 검증됨으로 표기합니다. 유일한 정답 코드를 복사하는 대신 이 계약으로 자기 구현을 평가합니다.",
      "en": "Build an acceptance table with input/status/database invariant/test boundary. Success means one order=one outbox; retry returns the same ID; changed payload conflicts; insufficient stock/pre-commit failure leaves no writes; duplicate events apply one effect. Mark concurrency, real authentication, Kafka and provider calls verified only when actually exercised. Evaluate your implementation against this contract instead of copying one supposed universal solution."
    },
    "criteria": {
      "ko": "독립 변경과 실패 수정의 diff·검사·설명·리뷰 기록을 제출하고, 실험하지 않은 운영/분산 경계를 정확히 밝힌다.",
      "en": "Submit independent-change/failure-fix diffs, checks, explanations and review evidence, accurately identifying untested operating/distributed boundaries."
    },
    "tradeoffs": {
      "ko": "기능을 많이 연결할수록 실패 경계와 운영 비용이 늘어납니다. 작은 정확한 서비스와 설명 가능한 검증이 우선입니다. LLM은 설명 보조이며 원인 확정·권한 판단·자동 복구의 권위가 아닙니다.",
      "en": "More components add failure boundaries and operating cost. Prioritize a small correct service with explainable verification. An LLM assists explanation; it is not authority for proven causes, permission decisions or automatic recovery."
    },
    "id": "capstone",
    "title": {
      "ko": "15 · 독립 프로젝트",
      "en": "15 · Independent capstone"
    },
    "summary": {
      "ko": "독립 구현·디버깅·근거 설명·리뷰. 선택적 LLM 연동은 비용·입출력 제한·평가를 포함하며 필수 아님.",
      "en": "Independent implementation, debugging, evidence explanation and review. Optional LLM work includes cost/input/output limits and evaluation; it is not required."
    },
    "run": "python3 examples/beginner/advanced/run.py 15",
    "exampleFiles": [
      "examples/beginner/advanced/Stage15Capstone.java"
    ]
  }
];
export const roadmap: Stage[] = [
  {
    "id": "tools",
    "title": {
      "ko": "01 · 파일에서 실행까지",
      "en": "01 · From files to running programs"
    },
    "summary": {
      "ko": "설치 없이 읽기부터 시작합니다. 작은 상품 메모 파일 하나가 모든 예제의 출발점입니다.",
      "en": "Begin by reading without installing anything. One small product note starts the evolving example."
    },
    "status": "available"
  },
  {
    "id": "java",
    "title": {
      "ko": "02 · Java로 작은 계산 만들기",
      "en": "02 · Small calculations in Java"
    },
    "summary": {
      "ko": "상품 가격 계산을 통해 문법부터 객체·예외까지 배웁니다. 서버나 Spring 없이 Java 파일 하나씩 실행합니다.",
      "en": "Learn syntax through objects and exceptions using product totals. Run one Java file at a time without a server or Spring."
    },
    "status": "available"
  },
  {
    "id": "http",
    "title": {
      "ko": "03 · 브라우저에서 HTTP까지",
      "en": "03 · From browser to HTTP"
    },
    "summary": {
      "ko": "같은 상품 계산을 HTTP로 요청합니다. Java 표준 라이브러리 서버 하나만 사용합니다.",
      "en": "Request the same product calculation over HTTP using one server from the Java standard library."
    },
    "status": "available"
  },
  {
    "id": "spring",
    "title": {
      "ko": "04 · Spring Boot로 API 나누기",
      "en": "04 · Separate an API with Spring Boot"
    },
    "summary": {
      "ko": "같은 상품 합계 기능을 Controller와 Service로 나눕니다. MySQL·Redis·Kafka 없이 실행하는 독립 예제입니다.",
      "en": "Split the same product-total feature into a Controller and Service. This standalone example needs no MySQL, Redis or Kafka."
    },
    "status": "available"
  },
  {
    "id": "persistence",
    "title": {
      "ko": "05 · 저장과 MySQL",
      "en": "05 · Persistence and MySQL"
    },
    "summary": {
      "ko": "표·행·키·관계·제약·SQL·CRUD. 재시작 후에도 상품을 보존하는 작은 저장 계층.",
      "en": "Tables, rows, keys, relations, constraints, SQL and CRUD. Add a small storage layer preserving products across restarts."
    },
    "status": "available"
  },
  {
    "id": "transactions",
    "title": {
      "ko": "06 · 트랜잭션과 데이터 접근",
      "en": "06 · Transactions and data access"
    },
    "summary": {
      "ko": "원자성·JDBC·JPA·생성 SQL·N+1·페이지네이션. 실제 SQL과 결과를 비교하는 연습.",
      "en": "Atomicity, JDBC, JPA, generated SQL, N+1 and pagination. Compare executed SQL with results."
    },
    "status": "available"
  },
  {
    "id": "security",
    "title": {
      "ko": "07 · 인증과 권한",
      "en": "07 · Authentication and authorization"
    },
    "summary": {
      "ko": "세션·쿠키·토큰·비밀번호 해싱·SQL 주입·XSS·CSRF·CORS를 구별하고 경계를 테스트.",
      "en": "Distinguish sessions, cookies, tokens, password hashing, SQL injection, XSS, CSRF and CORS; test boundaries."
    },
    "status": "available"
  },
  {
    "id": "testing",
    "title": {
      "ko": "08 · 테스트와 체계적 디버깅",
      "en": "08 · Testing and systematic debugging"
    },
    "summary": {
      "ko": "초기 단계의 작은 테스트를 단위·통합·HTTP 테스트로 확장. 재현→가설→한 가지 변경→재검증.",
      "en": "Expand early checks into unit, integration and HTTP tests. Reproduce, hypothesize, change one thing and verify."
    },
    "status": "available"
  },
  {
    "id": "collaboration",
    "title": {
      "ko": "09 · 협업과 CI",
      "en": "09 · Collaboration and CI"
    },
    "summary": {
      "ko": "이슈·브랜치·PR·리뷰·API 계약·CI. 작은 변경을 다른 사람이 검토할 수 있게 설명.",
      "en": "Issues, branches, PRs, review, API contracts and CI. Explain a small change so another person can review it."
    },
    "status": "available"
  },
  {
    "id": "operations",
    "title": {
      "ko": "10 · Linux와 배포",
      "en": "10 · Linux and deployment"
    },
    "summary": {
      "ko": "Linux·Docker·Compose·설정·상태 검사·배포·롤백. 작게 실행한 앱의 운영 경계부터 학습.",
      "en": "Linux, Docker, Compose, configuration, health checks, deployment and rollback. Start with the small app’s operating boundaries."
    },
    "status": "available"
  },
  {
    "id": "observability",
    "title": {
      "ko": "11 · 관측과 RCA",
      "en": "11 · Observability and RCA"
    },
    "summary": {
      "ko": "로그·지표·추적·지연 백분위·통제된 부하·근거 기반 RCA. 관찰과 추론을 구분.",
      "en": "Logs, metrics, traces, latency percentiles, controlled load and evidence-based RCA. Separate observations from inference."
    },
    "status": "available"
  },
  {
    "id": "performance",
    "title": {
      "ko": "12 · 성능과 Redis",
      "en": "12 · Performance and Redis"
    },
    "summary": {
      "ko": "인덱스·측정·Redis·캐시 적중·만료·무효화·대안. 측정 후 필요한 캐시만 추가.",
      "en": "Indexes, measurement, Redis, cache hits, expiry, invalidation and alternatives. Add caching only after measurement."
    },
    "status": "available"
  },
  {
    "id": "concurrency",
    "title": {
      "ko": "13 · 동시성과 멱등성",
      "en": "13 · Concurrency and idempotency"
    },
    "summary": {
      "ko": "격리 수준·경합·잠금·멱등성. 중복 요청과 동시에 발생하는 변경을 테스트.",
      "en": "Isolation levels, contention, locks and idempotency. Test duplicate requests and concurrent changes."
    },
    "status": "available"
  },
  {
    "id": "messaging",
    "title": {
      "ko": "14 · 비동기와 Kafka",
      "en": "14 · Asynchrony and Kafka"
    },
    "summary": {
      "ko": "worker·Kafka·outbox·재시도·순서·역압. 접수와 완료를 구별하고 실패 경계를 실험.",
      "en": "Workers, Kafka, outbox, retries, ordering and backpressure. Distinguish acceptance from completion and test failure boundaries."
    },
    "status": "available"
  },
  {
    "id": "capstone",
    "title": {
      "ko": "15 · 독립 프로젝트",
      "en": "15 · Independent capstone"
    },
    "summary": {
      "ko": "독립 구현·디버깅·근거 설명·리뷰. 선택적 LLM 연동은 비용·입출력 제한·평가를 포함하며 필수 아님.",
      "en": "Independent implementation, debugging, evidence explanation and review. Optional LLM work includes cost/input/output limits and evaluation; it is not required."
    },
    "status": "available"
  }
];
