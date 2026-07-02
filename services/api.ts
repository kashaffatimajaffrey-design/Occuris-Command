const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  if (!response.ok) {
    throw new Error('Failed to fetch materials');
  }
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
  if (!response.ok) {
    throw new Error('Failed to fetch BOMs');
  }
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create BOM' }));
    throw new Error(error.detail || 'Failed to create BOM');
  }

  return response.json();
}

export async function runSpecMatch(mpn: string) {
  const response = await fetch(`${API_BASE}/api/specmatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mpn }),
  });
  if (!response.ok) throw new Error('SpecMatch failed');
  return response.json();
}

export async function getLifecycle(mpn: string) {
  const response = await fetch(`${API_BASE}/api/lifecycle/${encodeURIComponent(mpn)}`);
  if (!response.ok) throw new Error('Lifecycle scan failed');
  return response.json();
}

export async function getDisruptions() {
  const response = await fetch(`${API_BASE}/api/disruptions`);
  if (!response.ok) throw new Error('Disruption feed failed');
  return response.json();
}

export async function runDisruptionScan(mpns: string[]) {
  const response = await fetch(`${API_BASE}/api/disruption-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mpns }),
  });
  if (!response.ok) throw new Error('Disruption scan failed');
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
  if (!response.ok) throw new Error('Scenario plan failed');
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
  if (!response.ok) throw new Error('Knowledge ingest failed');
  return response.json();
}

export async function queryKnowledge(payload: { tenant_id: string; query: string; limit?: number }) {
  const response = await fetch(`${API_BASE}/api/knowledge/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Knowledge query failed');
  return response.json();
}

export async function getKnowledgeEval(tenantId: string) {
  const response = await fetch(`${API_BASE}/api/knowledge/eval/${tenantId}`);
  if (!response.ok) throw new Error('Knowledge eval failed');
  return response.json();
}
