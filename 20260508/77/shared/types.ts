export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  location: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  fraudScore: number;
  isFraud: boolean;
  timestamp: string;
  cardType: string;
  transactionType: string;
}

export interface StatsData {
  totalTransactions: number;
  fraudCount: number;
  detectionRate: number;
  totalFraudAmount: number;
}

export interface DetectionRatePoint {
  time: string;
  rate: number;
  count: number;
}

export type WebSocketMessage =
  | { type: 'transaction'; data: Transaction }
  | { type: 'stats'; data: StatsData }
  | { type: 'history'; data: Transaction[] }
  | { type: 'detectionRate'; data: DetectionRatePoint[] };
