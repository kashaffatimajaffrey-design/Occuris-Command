// Dev harness only. Replaces the transport in services/occuralog with the real
// captured response for order 3500, so the citation rendering can be exercised
// without a Supabase session (every proxied route requires one).
//
// Only the transport is stubbed. The types, the citation resolver and the
// components under test are the real ones, and the data is a genuine response.
import detail from './order3500.json';
export * from '../services/occuralog';
import type { OrderDetail, OrdersResponse, Session } from '../services/occuralog';

const ORDER = detail as unknown as OrderDetail;

export function occuralogBaseUrl() { return '(harness stub)'; }
export async function getOrder(): Promise<OrderDetail> { return ORDER; }
export async function getOrders(): Promise<OrdersResponse> {
  return {
    session_id: ORDER.session_id, count: 1, include_inferred: false,
    orders: [{
      order_no: ORDER.order_no, event_count: ORDER.event_count,
      inferred_event_count: ORDER.inferred_event_count,
      last_activity: ORDER.last_activity, open_delay: ORDER.open_delay,
      open_delay_including_inferred: ORDER.open_delay_including_inferred,
    }],
  };
}
export async function listSessions(): Promise<{ count: number; sessions: Session[] }> {
  return { count: 0, sessions: [] };
}
export async function getSession(): Promise<Session> { throw new Error('not used in harness'); }
