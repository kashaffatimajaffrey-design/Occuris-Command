import React, { useEffect, useState } from 'react';
import {
  Citation,
  OrderDetail,
  TimelineEvent,
  getOrder,
} from '../services/occuralog';

/**
 * One order's timeline, rendered from occuralog.
 *
 * Two contracts this component exists to honour:
 *
 *  - A citation must expand to the verbatim message, its author and its
 *    timestamp. Nothing here paraphrases a message; the text rendered is the
 *    text the API returned, which is the text in the source export.
 *
 *  - An inferred attribution is a guess and is never shown as though it were
 *    an explicit one. Inferred rows are visually distinct and labelled, and
 *    they are excluded entirely unless the reader asks for them.
 */

function formatStamp(event: { timestamp: string | null; timestamp_raw: string }): string {
  if (!event.timestamp) return event.timestamp_raw || 'unknown time';
  const date = new Date(event.timestamp);
  if (Number.isNaN(date.getTime())) return event.timestamp_raw || event.timestamp;
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  delivery_delay: 'bg-rose-50 text-rose-700 border-rose-200',
  dispatch_confirmation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  safety_incident: 'bg-amber-50 text-amber-800 border-amber-200',
  quality_rejection: 'bg-orange-50 text-orange-700 border-orange-200',
  material_shortage: 'bg-orange-50 text-orange-700 border-orange-200',
  unknown: 'bg-slate-50 text-slate-400 border-slate-200',
};

const TimelineRow: React.FC<{ event: TimelineEvent; n: number }> = ({ event, n }) => {
  const inferred = event.attribution === 'inferred';
  return (
    <li
      className={`relative pl-8 pb-6 border-l-2 ${
        inferred ? 'border-dashed border-slate-300' : 'border-indigo-100'
      }`}
    >
      <span
        className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${
          inferred ? 'bg-slate-300' : 'bg-indigo-400'
        }`}
      />
      <div
        className={`rounded-2xl border p-4 ${
          inferred ? 'border-dashed border-slate-300 bg-slate-50/60' : 'border-indigo-50 bg-white'
        }`}
      >
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <span className="text-[10px] font-black text-indigo-400">[{n}]</span>
          <span className="text-sm font-bold text-slate-800">{event.sender}</span>
          <span className="text-[11px] text-slate-400 font-medium">{formatStamp(event)}</span>
          {inferred && (
            <span
              className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full
                         bg-slate-200 text-slate-600 border border-slate-300"
              title="Attached to this order by a model, not by the message stating the order number"
            >
              inferred
            </span>
          )}
        </div>

        {/* Verbatim. Not summarised, not translated. */}
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{event.text}</p>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {event.event_types.map((type) => (
            <span
              key={type}
              className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${
                EVENT_TYPE_STYLES[type] ?? 'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
};

const CitationList: React.FC<{ citations: Citation[] }> = ({ citations }) => (
  <div className="bg-white rounded-2xl border border-indigo-50 p-5">
    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
      Citations
    </h3>
    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
      Each marker resolves to one message. An answer citing{' '}
      <span className="font-mono font-bold">[3]</span> can be checked against citation 3.
    </p>
    <ol className="space-y-3">
      {citations.map((citation) => (
        <li key={citation.n} className="text-xs">
          <span className="font-mono font-black text-indigo-500">[{citation.n}]</span>{' '}
          <span className="font-bold text-slate-700">{citation.sender}</span>{' '}
          <span className="text-slate-400">{formatStamp(citation)}</span>
          {citation.attribution === 'inferred' && (
            <span className="ml-1 text-[9px] font-black uppercase text-slate-500">inferred</span>
          )}
          <div className="text-slate-600 mt-0.5 leading-snug">{citation.text}</div>
        </li>
      ))}
    </ol>
  </div>
);

interface Props {
  sessionId: string;
  orderNo: string;
}

const OrderTimeline: React.FC<Props> = ({ sessionId, orderNo }) => {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [includeInferred, setIncludeInferred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOrder(sessionId, orderNo, includeInferred)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, orderNo, includeInferred]);

  if (loading) {
    return <p className="text-sm text-slate-400 py-10 text-center">Loading order {orderNo}…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <div className="text-sm font-black text-rose-700 mb-1">Could not load order {orderNo}</div>
        <div className="text-xs font-mono text-rose-600 break-words">{error}</div>
      </div>
    );
  }

  if (!detail) return null;

  const openDelay = includeInferred ? detail.open_delay_including_inferred : detail.open_delay;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Order {detail.order_no}</h2>
          <p className="text-xs text-slate-400 font-medium">
            {detail.event_count} explicit event{detail.event_count === 1 ? '' : 's'}
            {detail.inferred_event_count > 0 && ` · ${detail.inferred_event_count} inferred`}
            {detail.last_activity && ` · last activity ${formatStamp({
              timestamp: detail.last_activity,
              timestamp_raw: '',
            })}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {openDelay && (
            <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full
                             bg-rose-100 text-rose-700 border border-rose-200">
              Open delay
            </span>
          )}
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInferred}
              onChange={(e) => setIncludeInferred(e.target.checked)}
              className="accent-indigo-500"
            />
            Show inferred
          </label>
        </div>
      </div>

      {includeInferred && detail.inferred_event_count > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600 leading-relaxed">
          Rows marked <span className="font-black uppercase">inferred</span> were attached to this
          order by a model reading the surrounding conversation, not because the message names the
          order. They are shown with a dashed border and are excluded from the event count and the
          open-delay flag.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {detail.timeline.length === 0 ? (
            <p className="text-sm text-slate-400">This order has no events.</p>
          ) : (
            <ol className="ml-2">
              {detail.timeline.map((event, index) => (
                <TimelineRow key={`${event.timestamp}-${index}`} event={event} n={index + 1} />
              ))}
            </ol>
          )}
        </div>
        <CitationList citations={detail.citations} />
      </div>
    </div>
  );
};

export default OrderTimeline;
