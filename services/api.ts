const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Turn a non-OK response into an error that carries what the server actually
 * said. Swallowing the server's `detail` leaves the UI able to report that
 * something failed but not why, which is the difference between a usable
 * error and a shrug.
 */
async function failure(response: Response, action: string): Promise<Error> {
  let detail = '';
  try {
    const body = await response.json();
    detail = typeof body?.detail === 'string' ? body.detail : JSON.stringify(body?.detail ?? body);
  } catch {
    try {
      detail = await response.text();
    } catch {
      detail = '';
    }
  }
  return new Error(
    `${action} failed (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})` +
      (detail ? `: ${detail}` : '')
  );
}

export interface Material {
  id: number;
  matnr: string;
  name: string;
  category: string;
  stock_level: number;
  safety_stock: number;
  lead_time: number;
  supplier: string;
  abc_class: string;
  unit: string;
  tenant_id: string;
}

export async function getMaterials(tenantId: string): Promise<Material[]> {
  const response = await fetch(`${API_BASE}/api/materials/${tenantId}`);
  if (!response.ok) throw await failure(response, 'Loading materials');
  return response.json();
}

export async function healthCheck() {
  const response = await fetch(`${API_BASE}/api/health`);
  return response.json();
}

export interface BomSummary {
  id: string;
  tenant_id: string;
  name: string;
  source: string;
  created_at: string;
  item_count: number;
  max_risk_score: number;
}

export interface BomItem {
  id: string;
  bom_id: string;
  mpn: string;
  quantity: number;
  supplier: string;
  risk_score: number;
  risk_level: 'stable' | 'watch' | 'critical';
  recommended_action: string;
  created_at: string;
}

export interface BomDetail {
  id: string;
  tenant_id: string;
  name: string;
  source: string;
  created_at: string;
  items: BomItem[];
}

export async function getBoms(tenantId: string): Promise<BomSummary[]> {
  const response = await fetch(`${API_BASE}/api/boms/${tenantId}`);
  if (!response.ok) throw await failure(response, 'Loading BOMs');
  return response.json();
}

export async function createBom(payload: {
  tenant_id: string;
  name: string;
  raw_text: string;
  actor?: string;
}): Promise<BomDetail> {
  const response = await fetch(`${API_BASE}/api/boms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw await failure(response, 'Creating BOM');

  return response.json();
}

export async function runSpecMatch(mpn: string) {
  const response = await fetch(`${API_BASE}/api/specmatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mpn }),
  });
  if (!response.ok) throw await failure(response, 'SpecMatch');
  return response.json();
}

export async function getLifecycle(mpn: string) {
  const response = await fetch(`${API_BASE}/api/lifecycle/${encodeURIComponent(mpn)}`);
  if (!response.ok) throw await failure(response, 'Lifecycle scan');
  return response.json();
}

export async function getDisruptions() {
  const response = await fetch(`${API_BASE}/api/disruptions`);
  if (!response.ok) throw await failure(response, 'Disruption feed');
  return response.json();
}

export async function runDisruptionScan(mpns: string[]) {
  const response = await fetch(`${API_BASE}/api/disruption-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mpns }),
  });
  if (!response.ok) throw await failure(response, 'Disruption scan');
  return response.json();
}

export async function runScenarioPlan(payload: {
  mpns: string[];
  demand_growth_percent: number;
  buffer_days: number;
  shipping_delay_days: number;
  geo_risk_multiplier: number;
}) {
  const response = await fetch(`${API_BASE}/api/scenario-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await failure(response, 'Scenario plan');
  return response.json();
}

export async function ingestKnowledge(payload: {
  tenant_id: string;
  source_type: string;
  title: string;
  raw_text: string;
}) {
  const response = await fetch(`${API_BASE}/api/knowledge/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await failure(response, 'Knowledge ingest');
  return response.json();
}

export async function queryKnowledge(payload: { tenant_id: string; query: string; limit?: number }) {
  const response = await fetch(`${API_BASE}/api/knowledge/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await failure(response, 'Knowledge query');
  return response.json();
}

export async function getKnowledgeEval(tenantId: string) {
  const response = await fetch(`${API_BASE}/api/knowledge/eval/${tenantId}`);
  if (!response.ok) throw await failure(response, 'Knowledge eval');
  return response.json();
}
