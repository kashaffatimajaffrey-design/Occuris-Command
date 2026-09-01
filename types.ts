
export enum AgentType {
  PROCUREMENT = 'Procurement (SAP MM)',
  INVENTORY = 'Inventory (S/4HANA)',
  SUPPLIER_RISK = 'Supplier Risk',
  COMPLIANCE = 'Compliance',
  FORECASTING = 'Forecasting',
  REPORTING = 'Reporting'
}

export interface AgentConfig {
  id: string;
  name: AgentType;
  description: string;
  icon: string;
  systemInstruction: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  agentId: string;
}

export interface Tenant {
  id: string;
  name: string;
  region: string;
}
