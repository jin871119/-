import { Product, DailySale } from './types';

const generateSalesHistory = (base: number, variance: number): DailySale[] => {
  const history: DailySale[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // Random sales amount based on base + variance
    const quantity = Math.max(0, Math.floor(base + (Math.random() * variance * 2 - variance)));
    history.push({
      date: date.toISOString().split('T')[0],
      quantity
    });
  }
  return history;
};

// 물류재고 데이터 (컬러 코드별)
export const WAREHOUSE_STOCK: Record<string, number> = {
  '07SBD': 116,
  '07YEL': 21,
  '43LDL': 0,
  '43PKL': 59,
  '50BKS': 66,
  '50CRS': 53,
  '50NYS': 372,
};

// 컬러 코드 추출 헬퍼 함수
export const extractColorCode = (productName: string): string | null => {
  const match = productName.match(/\(([A-Z0-9]+)\)$/);
  return match ? match[1] : null;
};

// 입고 일정 데이터 (컬러 코드별)
export const REORDER_SCHEDULE: Record<string, Array<{ date: string; quantity: number }>> = {
  '50BKS': [
    { date: '2025-12-17', quantity: 2520 },
    { date: '2025-12-23', quantity: 6000 },
    { date: '2026-01-08', quantity: 7000 },
    { date: '2026-01-15', quantity: 2000 },
  ],
  '50CRS': [
    { date: '2025-12-24', quantity: 6000 },
    { date: '2026-01-08', quantity: 3000 },
    { date: '2026-01-15', quantity: 1000 },
  ],
  '43PKL': [
    { date: '2025-12-25', quantity: 1000 },
  ],
  '07SBD': [
    { date: '2025-12-24', quantity: 1000 },
  ],
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'P001',
    name: '프리미엄 원두 (1kg)',
    category: '식품',
    currentStock: 45,
    price: 25000,
    salesHistory: generateSalesHistory(8, 3) // Avg ~8 sales/day
  },
  {
    id: 'P002',
    name: '유기농 녹차 티백',
    category: '식품',
    currentStock: 200,
    price: 12000,
    salesHistory: generateSalesHistory(2, 1) // Avg ~2 sales/day
  },
  {
    id: 'P003',
    name: '세라믹 머그컵 (화이트)',
    category: '주방용품',
    currentStock: 12,
    price: 8500,
    salesHistory: generateSalesHistory(5, 2) // Avg ~5 sales/day -> Will run out soon
  },
  {
    id: 'P004',
    name: '스테인리스 텀블러',
    category: '주방용품',
    currentStock: 85,
    price: 18000,
    salesHistory: generateSalesHistory(3, 1)
  },
  {
    id: 'P005',
    name: '블루투스 스피커',
    category: '전자제품',
    currentStock: 5,
    price: 55000,
    salesHistory: generateSalesHistory(1, 1)
  },
  {
    id: 'P006',
    name: '무선 마우스',
    category: '전자제품',
    currentStock: 150,
    price: 22000,
    salesHistory: generateSalesHistory(15, 5) // High velocity
  },
  {
    id: 'P007',
    name: '노트북 거치대',
    category: '사무용품',
    currentStock: 30,
    price: 35000,
    salesHistory: generateSalesHistory(2, 2)
  },
  {
    id: 'P008',
    name: '기계식 키보드',
    category: '전자제품',
    currentStock: 8,
    price: 120000,
    salesHistory: generateSalesHistory(3, 1) // Critical
  }
];
