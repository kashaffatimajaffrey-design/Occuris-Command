import React, { useEffect, useRef, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import {
  OrderSummary,
  getOrders,
  ingestExport,
  occuralogBaseUrl,
} from '../services/occuralog';
import OrderTimeline from './OrderTimeline';

/**
 * Upload an export, browse that session's orders, open one timeline.
 *
 * This is the vertical slice: ingestion through to a rendered timeline with
 * citations, over the real occuralog API. Every failure along the way is
 * surfaced; nothing falls back to sample data.
 */

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

const UploadPanel: React.FC = () => {
  const { selectSession, refresh } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const session = await ingestExport(file);
      await refresh();
      selectSession(session.session_id);
    } catch (err) {
      // Upload failures are shown, with whatever occuralog said about them —
      // a file with no recognisable messages says so explicitly.
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-indigo-50 shadow-sm p-6">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">
        Upload a WhatsApp export
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Export the group chat as a .txt file and upload it here. Parsing happens in occuralog at{' '}
        <span className="font-mono">{occuralogBaseUrl()}</span>.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4
                   file:rounded-xl file:border-0 file:text-xs file:font-bold
                   file:bg-indigo-500 file:text-white hover:file:bg-indigo-600
                   file:cursor-pointer disabled:opacity-50"
      />

      {busy && <p className="text-xs text-slate-400 mt-3">Parsing export…</p>}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs font-black text-rose-700 mb-1">Upload failed</div>
          <div className="text-[11px] font-mono text-rose-600 break-words">{error}</div>
        </div>
      )}
    </div>
  );
};

const SessionPicker: React.FC = () => {
  const { sessions, sessionId, selectSession, session } = useSession();
  if (sessions.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-indigo-50 shadow-sm p-6">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Session</h3>
      <select
        value={sessionId ?? ''}
        onChange={(e) => selectSession(e.target.value || null)}
        className="w-full text-xs border border-indigo-100 rounded-xl px-3 py-2 bg-white
                   focus:outline-none focus:ring-4 focus:ring-indigo-500/5"
      >
        <option value="">Select a session…</option>
        {sessions.map((s) => (
          <option key={s.session_id} value={s.session_id}>
            {s.original_filename} · {s.event_count} events · {formatDate(s.created_at)}
          </option>
        ))}
      </select>

      {session && (
        <dl className="mt-4 space-y-1 text-[11px] text-slate-500">
          <div className="flex justify-between">
            <dt>Messages parsed</dt>
            <dd className="font-bold text-slate-700">{session.stats.total_messages}</dd>
          </div>
          <div className="flex justify-between">
            <dt title="Share of messages where some keyword matched. Not accuracy.">
              Keyword match rate
            </dt>
            <dd className="font-bold text-slate-700">{session.stats.classification_rate}%</dd>
          </div>
          {session.attribution && (
            <div className="flex justify-between">
              <dt>Attribution</dt>
              <dd className="font-bold text-slate-700">
                {session.attribution.explicit} explicit · {session.attribution.inferred} inferred
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
};

const Orders: React.FC = () => {
  const { sessionId, loading: sessionLoading, error: sessionError } = useSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setOrders([]);
      setSelectedOrder(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOrders(sessionId)
      .then((result) => {
        if (cancelled) return;
        setOrders(result.orders);
        setSelectedOrder((current) =>
          current && result.orders.some((o) => o.order_no === current) ? current : null
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setOrders([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Orders</h1>
        <p className="text-slate-400 text-sm font-medium">
          Parsed from a WhatsApp export. Most recent activity first.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <UploadPanel />
          <SessionPicker />
        </div>

        <div className="lg:col-span-2">
          {sessionError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 mb-4">
              <div className="text-sm font-black text-rose-700 mb-1">Session problem</div>
              <div className="text-xs font-mono text-rose-600 break-words">{sessionError}</div>
            </div>
          )}

          {!sessionLoading && !sessionId && (
            <div className="bg-white rounded-3xl border border-indigo-50 shadow-sm p-10 text-center">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="text-sm font-black text-slate-800 mb-1">No session selected</h3>
              <p className="text-xs text-slate-500">
                Upload a WhatsApp export, or pick an existing session.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <div className="text-sm font-black text-rose-700 mb-1">Could not load orders</div>
              <div className="text-xs font-mono text-rose-600 break-words">{error}</div>
            </div>
          )}

          {loading && <p className="text-sm text-slate-400 py-8 text-center">Loading orders…</p>}

          {!loading && !error && sessionId && orders.length > 0 && !selectedOrder && (
            <div className="bg-white rounded-3xl border border-indigo-50 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-indigo-50/30 border-b border-indigo-50">
                  <tr>
                    {['Order', 'Last activity', 'Events', 'State'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50/50">
                  {orders.map((order) => (
                    <tr
                      key={order.order_no}
                      onClick={() => setSelectedOrder(order.order_no)}
                      className="hover:bg-indigo-50/20 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <span className="text-sm font-mono font-bold text-indigo-500">
                          {order.order_no}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {formatDate(order.last_activity)}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 font-semibold">
                        {order.event_count}
                        {order.inferred_event_count > 0 && (
                          <span className="text-slate-400 font-medium">
                            {' '}
                            +{order.inferred_event_count} inferred
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {order.open_delay ? (
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-rose-100 text-rose-700">
                            Open delay
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && sessionId && orders.length === 0 && (
            <p className="text-sm text-slate-400 py-8 text-center">
              This session contains no orders.
            </p>
          )}

          {selectedOrder && sessionId && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-600"
              >
                ← All orders
              </button>
              <OrderTimeline sessionId={sessionId} orderNo={selectedOrder} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
