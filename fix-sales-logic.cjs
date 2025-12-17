const fs = require('fs');

let content = fs.readFileSync('components/SalesChart.tsx', 'utf8');

// Find and replace the sales logic section
const oldPattern = /\/\/ 재고가 있으면 판매 진행, 재고가 없으면 판매 없음\s+let dailySales = 0;\s+if \(currentForecastStock > 0\) \{\s+\/\/ 재고에 따른 동적 판매량 계산[\s\S]*?\/\/ 일일 판매량 차감\s+currentForecastStock -= dailySales;\s+\}/;

const newCode = `// 재고가 있으면 판매 진행, 재고가 없으면 판매 없음
         let dailySales = 0;
         if (currentForecastStock > 0) {
           // 재고에 따른 동적 판매량 계산
           // 재고가 많을수록 판매량 증가 (최대 1.5배), 재고가 없으면 판매 없음
           // 입고 후 재고가 증가하면 판매량도 즉시 증가하는 추세 반영
           const currentStockRatio = Math.min(1.5, 1 + (currentForecastStock / 100));
           const targetDailySales = baseAverageDailySales * currentStockRatio;
           
           // 실제 판매 가능한 수량 = min(목표 판매량, 현재 재고)
           // 재고가 부족하면 현재 재고만큼만 판매
           dailySales = Math.min(targetDailySales, currentForecastStock);
           
           // 일일 판매량 차감 (항상 0 이상 유지)
           currentForecastStock -= dailySales;
         }`;

content = content.replace(oldPattern, newCode);

fs.writeFileSync('components/SalesChart.tsx', content, 'utf8');
console.log('SalesChart.tsx fixed successfully');
