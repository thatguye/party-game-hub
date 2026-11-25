import { QuestionPair, WordEntry } from '../../types/game';

export function w(
  cat: string,
  items: Array<[string, string, string, string]>
): WordEntry[] {
  return items.map(([word, description, h1, h2], i) => ({
    id: `${cat}-w-${i + 1}`,
    word,
    description,
    hints: [h1, h2],
  }));
}

export function q(cat: string, items: Array<[string, string]>): QuestionPair[] {
  return items.map(([main, decoy], i) => ({
    id: `${cat}-q-${i + 1}`,
    main,
    decoy,
  }));
}
