import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type LeanQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

describe('lean challenge question bank', () => {
  it('provides an explanation for every lean question', () => {
    const source = readFileSync(
      new URL('../public/lean-challenge/questions.js', import.meta.url),
      'utf8',
    );
    const context: {
      window: {
        questionBank?: { lean: Record<string, LeanQuestion[]> };
      };
    } = { window: {} };

    runInNewContext(source, context);
    const questions = Object.values(context.window.questionBank?.lean ?? {}).flat();

    expect(questions).toHaveLength(34);
    expect(questions.every((question) => question.explanation.trim().length > 0)).toBe(true);
    expect(questions.every((question) => question.options.includes(question.answer))).toBe(true);
  });
});
