/**
 * Client for the occuralog API (default http://localhost:8010).
 *
 * Every type below was written from an actual response captured from a running
 * server, not from a specification. If the API changes, these change with it.
 *
 * The client throws on failure and never returns a substitute value. A failed
 * call must reach the UI as a failure.
 */

const OCCURALOG_BASE =
  import.meta.env.VITE_OCCURALOG_URL || 'http://localhost:8010';

// ---------------------------------------------------------------------------
// Attribution
//
// An event is attached to an order either because the message stated the order
// number, or because a model judged it part of that conversation. The second
// is a guess. The two are separate values throughout the API and must stay
// visually distinct everywhere they are rendered.
// ---------------------------------------------------------------------------
export type Attribution = 'explicit' | 'inferred' | 'unattributed';

/** One parsed WhatsApp message. */
export interface TimelineEvent {
  timestamp: string | null;
  timestamp_raw: string;
  sender: string;
  text: string;
  event_types: string[];
  order_numbers: string[];
  classified: boolean;
  needs_llm_review?: boolean;
  source: string;
  attribution: Attribution;
}

/**
 * A citation. `n` is a 1-based index into the same order's `timeline`, so
 * citation 3 and timeline[2] are the same message.
 */
export interface Citation {
  n: number;
  sender: string;
  timestamp: string | null;
  timestamp_raw: string;
  text: string;
  event_types: string[];
  attribution: Attribution;
}

/**
 * One row of the orders list.
 *
 * `event_count` and `open_delay` count explicitly attributed events only, so
 * their meaning does not change depending on whether a model pass has run.
 * The inferred figures sit beside them under their own names.
 */
export interface OrderSummary {
  order_no: string;
  event_count: number;
  inferred_event_count: number;
  /** null when no event carries a parseable timestamp. Never estimated. */
  last_activity: string | null;
  open_delay: boolean;
  open_delay_including_inferred: boolean;
}

export interface OrderDetail extends OrderSummary {
  session_id: string;
  includes_inferred: boolean;
  timeline: TimelineEvent[];
  citations: Citation[];
  /** The timeline rendered with citation markers, for an LLM prompt. */
  prompt_context: string;
}

export interface ParserStats {
  total_messages: number;
  classified: number;
  unknown: number;
  unknown_flagged_for_llm_review: number;
  unknown_possibly_rule_classifiable: number;
  /**
   * The share of messages where some keyword matched. NOT accuracy — it counts
   * whether a rule fired, not whether the label was right. No accuracy figure
   * exists because there is no labelled ground truth.
   */
  classification_rate: number;
  event_type_counts: Record<string, number>;
}

export interface AttributionStats {
  total_events: number;
  explicit: number;
  inferred: number;
  unattributed: number;
  considered: number;
  proposals_rejected_by_model: number;
  method: string;
  model: string;
  provider: string;
}

export interface Session {
  session_id: string;
  original_filename: string;
  created_at: string;
  event_count: number;
  stats: ParserStats;
  /** Present only after a resolve pass has run. */
  attribution?: AttributionStats;
}

export interface OrdersResponse {
  session_id: string;
  count: number;
  include_inferred: boolean;
  orders: OrderSummary[];
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
export class OccuralogError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'OccuralogError';
  }
}

async function failure(response: Response, action: string): Promise<OccuralogError> {
  let detail = '';
  try {
    const body = await response.json();
    detail = typeof body?.detail === 'string' ? body.detail : JSON.stringify(body?.detail ?? body);
  } catch {
    detail = await response.text().catch(() => '');
  }
  return new OccuralogError(
    `${action} failed (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})` +
      (detail ? `: ${detail}` : ''),
    response.status
  );
}

async function get<T>(path: string, action: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${OCCURALOG_BASE}${path}`);
  } catch (err) {
    throw new OccuralogError(
      `${action} failed: could not reach occuralog at ${OCCURALOG_BASE}. ` +
        `Is it running? (${err instanceof Error ? err.message : String(err)})`
    );
  }
  if (!response.ok) throw await failure(response, action);
  return response.json();
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
export function occuralogBaseUrl(): string {
  return OCCURALOG_BASE;
}

export async function ingestExport(file: File): Promise<Session> {
  const form = new FormData();
  form.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${OCCURALOG_BASE}/sessions`, { method: 'POST', body: form });
  } catch (err) {
    throw new OccuralogError(
      `Upload failed: could not reach occuralog at ${OCCURALOG_BASE}. ` +
        `Is it running? (${err instanceof Error ? err.message : String(err)})`
    );
  }
  if (!response.ok) throw await failure(response, 'Upload');
  return response.json();
}

export function listSessions(): Promise<{ count: number; sessions: Session[] }> {
  return get('/sessions', 'Listing sessions');
}

export function getSession(sessionId: string): Promise<Session> {
  return get(`/sessions/${sessionId}`, 'Loading session');
}

export function getOrders(
  sessionId: string,
  includeInferred = false
): Promise<OrdersResponse> {
  return get(
    `/sessions/${sessionId}/orders?include_inferred=${includeInferred}`,
    'Loading orders'
  );
}

export function getOrder(
  sessionId: string,
  orderNo: string,
  includeInferred = false
): Promise<OrderDetail> {
  return get(
    `/sessions/${sessionId}/orders/${encodeURIComponent(orderNo)}?include_inferred=${includeInferred}`,
    `Loading order ${orderNo}`
  );
}
