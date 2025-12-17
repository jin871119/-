import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { parseAllStoresExcel } from '../utils/excelParser';

// 실행
try {
  const { stores, districts, storeSalesData } = parseAllStoresExcel('미야옹_전매장.xlsx');
  console.log(`Parsed ${stores.length} stores`);
  console.log(`Found ${districts.length} districts`);
  
  districts.forEach(district => {
    console.log(`  - ${district.districtName}: ${district.stores.length} stores`);
  });
  
  stores.forEach(store => {
    console.log(`  - ${store.storeName} (${store.storeCode}) [${store.district || '기타'}]: ${store.products.length} products`);
  });
  
  // 매장별 판매 데이터 확인
  if (storeSalesData) {
    console.log(`\n매장별 판매 데이터: ${Object.keys(storeSalesData).length}개 매장`);
    Object.keys(storeSalesData).forEach(storeKey => {
      const [storeName, district] = storeKey.split('__');
      console.log(`  - ${storeName} [${district}]: ${Object.keys(storeSalesData[storeKey]).length}개 컬러`);
    });
  }
  
  // JSON 파일로 저장
  writeFileSync(
    'public/all-stores-data.json',
    JSON.stringify({ stores, districts, storeSalesData }, null, 2),
    'utf-8'
  );
  
  console.log('\nData saved to public/all-stores-data.json');
} catch (error) {
  console.error('Error parsing Excel:', error);
  process.exit(1);
}
