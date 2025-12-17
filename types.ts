export enum StockLevel {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export interface DailySale {
  date: string;
  quantity: number;
}

export interface ReorderSchedule {
  date: string; // YYYY-MM-DD
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number; // 매장재고
  warehouseStock?: number; // 물류재고
  salesHistory: DailySale[]; // Last 30 days of sales
  reorderSchedule?: ReorderSchedule[]; // 입고 일정
  price: number;
  storeCode?: string; // 매장코드
  storeName?: string; // 매장명
}

export interface ProductForecast extends Product {
  averageDailySales: number;
  daysUntilEmpty: number;
  predictedEmptyDate: string | null;
  status: StockLevel;
}
