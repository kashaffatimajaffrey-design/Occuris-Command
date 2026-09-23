import React, { useEffect, useRef, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { Citation, OrderDetail, OrderSummary, getOrder, getOrders } from '../services/occuralog';
import { AnswerSegment, segmentAnswer, unresolvedRefs } from '../services/citations';
import { sendMessage } from '../services/llmService';

/**
 * Ask questions about one order, answered only from that order's messages.
 *
 * The agent is given the order's `prompt_context` — its timeline rendered with
 * [n] markers — and instructed to answer from it and cite. Every marker in the
 * answer is resolved back to the message it points at, and a marker that
 * points at nothing is shown as unresolved rather than dropped.
 *
 * This exists because a model will invent detail. Asked about a timeline that
 * says only "the truck broke down", llama3.1:8b answered "the driver's
 * transmission failed". The citation is what lets a reader catch that in one
 * click, which is the whole reason the contract is enforced here.
 */

function systemPrompt(orderNo: string): string {
  return [
    `You answer questions about order ${orderNo} for a steel fabrication company.`,
    '',
    'You are given that order\'s messages, each numbered like [1], [2], [3].',
    'Answer ONLY from those messages. Do not add detail that is not in them, and',
    'do not guess a cause, a date or a quantity that is not stated.',
    '',
    'Cite every factual claim with the marker of the message it came from, like',
    '"the truck did not arrive [2]". Cite only numbers that exist in the list.',
    '',
    'If the messages do not answer the question, say so plainly and do not',
    'speculate. A line marked "(inferred)" was attached to this order by a model',
    'rather than by the message naming it; treat it as less certain and say so if',
    'you rely on it.',
  ].join('\n');
}

function formatStamp(value: string | null, fallback: string): string {
  if (!value) return fallback || 'unknown time';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback || value
    : date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

const CitationChip: React.FC<{
  n: number;
  citation: Citation | null;
  onClick: () => void;
}> = ({ n, citation, onClick }) =>
  citation ? (
    <button
      onClick={onClick}
      title={`${citation.sender} · ${formatStamp(citation.timestamp, citation.timestamp_raw)}`}
      className="inline-flex items-center align-baseline mx-0.5 px-1.5 rounded-md text-[11px]
                 font-black font-mono bg-indigo-100 text-indigo-700 hover:bg-indigo-200
                 border border-indigo-200 transition-colors"
    >
      [{n}]
    </button>
  ) : (
    <span
      title="This citation points at a message that does not exist in this order."
      className="inline-flex items-center align-baseline mx-0.5 px-1.5 rounded-md text-[11px]
                 font-black font-mono bg-rose-100 text-rose-700 border border-rose-300"
    >
      [{n}] unresolved
    </span>
  );

const CitationCard: React.FC<{ citation: Citation }> = ({ citation }) => (
  <div
    className={`rounded-xl border p-3 ${
      citation.attribution === 'inferred'
        ? 'border-dashed border-slate-300 bg-slate-50'
        : 'border-indigo-100 bg-indigo-50/40'
    }`}
  >
    <div className="flex items-center gap-2 flex-wrap mb-1">
      <span className="font-mono font-black text-indigo-600 text-[11px]">[{citation.n}]</span>
      <span className="text-xs font-bold text-slate-800">{citation.sender}</span>
      <span className="text-[10px] text-slate-400">
        {formatStamp(citation.timestamp, citation.timestamp_raw)}
      </span>
      {citation.attribution === 'inferred' && (
        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
          inferred
        </span>
      )}
    </div>
    {/* Verbatim, exactly as it appears in the source export. */}
    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{citation.text}</p>
  </div>
);

interface Turn {
  id: string;
  role: 'user' | 'model';
  content: string;
  provider?: string;
  model?: string;
  degraded?: boolean;
  primaryError?: string;
  /** The citations that were in scope when this answer was produced. */
  citations?: Citation[];
}

const AgentChat: React.FC = () => {
  const { sessionId, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [orderNo, setOrderNo] = useState<string>('');
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [includeInferred, setIncludeInferred] = useState(false);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCitation, setOpenCitation] = useState<Citation | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    getOrders(sessionId)
      .then((result) => setOrders(result.orders))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !orderNo) {
      setDetail(null);
      return;
    }
    setTurns([]);
    setOpenCitation(null);
    getOrder(sessionId, orderNo, includeInferred)
      .then(setDetail)
      .catch((err) => {
        setDetail(null);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [sessionId, orderNo, includeInferred]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, busy]);

  async function ask() {
    const question = input.trim();
    if (!question || !detail || busy) return;

    const userTurn: Turn = { id: `${Date.now()}-u`, role: 'user', content: question };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setBusy(true);
    setError(null);

    try {
      const reply = await sendMessage(
        systemPrompt(detail.order_no),
        // The order's own messages are the entire context. History is the
        // conversation so far, so a follow-up question keeps its thread.
        [
          {
            id: 'context',
            role: 'user',
            content: `Messages for order ${detail.order_no}:\n\n${detail.prompt_context}`,
            timestamp: Date.now(),
            agentId: detail.order_no,
          },
          ...turns.map((t) => ({
            id: t.id,
            role: t.role,
            content: t.content,
            timestamp: Date.now(),
            agentId: detail.order_no,
          })),
        ],
        question
      );

      setTurns((prev) => [
        ...prev,
        {
          id: `${Date.now()}-m`,
          role: 'model',
          content: reply.text,
          provider: reply.provider,
          model: reply.model,
          degraded: reply.degraded,
          primaryError: reply.primary_error ?? undefined,
          citations: detail.citations,
        },
      ]);
    } catch (err) {
      // A failed call is an error, never a model message.
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const renderAnswer = (turn: Turn) => {
    const citations = turn.citations ?? [];
    const segments: AnswerSegment[] = segmentAnswer(turn.content, citations);
    const unresolved = unresolvedRefs(turn.content, citations);

    return (
      <>
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
          {segments.map((segment, i) =>
            segment.kind === 'text' ? (
              <span key={i}>{segment.text}</span>
            ) : (
              <CitationChip
                key={i}
                n={segment.n}
                citation={segment.citation}
                onClick={() => setOpenCitation(segment.citation)}
              />
            )
          )}
        </div>

        {unresolved.length > 0 && (
          <div className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2">
            <div className="text-[10px] font-black uppercase tracking-wide text-rose-800">
              {unresolved.length === 1 ? 'A citation does not resolve' : 'Citations do not resolve'}
            </div>
            <div className="text-[11px] text-rose-700 mt-0.5">
              {unresolved.map((n) => `[${n}]`).join(', ')}{' '}
              {unresolved.length === 1
                ? 'points at a message that is not in this order. Treat the claim it supports as unsupported.'
                : 'point at messages that are not in this order. Treat the claims they support as unsupported.'}
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-400 mt-2 font-medium">
          {turn.provider && (
            <>
              via {turn.provider}
              {turn.model ? ` · ${turn.model}` : ''}
            </>
          )}
        </div>

        {turn.degraded && (
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            <div className="text-[10px] font-black uppercase tracking-wide text-amber-800">
              Degraded answer — fallback provider
            </div>
            {turn.primaryError && (
              <div className="text-[10px] font-mono text-amber-700 mt-1 break-words">
                {turn.primaryError}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  if (!sessionLoading && !sessionId) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-50 p-10 text-center">
        <div className="text-3xl mb-3">💬</div>
        <h3 className="text-sm font-black text-slate-800 mb-1">No session selected</h3>
        <p className="text-xs text-slate-500">Upload a WhatsApp export to ask about an order.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-indigo-50 overflow-hidden shadow-sm">
      <div className="border-b border-indigo-50 bg-indigo-50/10 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ask an order</h2>
          <select
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            className="text-xs border border-indigo-100 rounded-xl px-3 py-1.5 bg-white
                       focus:outline-none focus:ring-4 focus:ring-indigo-500/5"
          >
            <option value="">Select an order…</option>
            {orders.map((o) => (
              <option key={o.order_no} value={o.order_no}>
                {o.order_no} — {o.event_count} event{o.event_count === 1 ? '' : 's'}
                {o.open_delay ? ' · open delay' : ''}
              </option>
            ))}
          </select>

          {detail && (
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInferred}
                onChange={(e) => setIncludeInferred(e.target.checked)}
                className="accent-indigo-500"
              />
              Include inferred messages
            </label>
          )}
        </div>

        {detail && (
          <p className="text-[11px] text-slate-400 mt-2">
            Answering from {detail.timeline.length} message
            {detail.timeline.length === 1 ? '' : 's'}. Every claim should carry a citation you can
            open.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
        {!detail && (
          <p className="text-sm text-slate-400 text-center py-10">
            Select an order to ask about it.
          </p>
        )}

        {detail && turns.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">
            Ask something about order {detail.order_no} — for example, why it was delayed.
          </p>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                turn.role === 'user'
                  ? 'bg-indigo-400 text-white rounded-br-none'
                  : 'bg-white border border-indigo-50 rounded-bl-none'
              }`}
            >
              {turn.role === 'user' ? (
                <div className="text-sm font-medium">{turn.content}</div>
              ) : (
                renderAnswer(turn)
              )}
            </div>
          </div>
        ))}

        {busy && <p className="text-xs text-slate-400 text-center">Thinking…</p>}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3">
            <div className="text-xs font-black text-rose-700 mb-1">Could not get an answer</div>
            <div className="text-[11px] font-mono text-rose-600 break-words">{error}</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {openCitation && (
        <div className="border-t border-indigo-100 bg-white p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Citation [{openCitation.n}] — verbatim source
            </span>
            <button
              onClick={() => setOpenCitation(null)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
            >
              close
            </button>
          </div>
          <CitationCard citation={openCitation} />
        </div>
      )}

      <div className="p-5 border-t border-indigo-50 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            disabled={!detail || busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder={detail ? `Ask about order ${detail.order_no}…` : 'Select an order first'}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-indigo-50 rounded-xl text-sm
                       focus:outline-none focus:ring-4 focus:ring-indigo-500/5 disabled:opacity-50"
          />
          <button
            onClick={ask}
            disabled={!detail || busy || !input.trim()}
            className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-bold
                       hover:bg-indigo-600 disabled:opacity-40 transition-colors"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
