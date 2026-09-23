import React from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';

/**
 * Reporting over the parsed session.
 *
 * Everything here is a count the parser produced. There are no derived
 * percentages beyond the ones occuralog computes and names honestly, and no
 * accuracy figure — that would need labelled ground truth, which does not
 * exist. The classification rate below counts whether a keyword matched, not
 * whether the label was right, and says so.
 */

const Bar: React.FC<{ label: string; value: number; max: number; muted?: boolean }> = ({
  label,
  value,
  max,
  muted,
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-1">
      <span className={`text-xs font-bold ${muted ? 'text-slate-400' : 'text-slate-600'}`}>
        {label.replace(/_/g, ' ')}
      </span>
      <span className={`text-xs font-black ${muted ? 'text-slate-400' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-100">
      <div
        className={`h-full rounded-full ${muted ? 'bg-slate-300' : 'bg-indigo-400'}`}
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
  </div>
);

const Analytics: React.FC = () => {
  const { session, sessionId, loading } = useSession();

  if (loading) {
    return <p className="text-sm text-slate-400 py-10 text-center">Loading…</p>;
  }

  if (!sessionId || !session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-400 text-sm font-medium">Counts from the parsed export.</p>
        </div>
        <div className="bg-white p-12 rounded-2xl border border-indigo-50 shadow-sm text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No session selected</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
            Upload a WhatsApp export to see what the parser found in it.
          </p>
          <Link
            to="/orders"
            className="inline-block px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600"
          >
            Go to Orders
          </Link>
        </div>
      </div>
    );
  }

  const counts = session.stats.event_type_counts;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 0;
  const attribution = session.attribution;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-400 text-sm font-medium">
          {session.original_filename} · {session.stats.total_messages} messages
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-indigo-50 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Event types</h3>
          <p className="text-[11px] text-slate-400 mb-6 leading-snug">
            How many messages matched each rule. A message can match more than one, so these sum to
            more than the message count.
          </p>
          <div className="space-y-4">
            {entries.map(([type, value]) => (
              <Bar key={type} label={type} value={value} max={max} muted={type === 'unknown'} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-indigo-50 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Classification</h3>
            <p className="text-[11px] text-slate-400 mb-5 leading-snug">
              <strong className="text-slate-500">This is not accuracy.</strong> It counts whether
              some keyword fired, not whether the label was correct. Measuring accuracy needs
              labelled ground truth, and none exists for this data.
            </p>
            <dl className="space-y-2 text-xs">
              {[
                ['Messages parsed', session.stats.total_messages],
                ['Matched a keyword', session.stats.classified],
                ['Matched nothing', session.stats.unknown],
                ['Short or ack-like, needs context', session.stats.unknown_flagged_for_llm_review],
                ['Might be reachable by better rules', session.stats.unknown_possibly_rule_classifiable],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-bold text-slate-700">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <dt className="text-slate-500">Keyword match rate</dt>
                <dd className="font-black text-slate-800">{session.stats.classification_rate}%</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-indigo-50 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Order attribution</h3>
            {!attribution ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                Only messages that state an order number are attributed so far. Run the attribution
                pass on this session to have a model judge which of the rest belong to a thread.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-slate-400 mb-5 leading-snug">
                  Explicit means the message stated the order number. Inferred means a model judged
                  it part of that conversation — a guess, kept separate everywhere.
                </p>
                <dl className="space-y-2 text-xs">
                  {[
                    ['Explicit', attribution.explicit],
                    ['Inferred', attribution.inferred],
                    ['Unattributed', attribution.unattributed],
                    ['Proposals the model rejected', attribution.proposals_rejected_by_model],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="font-bold text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[10px] text-slate-400 mt-4 font-mono">
                  {attribution.method} · {attribution.model}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
