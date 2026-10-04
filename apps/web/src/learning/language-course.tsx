import type { Locale } from "../i18n/translations";
import type { CodeLanguage } from "./programming-tracks";
import { courseChapters } from "./language-course-data";

export const coursePhases = [
  { id: "api", ko: "1 · HTTP API", en: "1 · HTTP API" },
  { id: "db", ko: "2 · 데이터베이스", en: "2 · Database" },
  { id: "auth", ko: "3 · 인증·권한", en: "3 · Identity & access" },
  { id: "tests", ko: "4 · 테스트", en: "4 · Tests" },
  { id: "deployment", ko: "5 · 배포·운영", en: "5 · Deployment" },
] as const;
export type PhaseId = typeof coursePhases[number]["id"];
export type Copy = { ko: string; en: string };
export type Chapter = {
  intro: Copy; flow: Copy; code: string; codeScope: Copy;
  failure: Copy; guided: Copy; independent: Copy; source: string;
};
export function LanguageCourse({ language, locale }: { language: Exclude<CodeLanguage, "java">; locale: Locale }) {
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  return <div className="language-course">
    {coursePhases.map(phase => {
      const chapter = courseChapters[language][phase.id];
      return <section key={phase.id} className="language-course-chapter" aria-labelledby={`track-${phase.id}`}>
        <span className="learning-kicker">{t("같은 상품·주문 도메인", "One catalog/order domain")}</span>
        <h2 id={`track-${phase.id}`} tabIndex={-1}>{t(phase.ko, phase.en)}</h2>
        <p>{chapter.intro[locale]}</p>
        <div className="learning-box"><strong>{t("요청·데이터 흐름", "Request/data flow")}</strong><p>{chapter.flow[locale]}</p></div>
        <h3>{t("초점 코드", "Focused code")}</h3><pre><code>{chapter.code}</code></pre>
        <p className="language-example-scope">{chapter.codeScope[locale]}</p>
        <h3>{t("실패 시 확인", "When it fails")}</h3><p>{chapter.failure[locale]}</p>
        <h3>{t("따라 해 보기", "Guided practice")}</h3><p>{chapter.guided[locale]}</p>
        <h3>{t("혼자 풀기", "Independent work")}</h3><p>{chapter.independent[locale]}</p>
        <a href={chapter.source} target="_blank" rel="noreferrer">{t("공식 문서", "Official documentation")} ↗</a>
      </section>;
    })}
  </div>;
}
