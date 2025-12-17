import XLSX from 'xlsx';
import { Product, DailySale } from '../types';

// Excel 날짜를 YYYY-MM-DD 형식으로 변환
const excelDateToISOString = (excelDate: number): string => {
  // Excel 날짜는 1900-01-01 = 1부터 시작
  // Excel의 날짜 시스템은 1900년 1월 1일을 1로 계산
  // 하지만 Excel은 1900년을 윤년으로 잘못 계산했기 때문에, 실제로는 1899-12-30을 기준으로 계산
  // excelDate가 1이면 1900-01-01이 되어야 함
  const excelEpoch = new Date(1899, 11, 30); // 1899-12-30 (Excel epoch)
  const days = excelDate - 1; // 1일을 빼서 0부터 시작하도록
  const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
};

// 매장별 데이터를 그룹화한 결과 타입
export interface StoreData {
  storeCode: string;
  storeName: string;
  district?: string; // 상권구분
  products: Product[];
}

// 상권별 데이터 타입
export interface DistrictData {
  districtName: string;
  stores: StoreData[];
}

// 전매장 엑셀 파일 파싱 (매장별로 그룹화, 상권구분 포함)
export const parseAllStoresExcel = (filePath: string): { stores: StoreData[], districts: DistrictData[], storeSalesData?: Record<string, Record<string, DailySale[]>> } => {
  const workbook = XLSX.readFile(filePath);
  
  // 1. 매장구분 시트에서 상권구분 데이터 읽기
  const districtSheetName = workbook.SheetNames.find(name => name.includes('매장구분') || name.includes('상권'));
  const districtMap = new Map<string, string>(); // 매장명 -> 상권구분
  
  if (districtSheetName) {
    const districtSheet = workbook.Sheets[districtSheetName];
    const districtData = XLSX.utils.sheet_to_json(districtSheet, { header: 1, defval: null });
    
    // 헤더 행 찾기
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(3, districtData.length); i++) {
      const row = districtData[i] as any[];
      if (row && (row[0]?.toString().includes('매장') || row[0]?.toString().includes('상권'))) {
        headerRowIndex = i;
        break;
      }
    }
    
    // 데이터 읽기 (매장명과 상권구분 매핑)
    for (let i = headerRowIndex + 1; i < districtData.length; i++) {
      const row = districtData[i] as any[];
      if (!row || !row[0]) continue;
      
      const storeName = String(row[0] || '').trim();
      const district = String(row[1] || row[2] || '').trim();
      
      if (storeName && district) {
        districtMap.set(storeName, district);
      }
    }
  }
  
  // 2. 재고시트에서 재고 데이터 읽기
  const stockSheetName = workbook.SheetNames.find(name => name.includes('재고') || name.includes('재고시트'));
  const stockMap = new Map<string, number>(); // "컬러" 또는 "스타일_컬러" -> 재고수량
  
  if (stockSheetName) {
    console.log(`재고시트 발견: ${stockSheetName}`);
    const stockSheet = workbook.Sheets[stockSheetName];
    const stockData = XLSX.utils.sheet_to_json(stockSheet, { header: 1, defval: null });
    
    console.log(`재고시트 총 행 수: ${stockData.length}`);
    if (stockData.length > 0) {
      console.log('재고시트 첫 5행 샘플:', stockData.slice(0, 5));
    }
    
    // 헤더 행 찾기 (더 유연하게)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, stockData.length); i++) {
      const row = stockData[i] as any[];
      if (!row || row.length === 0) continue;
      
      // 첫 번째 셀 확인
      const firstCell = String(row[0] || '').toLowerCase();
      const secondCell = String(row[1] || '').toLowerCase();
      
      if (firstCell.includes('스타일') || firstCell.includes('제품') || firstCell.includes('컬러') || 
          firstCell.includes('재고') || firstCell.includes('코드') ||
          secondCell.includes('스타일') || secondCell.includes('제품') || secondCell.includes('컬러')) {
        headerRowIndex = i;
        break;
      }
    }
    
    // 헤더를 찾지 못했으면 첫 번째 행을 헤더로 간주
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }
    
    console.log(`재고시트 헤더 행: ${headerRowIndex}`);
    
    // 재고 데이터 읽기
    // 재고시트 구조: [ITEM, 시즌, 품번, 제품명, 컬러, 재고]
    for (let i = headerRowIndex + 1; i < stockData.length; i++) {
      const row = stockData[i] as any[];
      if (!row || row.length === 0) continue;
      
      // 컬러는 인덱스 4 (5번째 컬럼), 재고는 인덱스 5 (6번째 컬럼)
      const color = String(row[4] || '').trim();
      const stock = Number(row[5] || 0);
      
      // 컬러와 재고가 있으면 저장
      if (color && stock > 0) {
        stockMap.set(color, stock);
      }
    }
    
    console.log(`재고시트에서 읽은 데이터: ${stockMap.size}개`);
    if (stockMap.size > 0) {
      console.log('재고 데이터:', Array.from(stockMap.entries()));
    }
  } else {
    console.log('재고시트를 찾을 수 없습니다. 사용 가능한 시트:', workbook.SheetNames);
  }
  
  // 3. Sheet1에서 판매 데이터 읽기 (컬러별로 합산, 매장별 데이터도 저장)
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  // 헤더 행 찾기 (Row 1 또는 Row 0)
  let headerRowIndex = 1;
  let headerRow = rawData[headerRowIndex] as any[];
  
  // Row 1에 헤더가 없으면 Row 0 확인
  if (!headerRow || headerRow.length === 0) {
    headerRowIndex = 0;
    headerRow = rawData[headerRowIndex] as any[];
  }
  
  if (!headerRow) {
    throw new Error('헤더 행을 찾을 수 없습니다.');
  }

  // Q열부터 날짜 컬럼 찾기 (Q열 = 인덱스 16, 0-based이므로 16)
  // 헤더 행에서 날짜를 찾지 못할 수 있으므로, 실제 데이터 행에서도 확인
  const dateColumns: { index: number; date: string }[] = [];
  const startIndex = 16; // Q열부터 (0-based: A=0, B=1, ..., Q=16)
  
  // 먼저 헤더 행에서 날짜 찾기
  for (let i = startIndex; i < headerRow.length; i++) {
    const cellValue = headerRow[i];
    
    if (cellValue === null || cellValue === undefined) continue;
    
    if (typeof cellValue === 'number') {
      // Excel 날짜 형식 (1900년 기준 일수, 보통 40000 이상)
      if (cellValue > 40000 && cellValue < 1000000) {
        try {
          const dateStr = excelDateToISOString(cellValue);
          // 유효한 날짜인지 확인 (2000년 이후)
          const date = new Date(dateStr);
          if (date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
            dateColumns.push({ index: i, date: dateStr });
          }
        } catch (e) {
          // 날짜 변환 실패 시 스킵
        }
      }
    } else if (typeof cellValue === 'string') {
      // 문자열로 된 날짜도 확인 (예: "2025-01-01", "2025/01/01")
      const dateMatch = cellValue.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
      if (dateMatch) {
        dateColumns.push({ index: i, date: dateMatch[0].replace(/\//g, '-') });
      }
    }
  }
  
  // 컬러별로 데이터 그룹화 (매장 정보도 함께 저장)
  const colorProductsMap = new Map<string, Product>(); // 컬러 -> 제품 데이터 (전매장 합산)
  const storeSalesMap = new Map<string, Map<string, DailySale[]>>(); // 매장명 -> 컬러 -> 판매 데이터
  const dataStartRow = headerRowIndex + 1;
  
  // 헤더에서 찾지 못했으면, 실제 데이터 행에서 날짜 패턴 찾기
  if (dateColumns.length === 0 && rawData.length > dataStartRow) {
    // 첫 번째 데이터 행에서 Q열 이후의 값들을 확인
    const firstDataRow = rawData[dataStartRow] as any[];
    if (firstDataRow) {
      // Q열부터 연속된 컬럼들을 날짜로 간주하고 인덱스만 저장
      // 실제 날짜는 헤더에서 가져오거나, 데이터 행의 첫 번째 값에서 추론
      for (let i = startIndex; i < Math.min(startIndex + 100, firstDataRow.length); i++) {
        // 인덱스를 기반으로 날짜 생성 (임시로, 나중에 실제 날짜로 교체)
        // 실제로는 헤더 행의 날짜를 사용하거나, 첫 번째 데이터 행의 날짜를 사용
        const cellValue = headerRow[i];
        if (cellValue !== null && cellValue !== undefined) {
          // 헤더에 값이 있으면 날짜로 간주
          if (typeof cellValue === 'number' && cellValue > 0) {
            try {
              const dateStr = excelDateToISOString(cellValue);
              dateColumns.push({ index: i, date: dateStr });
            } catch (e) {
              // 날짜 변환 실패 시에도 인덱스만 저장 (나중에 처리)
            }
          }
        }
      }
    }
  }
  
  // 여전히 찾지 못했으면, Q열부터 연속된 컬럼을 모두 날짜로 간주
  if (dateColumns.length === 0) {
    console.log('Using sequential date columns from Q column');
    // Q열부터 최대 100개 컬럼을 날짜로 간주
    for (let i = startIndex; i < Math.min(startIndex + 100, headerRow.length); i++) {
      dateColumns.push({ index: i, date: `COL_${i}` }); // 임시 날짜, 나중에 실제 날짜로 교체 필요
    }
  }
  
  console.log(`Found ${dateColumns.length} date columns starting from column Q`);

  for (let rowIndex = dataStartRow; rowIndex < rawData.length; rowIndex++) {
    const row = rawData[rowIndex] as any[];
    if (!row) continue;

    // A열에서 매장명 추출 (A열 = 인덱스 0, 0-based)
    const storeName = String(row[0] || '').trim(); // A열 = 매장명
    if (!storeName) continue; // 매장명이 없으면 스킵

    // 매장구분 시트에서 상권구분 가져오기
    const district = districtMap.get(storeName) || '기타';

    // F열에서 컬러 추출 (F열 = 인덱스 5, 0-based)
    const color = String(row[5] || '').trim(); // F열 = 컬러
    
    if (!color) continue; // 컬러가 없으면 스킵

    // 제품명 추출 (D열 또는 E열에서)
    const productName = String(row[3] || row[4] || '').trim(); // 제품명
    const price = Number(row[6] || 0); // 소비자가 (G열)
    
    // 재고시트에서 재고 데이터 가져오기 (여러 키로 시도)
    let stockFromSheet = 0;
    
    // 1. 컬러만으로 찾기
    if (stockMap.has(color)) {
      stockFromSheet = stockMap.get(color)!;
    } else {
      // 2. 제품명_컬러로 찾기
      const productKey = productName ? `${productName}_${color}` : '';
      if (productKey && stockMap.has(productKey)) {
        stockFromSheet = stockMap.get(productKey)!;
      } else {
        // 3. 제품명에서 스타일 코드 추출 시도 (예: 3ABNB1156)
        const styleMatch = productName?.match(/(\w+)/);
        if (styleMatch) {
          const styleKey = `${styleMatch[1]}_${color}`;
          if (stockMap.has(styleKey)) {
            stockFromSheet = stockMap.get(styleKey)!;
          }
        }
      }
    }

    // 일별 판매 데이터 추출 (Q열부터)
    const salesHistory: DailySale[] = [];
    dateColumns.forEach(({ index, date }) => {
      const salesQty = Number(row[index]) || 0;
      // 판매량이 0이어도 날짜는 기록 (트랜드 데이터를 위해)
      salesHistory.push({
        date,
        quantity: salesQty
      });
    });

    // 매장별 판매 데이터 저장 (백화점 필터링을 위해)
    if (!storeSalesMap.has(storeName)) {
      storeSalesMap.set(storeName, new Map());
    }
    const storeColorMap = storeSalesMap.get(storeName)!;
    if (!storeColorMap.has(color)) {
      storeColorMap.set(color, []);
    }
    const storeColorSales = storeColorMap.get(color)!;
    
    // 매장별 판매 데이터 병합 (같은 날짜면 합산)
    const storeSalesMapByDate = new Map<string, number>();
    storeColorSales.forEach(sale => {
      storeSalesMapByDate.set(sale.date, sale.quantity);
    });
    salesHistory.forEach(sale => {
      const existingQty = storeSalesMapByDate.get(sale.date) || 0;
      storeSalesMapByDate.set(sale.date, existingQty + sale.quantity);
    });
    storeColorMap.set(color, Array.from(storeSalesMapByDate.entries())
      .map(([date, quantity]) => ({ date, quantity }))
      .sort((a, b) => a.date.localeCompare(b.date)));

    // 컬러별로 제품 데이터 합산 (전매장 합산)
    const colorKey = color;
    
    if (!colorProductsMap.has(colorKey)) {
      // 새 컬러 제품 생성
      // 제품명 생성: 컬러 코드를 괄호 안에 넣어서 extractColorCode가 추출할 수 있도록 함
      const finalProductName = productName ? `${productName} (${color})` : `플러시 미야옹 비니 (${color})`;
      console.log(`[parseAllStoresExcel] 제품명 생성: ${finalProductName}, 컬러: ${color}`);
      
      colorProductsMap.set(colorKey, {
        id: `MB_COLOR_${colorKey.replace(/\s+/g, '_')}`,
        name: finalProductName,
        category: '비니',
        currentStock: stockFromSheet,
        price: price,
        salesHistory: [],
      });
    }

    const product = colorProductsMap.get(colorKey)!;
    
    // 판매 데이터 병합 (같은 날짜면 합산) - 전매장 합산
    const salesMap = new Map<string, number>();
    product.salesHistory.forEach(sale => {
      salesMap.set(sale.date, sale.quantity);
    });
    salesHistory.forEach(sale => {
      const existingQty = salesMap.get(sale.date) || 0;
      salesMap.set(sale.date, existingQty + sale.quantity);
    });
    
    product.salesHistory = Array.from(salesMap.entries())
      .map(([date, quantity]) => ({ date, quantity }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // 컬러별 제품을 매장 구조로 변환 (기존 구조 유지)
  const colorProducts = Array.from(colorProductsMap.values());
  
  // 더미 매장 데이터 생성 (컬러별 제품을 포함)
  const stores: StoreData[] = [{
    storeCode: 'ALL',
    storeName: '전체',
    district: '전체',
    products: colorProducts
  }];
  
  // 상권별로 그룹화
  const districtMap2 = new Map<string, StoreData[]>();
  stores.forEach(store => {
    const district = store.district || '기타';
    if (!districtMap2.has(district)) {
      districtMap2.set(district, []);
    }
    districtMap2.get(district)!.push(store);
  });
  
  const districts: DistrictData[] = Array.from(districtMap2.entries()).map(([districtName, stores]) => ({
    districtName,
    stores
  }));

  // 매장별 판매 데이터를 반환값에 포함 (백화점 필터링을 위해)
  // storeSalesMap을 직렬화 가능한 형태로 변환
  const storeSalesData: Record<string, Record<string, DailySale[]>> = {};
  storeSalesMap.forEach((colorMap, storeName) => {
    const storeDistrict = districtMap.get(storeName) || '기타';
    const storeKey = `${storeName}__${storeDistrict}`; // 매장명과 상권구분을 함께 저장
    storeSalesData[storeKey] = {};
    colorMap.forEach((sales, color) => {
      storeSalesData[storeKey][color] = sales;
    });
  });

  return { stores, districts, storeSalesData };
};

export const parseMiyawngBiniExcel = (filePath: string): Product[] => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  // 헤더 행 찾기 (Row 1)
  const headerRow = rawData[1] as any[];
  if (!headerRow) {
    throw new Error('헤더 행을 찾을 수 없습니다.');
  }

  // 날짜 컬럼 인덱스 찾기 (인덱스 18부터 시작)
  const dateColumns: { index: number; date: string }[] = [];
  for (let i = 18; i < headerRow.length; i++) {
    const cellValue = headerRow[i];
    if (typeof cellValue === 'number' && cellValue > 40000) {
      // Excel 날짜 형식 (40000 이상의 숫자)
      const dateStr = excelDateToISOString(cellValue);
      dateColumns.push({ index: i, date: dateStr });
    }
  }

  // 데이터 파싱 (Row 2부터)
  const productsMap = new Map<string, Product>();

  for (let rowIndex = 2; rowIndex < rawData.length; rowIndex++) {
    const row = rawData[rowIndex] as any[];
    if (!row || !row[1]) continue; // 매장코드가 없으면 스킵

    // 매장명은 무시하고, 제품명과 컬러로 구분
    const productCode = row[3] as string; // 품번
    const productName = row[4] as string; // 제품명
    const color = row[5] as string; // 컬러
    const price = Number(row[6]) || 0; // 소비자가
    const stock = Number(row[12]) || 0; // 재고수량

    if (!productName || !color) continue;

    // 제품명 + 컬러로 고유 키 생성
    const productKey = `${productName}_${color}`;

    // 일별 판매 데이터 추출
    const salesHistory: DailySale[] = [];
    dateColumns.forEach(({ index, date }) => {
      const salesQty = Number(row[index]) || 0;
      if (salesQty > 0 || salesHistory.length > 0) {
        // 판매가 있거나 이미 히스토리가 시작된 경우 추가
        salesHistory.push({
          date,
          quantity: salesQty
        });
      }
    });

    // 기존 제품이 있으면 재고와 판매 데이터를 합침
    if (productsMap.has(productKey)) {
      const existing = productsMap.get(productKey)!;
      existing.currentStock += stock;
      
      // 판매 데이터 병합 (같은 날짜면 합산)
      const salesMap = new Map<string, number>();
      existing.salesHistory.forEach(sale => {
        salesMap.set(sale.date, sale.quantity);
      });
      salesHistory.forEach(sale => {
        const existingQty = salesMap.get(sale.date) || 0;
        salesMap.set(sale.date, existingQty + sale.quantity);
      });
      
      existing.salesHistory = Array.from(salesMap.entries())
        .map(([date, quantity]) => ({ date, quantity }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // 새 제품 생성
      productsMap.set(productKey, {
        id: `MB_${productKey.replace(/\s+/g, '_')}`,
        name: `${productName} (${color})`,
        category: '비니',
        currentStock: stock,
        price: price,
        salesHistory: salesHistory.filter(s => s.quantity > 0 || salesHistory.indexOf(s) < 30) // 최근 30일 또는 판매가 있는 데이터만
      });
    }
  }

  return Array.from(productsMap.values());
};
