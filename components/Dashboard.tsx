import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import {
  OrderDetail,
  OrderSummary,
  TimelineEvent,
  getOrder,
  getOrders,
} from '../services/occuralog';

/**
 * Overview, built from the parsed event stream.
 *
 * Every figure here is decidable from the events. There is no risk score,
 * because no risk model exists — the orders shown as needing attention are
 * exactly the ones whose most recent delay is not followed by a dispatch,
 * which is a rule, not an estimate.
 *
 * All counts are explicit-attribution only, matching the order table. Inferred
 * attributions are reported separately and never folded into a headline
 * number.
 */

const RECENT_ORDER_COUNT = 5;

function formatStamp(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </div>
    <div className="text-2xl font-black text-slate-800">{value}</div>
    {hint && <div className="text-[11px] text-slate-400 mt-1 leading-snug">{hint}</div>}
  </div>
);

const Dashboard: React.FC = () => {
  const { sessionId, session, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [recent, setRecent] = useState<{ order: OrderSummary; event: TimelineEvent }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setOrders([]);
      setRecent([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const result = await getOrders(sessionId);
      if (cancelled) return;
      setOrders(result.orders);

      // The orders list carries last_activity but not the message itself, so
      // the few most recently active orders are fetched for their latest row.
      const top = result.orders.filter((o) => o.last_activity).slice(0, RECENT_ORDER_COUNT);
      const details = await Promise.all(
        top.map((order) =>
          getOrder(sessionId, order.order_no)
            .then((detail: OrderDetail) => ({ order, detail }))
            .catch(() => null)
        )
      );
      if (cancelled) return;

      setRecent(
        details
          .filter((d): d is { order: OrderSummary; detail: OrderDetail } => d !== null)
          .map(({ order, detail }) => ({ order, event: detail.timeline[detail.timeline.length - 1] }))
          .filter((row) => row.event)
      );
    })()
      .catch((err) => {
        if (cancelled) return;
        setOrders([]);
        setRecent([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const openDelays = orders.filter((o) => o.open_delay);
  const inferredTotal = orders.reduce((sum, o) => sum + o.inferred_event_count, 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Overview</h1>
        <p className="text-slate-400 text-sm font-medium">
          {session
            ? `${session.original_filename} · ${session.stats.total_messages} messages parsed`
            : 'Every figure here is derived from parsed events.'}
        </p>
      </div>

      {!sessionLoading && !sessionId && (
        <div className="bg-white rounded-3xl border border-indigo-50 shadow-sm p-10 text-center">
          <div className="text-3xl mb-3">📄</div>
          <h3 className="text-sm font-black text-slate-800 mb-1">No session selected</h3>
          <p className="text-xs text-slate-500 mb-4">
            Upload a WhatsApp export to see orders and delays.
          </p>
          <Link
            to="/orders"
            className="inline-block px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600"
          >
            Go to Orders
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 max-w-2xl">
          <div className="text-sm font-black text-rose-700 mb-1">Could not load the overview</div>
          <div className="text-xs font-mono text-rose-600 break-words">{error}</div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>}

      {!loading && !error && sessionId && orders.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Stat label="Orders" value={orders.length} hint="Distinct order numbers in this export" />
            <Stat
              label="Open delays"
              value={<span className={openDelays.length ? 'text-rose-600' : ''}>{openDelays.length}</span>}
              hint="Most recent delay not followed by a dispatch"
            />
            <Stat
              label="Events attributed"
              value={orders.reduce((sum, o) => sum + o.event_count, 0)}
              hint={
                inferredTotal > 0
                  ? `${inferredTotal} further events attributed by inference, not counted here`
                  : 'Messages that state their order number'
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-indigo-50 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">
                Orders needing attention
              </h3>
              <p className="text-[11px] text-slate-400 mb-4 leading-snug">
                An order is listed when its most recent delay has no dispatch after it. A payment
                does not close a delay. There is no risk score — this is the rule, not an estimate.
              </p>

              {openDelays.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No order has an open delay.
                </p>
              ) : (
                <ul className="space-y-2">
                  {openDelays.map((order) => (
                    <li
                      key={order.order_no}
                      className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3"
                    >
                      <div>
                        <span className="font-mono font-black text-rose-700 text-sm">
                          {order.order_no}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          last activity {formatStamp(order.last_activity)}
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-rose-100 text-rose-700">
                        Open delay
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-indigo-50 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">
                Recent timeline activity
              </h3>
              <p className="text-[11px] text-slate-400 mb-4 leading-snug">
                The latest message on each of the {RECENT_ORDER_COUNT} most recently active orders,
                verbatim.
              </p>

              {recent.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No activity to show.</p>
              ) : (
                <ul className="space-y-3">
                  {recent.map(({ order, event }) => (
                    <li key={order.order_no} className="border-l-2 border-indigo-100 pl-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-indigo-500 text-xs">
                          {order.order_no}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{event.sender}</span>
                        <span className="text-[10px] text-slate-400">
                          {formatStamp(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug mt-0.5">{event.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !error && sessionId && orders.length === 0 && (
        <p className="text-sm text-slate-400 py-8 text-center">
          This session contains no orders.
        </p>
      )}
    </div>
  );
};

export default Dashboard;
