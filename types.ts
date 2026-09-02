
export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  agentId: string;
  /** Which provider actually produced this answer. Absent on user messages. */
  provider?: string;
  model?: string;
  /** True when a fallback provider answered because the configured one failed. */
  degraded?: boolean;
  /** Why the configured provider failed, when degraded. */
  primaryError?: string;
}

export interface Tenant {
  id: string;
  name: string;
  region: string;
}
