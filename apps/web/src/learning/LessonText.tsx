// Format authored prose without changing its words or judging learner input.
export function splitLessonText(text: string): string[] {
  if (text.length < 180) return [text];
  const sentences = text.match(/[^]+?(?:[.!?]\s+(?=[A-Z가-힣0-9①-⑨])|$)/g)?.filter(Boolean) ?? [text];
  const result: string[] = [];
  let paragraph = "";
  for (const sentence of sentences) {
    paragraph += sentence;
    if (paragraph.length >= 170) { result.push(paragraph); paragraph = ""; }
  }
  if (paragraph) result.push(paragraph);
  return result.length ? result : [text];
}
export default function LessonText({ text, glossary = false }: { text: string; glossary?: boolean }) {
  const blocks = glossary ? text.match(/[^]+?(?:\.\s+(?=[A-Z가-힣][^:.]{0,38}:)|$)/g)?.filter(Boolean) ?? [text] : splitLessonText(text);
  if (!glossary && /^1\.\s/.test(text) && /\s2\.\s/.test(text)) {
    const starts = [...text.matchAll(/(?:^|\s)([1-9]\d?)\.\s/g)];
    if (starts.every((match, i) => Number(match[1]) === i + 1)) {
      const steps = starts.map((match, i) => text.slice(match.index, starts[i + 1]?.index));
      return <ol className="lesson-steps">{steps.map((body, i) => <li key={i}>{body}</li>)}</ol>;
    }
  }
  if (glossary) return <ul className="lesson-glossary">{blocks.map((body, i) => <li key={i}>{body}</li>)}</ul>;
  return <div className="lesson-prose">{blocks.map((body, i) => <p key={i}>{body}</p>)}</div>;
}
