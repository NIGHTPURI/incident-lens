import { describe, expect, it } from "vitest";
import { chapters } from "./curriculum";
import { chapterForPlatform, platformKey, platformPreparation, readPlatform, savePlatform, shellReference, stageCommands } from "./platform";

describe("learning platform variants", () => {
  it("keeps an explicit choice across host and language changes; handles blocked/corrupt storage", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(readPlatform(storage, "Win32")).toBe("windows");
    expect(readPlatform(storage, "Linux x86_64")).toBe("linux");
    expect(savePlatform(storage, "linux")).toBe(true);
    expect(readPlatform(storage, "Win32")).toBe("linux");
    values.set(platformKey, "unknown"); expect(readPlatform(storage, "Win32")).toBe("windows");
    const blocked = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } };
    expect(readPlatform(blocked, "Win32")).toBe("windows");
    expect(savePlatform(blocked, "windows")).toBe(false);
    expect([...values.keys()]).toEqual([platformKey]);
  });
  it("covers every stage without leaking Bash-only commands into Windows snippets", () => {
    expect(Object.keys(stageCommands)).toEqual(chapters.map(chapter => chapter.id));
    for (const chapter of chapters) {
      const original = JSON.stringify(chapter);
      for (const platform of ["windows", "linux"] as const) {
        const variant = chapterForPlatform(chapter, platform);
        expect(variant.run.trim()).not.toBe("");
        const preparation = platformPreparation(platform, chapter.id);
        expect(preparation.body.ko).toBeTruthy(); expect(preparation.body.en).toBeTruthy();
        expect(preparation.troubleshooting.ko).toBeTruthy(); expect(preparation.troubleshooting.en).toBeTruthy();
        if (platform === "windows") {
          const snippets = [variant.run, ...variant.concepts.map(section => section.code), preparation.code].join("\n");
          expect(snippets).not.toMatch(/\.\/gradlew|python3 |curl -|ps -p|ss -ltn|PRODUCT_NAME=Notebook sh/);
          expect(variant.failure.en).not.toContain("cat examples/");
          expect(variant.prerequisites.en).not.toContain("use a WSL Ubuntu terminal");
        }
      }
      expect(JSON.stringify(chapter)).toBe(original);
    }
    expect(chapterForPlatform(chapters[0], "windows").concepts[2].code).toContain("finally");
    expect(chapterForPlatform(chapters[3], "windows").run).toContain("gradlew.bat");
    expect(shellReference.windows.code).toContain("lesson-classes;.");
    expect(shellReference.linux.code).toContain("lesson-classes:.");
  });
});
