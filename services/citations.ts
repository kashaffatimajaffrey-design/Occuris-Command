import { Citation } from './occuralog';

/**
 * Resolving [n] markers in a model's answer back to real messages.
 *
 * This is the product contract: an answer reading "the truck broke down [3]"
 * must let the reader expand [3] to the verbatim message, its author and its
 * timestamp. A citation that renders but resolves to the wrong message is
 * worse than no citation, so the rules here are deliberately strict:
 *
 *  - `n` is a 1-based index into the order's `citations`, which is itself
 *    aligned 1:1 with its `timeline`. Nothing is matched by text.
 *  - A marker outside that range does not silently disappear and is never
 *    quietly clamped to a neighbour. It is surfaced as unresolved, so an
 *    answer citing a message that does not exist is visible as exactly that.
 *
 * The reason this matters concretely: given a timeline saying only "the truck
 * broke down", a small model will happily answer "the driver's transmission
 * failed". The citation is what lets a reader catch that.
 */

/** One [n] occurrence in an answer. */
export interface CitationRef {
  n: number;
  /** The citation it resolves to, or null when `n` is out of range. */
  citation: Citation | null;
}

export type AnswerSegment =
  | { kind: 'text'; text: string }
  | { kind: 'citation'; n: number; citation: Citation | null };

const MARKER = /\[(\d{1,3})\]/g;

/**
 * Split an answer into plain text and citation markers, in order.
 * Rendering this preserves the answer exactly; nothing is rewritten.
 */
export function segmentAnswer(answer: string, citations: Citation[]): AnswerSegment[] {
  const byNumber = new Map(citations.map((c) => [c.n, c]));
  const segments: AnswerSegment[] = [];
  let cursor = 0;

  for (const match of answer.matchAll(MARKER)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ kind: 'text', text: answer.slice(cursor, index) });
    }
    const n = Number(match[1]);
    segments.push({ kind: 'citation', n, citation: byNumber.get(n) ?? null });
    cursor = index + match[0].length;
  }

  if (cursor < answer.length) {
    segments.push({ kind: 'text', text: answer.slice(cursor) });
  }
  return segments;
}

/** Every distinct marker in an answer, in first-appearance order. */
export function citedRefs(answer: string, citations: Citation[]): CitationRef[] {
  const byNumber = new Map(citations.map((c) => [c.n, c]));
  const seen = new Set<number>();
  const refs: CitationRef[] = [];

  for (const match of answer.matchAll(MARKER)) {
    const n = Number(match[1]);
    if (seen.has(n)) continue;
    seen.add(n);
    refs.push({ n, citation: byNumber.get(n) ?? null });
  }
  return refs;
}

/** Markers that point at no message. Non-empty means the answer cited something absent. */
export function unresolvedRefs(answer: string, citations: Citation[]): number[] {
  return citedRefs(answer, citations)
    .filter((ref) => ref.citation === null)
    .map((ref) => ref.n);
}
