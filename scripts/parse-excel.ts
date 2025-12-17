import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { Product, DailySale } from '../types';

// Excel 날짜를 YYYY-MM-DD 형식으로 변환
const excelDateToISOString = (excelDate: number): string => {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
};

const parseMiyawngBiniExcel = (filePath: string): Product[] => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  // 헤더는 첫 번째 행 (Row 0)
  const headerRow = rawData[0] as any[];
  if (!headerRow) {
    throw new Error('헤더 행을 찾을 수 없습니다.');
  }

  // 날짜 컬럼 인덱스 찾기 (인덱스 15부터 시작)
  const dateColumns: { index: number; date: string }[] = [];
  for (let i = 15; i < headerRow.length; i++) {
    const cellValue = headerRow[i];
    if (typeof cellValue === 'number' && cellValue > 40000) {
      const dateStr = excelDateToISOString(cellValue);
      dateColumns.push({ index: i, date: dateStr });
    }
  }

  console.log(`Found ${dateColumns.length} date columns`);

  const productsMap = new Map<string, Product>();

  // 데이터는 두 번째 행부터 시작 (Row 1)
  for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
    const row = rawData[rowIndex] as any[];
    if (!row || !row[0]) continue; // 매장코드가 없으면 스킵

    const productCode = row[2] as string; // 품번 (인덱스 2)
    const productName = row[3] as string; // 제품명 (인덱스 3)
    const color = row[4] as string; // 컬러 (인덱스 4)
    const price = Number(row[5]) || 0; // 소비자가 (인덱스 5)
    const stock = Number(row[11]) || 0; // 재고수량 (인덱스 11)

    if (!productName || !color) continue;

    const productKey = `${productName}_${color}`;

    // 일별 판매 데이터 추출
    const salesHistory: DailySale[] = [];
    dateColumns.forEach(({ index, date }) => {
      const salesQty = Number(row[index]) || 0;
      salesHistory.push({
        date,
        quantity: salesQty
      });
    });

    // 최근 30일 데이터만 유지 (또는 판매가 있는 데이터)
    const filteredHistory = salesHistory
      .filter((sale, idx) => {
        // 판매가 있거나, 최근 30일 이내인 경우
        return sale.quantity > 0 || idx >= salesHistory.length - 30;
      })
      .slice(-30); // 최근 30일만

    if (productsMap.has(productKey)) {
      const existing = productsMap.get(productKey)!;
      existing.currentStock += stock;
      
      // 판매 데이터 병합
      const salesMap = new Map<string, number>();
      existing.salesHistory.forEach(sale => {
        salesMap.set(sale.date, sale.quantity);
      });
      filteredHistory.forEach(sale => {
        const existingQty = salesMap.get(sale.date) || 0;
        salesMap.set(sale.date, existingQty + sale.quantity);
      });
      
      existing.salesHistory = Array.from(salesMap.entries())
        .map(([date, quantity]) => ({ date, quantity }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // 최근 30일만
    } else {
      productsMap.set(productKey, {
        id: `MB_${Date.now()}_${rowIndex}`,
        name: `${productName} (${color})`,
        category: '비니',
        currentStock: stock,
        price: price,
        salesHistory: filteredHistory
      });
    }
  }

  return Array.from(productsMap.values());
};

// 실행
try {
  const products = parseMiyawngBiniExcel('미야옹비니.xlsx');
  console.log(`Parsed ${products.length} products`);
  
  // JSON 파일로 저장
  writeFileSync(
    'miyawng-bini-data.json',
    JSON.stringify(products, null, 2),
    'utf-8'
  );
  
  console.log('Data saved to miyawng-bini-data.json');
} catch (error) {
  console.error('Error parsing Excel:', error);
  process.exit(1);
}

