import React, { useMemo, useState, useEffect } from 'react';
import { MOCK_PRODUCTS, WAREHOUSE_STOCK, REORDER_SCHEDULE, extractColorCode } from './constants';
import { ProductForecast, StockLevel, Product, DailySale } from './types';
import InventoryTable from './components/InventoryTable';
import SalesChart from './components/SalesChart';
import AIAnalysis from './components/AIAnalysis';
import AddProductModal from './components/AddProductModal';
import { LayoutDashboard, Package, AlertCircle, Plus, Trash2, Upload } from 'lucide-react';

interface StoreData {
  storeCode: string;
  storeName: string;
  district?: string;
  products: Product[];
}

interface DistrictData {
  districtName: string;
  stores: StoreData[];
}

// 전매장 데이터를 합산하여 기본 데이터 생성
const aggregateAllStoresData = (storesData: StoreData[], originalProducts: Product[]): Product[] => {
  // 제품명으로 그룹화하여 전매장 판매 데이터 합산
  const aggregatedMap = new Map<string, Product>();

  // 전매장 데이터에서 모든 제품의 판매 데이터 합산
  storesData.forEach(store => {
    store.products.forEach(storeProduct => {
      const productKey = storeProduct.name;

      if (!aggregatedMap.has(productKey)) {
        // 기존 제품 정보 찾기 (재고시트 재고는 전매장 데이터에서 가져옴)
        const originalProduct = originalProducts.find(p => p.name === productKey);

        // 컬러 코드 추출하여 리오더 일정 가져오기
        const colorCode = extractColorCode(productKey);
        let reorderSchedule = colorCode ? REORDER_SCHEDULE[colorCode] : (originalProduct?.reorderSchedule || undefined);

        // 대소문자 불일치 문제 해결: 컬러 코드를 대문자로 변환하여 다시 시도
        if (!reorderSchedule && colorCode) {
          const upperColorCode = colorCode.toUpperCase();
          if (upperColorCode !== colorCode && REORDER_SCHEDULE[upperColorCode]) {
            reorderSchedule = REORDER_SCHEDULE[upperColorCode];
            console.log(`[aggregateAllStoresData] ${productKey}: 컬러 코드 대소문자 변환 ${colorCode} -> ${upperColorCode}`);
          }
        }

        // 디버깅: 컬러 코드 및 입고 일정 확인
        if (colorCode) {
          console.log(`[aggregateAllStoresData] ${productKey}: 컬러 코드=${colorCode}, 입고 일정=`, reorderSchedule, 'REORDER_SCHEDULE keys:', Object.keys(REORDER_SCHEDULE));
        } else {
          console.log(`[aggregateAllStoresData] ${productKey}: 컬러 코드 추출 실패`);
        }

        aggregatedMap.set(productKey, {
          id: originalProduct?.id || storeProduct.id || `MB_${Date.now()}_${productKey}`,
          name: productKey,
          category: storeProduct.category || '비니',
          // 전매장 데이터의 재고시트 재고를 우선 사용, 없으면 기존 재고 사용
          currentStock: storeProduct.currentStock > 0 ? storeProduct.currentStock : (originalProduct?.currentStock || 0),
          price: originalProduct?.price || storeProduct.price || 0,
          salesHistory: [], // 합산할 판매 데이터
          warehouseStock: originalProduct?.warehouseStock,
          reorderSchedule: reorderSchedule,
        });
      }

      const aggregatedProduct = aggregatedMap.get(productKey)!;

      // 판매 데이터 합산
      const salesMap = new Map<string, number>();

      // 기존 판매 데이터
      aggregatedProduct.salesHistory.forEach(sale => {
        salesMap.set(sale.date, sale.quantity);
      });

      // 새 매장의 판매 데이터 추가
      storeProduct.salesHistory.forEach(sale => {
        const existingQty = salesMap.get(sale.date) || 0;
        salesMap.set(sale.date, existingQty + sale.quantity);
      });

      // 정렬하여 업데이트
      aggregatedProduct.salesHistory = Array.from(salesMap.entries())
        .map(([date, quantity]) => ({ date, quantity }))
        .sort((a, b) => a.date.localeCompare(b.date));
    });
  });

  return Array.from(aggregatedMap.values());
};

const App: React.FC = () => {
  // Initialize state with Miyawng Bini data
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allStoresData, setAllStoresData] = useState<StoreData[]>([]);
  const [districtsData, setDistrictsData] = useState<DistrictData[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]); // 기존 재고수량 유지용

  // Load Miyawng Bini data on mount
  useEffect(() => {
    const loadMiyawngBiniData = async () => {
      try {
        // 기존 데이터 로드 (재고수량 유지용)
        let originalProductsData: Product[] = [];
        const response = await fetch('/miyawng-bini-data.json');
        if (response.ok) {
          const data = await response.json();
          originalProductsData = (data as any[]).map((item: any) => {
            const colorCode = extractColorCode(item.name);
            const warehouseStock = colorCode ? WAREHOUSE_STOCK[colorCode] : undefined;
            const reorderSchedule = colorCode ? REORDER_SCHEDULE[colorCode] : undefined;

            return {
              ...item,
              salesHistory: item.salesHistory || [],
              warehouseStock: warehouseStock,
              reorderSchedule: reorderSchedule
            };
          }) as Product[];
        } else {
          originalProductsData = MOCK_PRODUCTS;
        }

        setOriginalProducts(originalProductsData);

        // 전매장 데이터 로드 및 합산
        try {
          const allStoresResponse = await fetch('/all-stores-data.json');
          if (allStoresResponse.ok) {
            const data = await allStoresResponse.json();
            const storesData = (data.stores || data) as StoreData[];
            const districts = (data.districts || []) as DistrictData[];

            setAllStoresData(storesData);
            setDistrictsData(districts);

            // 전매장 데이터를 합산하여 기본 데이터로 사용
            const aggregatedProducts = aggregateAllStoresData(storesData, originalProductsData);
            setProducts(aggregatedProducts);
          } else {
            // 전매장 데이터가 없으면 기존 데이터 사용
            setProducts(originalProductsData);
          }
        } catch (error) {
          console.warn('전매장 데이터를 로드할 수 없습니다:', error);
          setProducts(originalProductsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setOriginalProducts(MOCK_PRODUCTS);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadMiyawngBiniData();
  }, []);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper: Generate synthetic history based on average sales
  const generateSyntheticHistory = (avgSales: number): DailySale[] => {
    const history: DailySale[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      // Create slight random variance around the average
      const variance = Math.max(1, Math.floor(avgSales * 0.3));
      const quantity = Math.max(0, Math.floor(avgSales + (Math.random() * variance * 2 - variance)));
      history.push({
        date: date.toISOString().split('T')[0],
        quantity
      });
    }
    return history;
  };

  const handleAddProduct = (data: { name: string; category: string; currentStock: number; price: number; avgDailySales: number }) => {
    const newProduct: Product = {
      id: `P${Date.now()}`, // Simple ID generation
      name: data.name,
      category: data.category,
      currentStock: data.currentStock,
      price: data.price,
      salesHistory: generateSyntheticHistory(data.avgDailySales)
    };

    setProducts(prev => [newProduct, ...prev]);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('정말 이 상품을 삭제하시겠습니까?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      if (selectedProductId === id) setSelectedProductId(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      setProducts([]);
      setSelectedProductId(null);
    }
  };

  // Core Logic: Calculate forecasts (derived from products state)
  const forecastData: ProductForecast[] = useMemo(() => {
    return products.map(product => {
      // Calculate Average Daily Sales (Simple Mean) - 일자별 총 판매수량들의 평균값
      // 모든 판매 이력 데이터를 사용하여 평균 계산
      const totalSales = product.salesHistory.reduce((acc, curr) => acc + curr.quantity, 0);
      const days = product.salesHistory.length;
      const averageDailySales = days > 0 ? totalSales / days : 0;

      // Calculate Available Stock (가용재고 - 재고시트의 재고 데이터)
      const availableStock = product.currentStock;

      // 입고 일정을 반영한 실제 소진일 계산
      let predictedEmptyDate: string | null = null;
      let daysUntilEmpty = Infinity;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // 입고 일정 정렬
      const sortedReorderSchedule = (product.reorderSchedule || [])
        .filter(reorder => reorder.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (averageDailySales > 0) {
        // 첫 번째 리오더 날짜 확인
        const firstReorderDate = sortedReorderSchedule.length > 0 ? sortedReorderSchedule[0].date : null;

        // 현재 재고가 첫 번째 리오더 전에 소진되는지 확인
        let stockBeforeReorder = availableStock;
        let willRunOutBeforeReorder = false;

        if (firstReorderDate && availableStock > 0) {
          const firstReorderDateObj = new Date(firstReorderDate);
          const daysUntilFirstReorder = Math.ceil((firstReorderDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // 리오더 전까지 현재 재고 소진 시뮬레이션
          for (let d = 1; d <= daysUntilFirstReorder && stockBeforeReorder > 0; d++) {
            // 재고가 있으면 판매 진행, 재고가 없으면 판매 없음
            // 재고량을 초과하지 않도록 판매량 제한
            let dailySales = 0;
            if (stockBeforeReorder > 0) {
              const stockRatio = Math.min(1.5, 1 + (stockBeforeReorder / 100));
              const calculatedDailySales = averageDailySales * stockRatio;
              
              // 재고량을 초과하지 않도록 판매량 제한 (재고가 20개면 최대 20개만 판매)
              dailySales = Math.min(calculatedDailySales, stockBeforeReorder);
              stockBeforeReorder -= dailySales;
            }
            // 재고가 0이면 판매량도 0 (판매 없음)
          }

          willRunOutBeforeReorder = stockBeforeReorder <= 0;
        }

        // 시뮬레이션 시작
        let currentStock = willRunOutBeforeReorder && firstReorderDate ? 0 : availableStock;
        let dayOffset = 1;
        let reorderIndex = 0;
        const maxDays = 365;
        let hasFoundEmptyDate = false;

        while (dayOffset <= maxDays && !hasFoundEmptyDate) {
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + dayOffset);
          const nextDateStr = nextDate.toISOString().split('T')[0];

          // 1단계: 입고 반영 (해당 날짜에 입고가 있으면 먼저 반영)
          // 입고 후 재고가 증가하면 판매 추세도 즉시 증가하는 것을 반영
          while (reorderIndex < sortedReorderSchedule.length &&
            sortedReorderSchedule[reorderIndex].date <= nextDateStr) {
            const reorder = sortedReorderSchedule[reorderIndex];
            // 현재 날짜 또는 이전 날짜의 모든 입고를 반영
            // (시뮬레이션에서 놓친 입고도 모두 반영)
            if (willRunOutBeforeReorder && reorder.date === firstReorderDate) {
              // 현재 재고가 리오더 전에 소진되었으면, 리오더 물량만으로 시작
              currentStock = reorder.quantity;
            } else {
              currentStock += reorder.quantity;
            }
            // 입고 후 재고가 증가했으므로 다음 단계에서 판매량도 증가됨
            reorderIndex++;
          }

          // 2단계: 재고에 따른 동적 판매량 계산
          // 재고가 있으면 판매 진행, 재고가 없으면 판매 없음
          // 재고량을 초과하지 않도록 판매량 제한
          let dailySales = 0;
          if (currentStock > 0) {
            // 재고가 많을수록 판매량 증가 (최대 1.5배), 재고가 없으면 판매 없음
            // 입고 후 재고가 증가하면 판매량도 즉시 증가하는 추세 반영
            const currentStockRatio = Math.min(1.5, 1 + (currentStock / 100));
            const calculatedDailySales = averageDailySales * currentStockRatio;
            
            // 재고량을 초과하지 않도록 판매량 제한 (재고가 20개면 최대 20개만 판매)
            dailySales = Math.min(calculatedDailySales, currentStock);
            
            // 3단계: 판매량 차감
            currentStock -= dailySales;
          }
          // 재고가 0이면 판매량도 0 (판매 없음)

          // 4단계: 재고가 0 이하가 되었을 때 처리
          if (currentStock <= 0) {
            // 더 이상 입고 일정이 있는지 확인
            const hasMoreReorder = reorderIndex < sortedReorderSchedule.length;
            if (!hasMoreReorder) {
              // 더 이상 입고가 없으면 소진일로 설정
              daysUntilEmpty = dayOffset;
              predictedEmptyDate = nextDateStr;
              hasFoundEmptyDate = true;
              break;
            }
            // 입고가 더 있으면 재고를 0으로 설정하고 계속 시뮬레이션
            // (다음 입고일까지 재고가 0인 상태로 유지, 입고 후 판매 추세 다시 증가)
            currentStock = 0;
          }

          dayOffset++;
        }
      } else if (availableStock === 0 && sortedReorderSchedule.length === 0) {
        // 일반적인 경우: 현재 재고가 있는 경우
        let currentStock = availableStock;
        let dayOffset = 1; // 다음 날부터 시작
        let reorderIndex = 0;
        const maxDays = 365;

        // 재고가 0이 되는 시점까지 시뮬레이션
        while (dayOffset <= maxDays && currentStock > 0) {
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + dayOffset);
          const nextDateStr = nextDate.toISOString().split('T')[0];

          // 입고 반영 (해당 날짜 또는 이전 날짜의 모든 입고를 먼저 반영)
          while (reorderIndex < sortedReorderSchedule.length &&
            sortedReorderSchedule[reorderIndex].date <= nextDateStr) {
            const reorder = sortedReorderSchedule[reorderIndex];
            currentStock += reorder.quantity;
            reorderIndex++;
          }

          // 재고에 따른 동적 판매량 계산
          // 재고가 있으면 판매 진행, 재고가 없으면 판매 없음
          // 재고량을 초과하지 않도록 판매량 제한
          let dailySales = 0;
          if (currentStock > 0) {
            // 재고가 많을수록 판매량 증가 (최대 1.5배), 재고가 없으면 판매 없음
            const currentStockRatio = Math.min(1.5, 1 + (currentStock / 100));
            const calculatedDailySales = averageDailySales * currentStockRatio;
            
            // 재고량을 초과하지 않도록 판매량 제한 (재고가 20개면 최대 20개만 판매)
            dailySales = Math.min(calculatedDailySales, currentStock);
            
            // 판매량 차감
            currentStock -= dailySales;
          }
          // 재고가 0이면 판매량도 0 (판매 없음)

          if (currentStock <= 0) {
            daysUntilEmpty = dayOffset;
            predictedEmptyDate = nextDateStr;
            break;
          }

          dayOffset++;
        }
      } else if (availableStock === 0 && sortedReorderSchedule.length === 0) {
        // 재고가 0이고 리오더도 없으면 오늘이 소진일
        daysUntilEmpty = 0;
        predictedEmptyDate = todayStr;
      }

      // Determine Status (가용재고 기준)
      let status = StockLevel.SAFE;
      if (availableStock === 0) {
        status = StockLevel.OUT_OF_STOCK;
      } else if (daysUntilEmpty <= 3) {
        status = StockLevel.CRITICAL;
      } else if (daysUntilEmpty <= 7) {
        status = StockLevel.WARNING;
      }

      return {
        ...product,
        averageDailySales,
        daysUntilEmpty,
        predictedEmptyDate,
        status
      };
    });
  }, [products]);



  const selectedProduct = useMemo(() =>
    forecastData.find(p => p.id === selectedProductId) || null,
    [forecastData, selectedProductId]);

  const stats = useMemo(() => {
    return {
      totalProducts: forecastData.length,
      lowStock: forecastData.filter(p => p.status === StockLevel.WARNING || p.status === StockLevel.CRITICAL).length,
      critical: forecastData.filter(p => p.status === StockLevel.CRITICAL || p.status === StockLevel.OUT_OF_STOCK).length
    };
  }, [forecastData]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <LayoutDashboard className="h-6 w-6 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">재고 예측 대시보드</h1>
              <h1 className="text-xl font-bold text-gray-900 sm:hidden">재고 예측</h1>
            </div>
            <div className="flex items-center gap-2">
              {products.length > 0 && (
                <>
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                  >
                    초기화
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/miyawng-bini-data.json');
                        if (response.ok) {
                          const data = await response.json();
                          const loadedProducts = (data as any[]).map((item: any) => {
                            const colorCode = extractColorCode(item.name);
                            const warehouseStock = colorCode ? WAREHOUSE_STOCK[colorCode] : undefined;
                            const reorderSchedule = colorCode ? REORDER_SCHEDULE[colorCode] : undefined;
                            return {
                              ...item,
                              salesHistory: item.salesHistory || [],
                              warehouseStock: warehouseStock,
                              reorderSchedule: reorderSchedule
                            };
                          }) as Product[];
                          setProducts(loadedProducts);
                        }
                      } catch (error) {
                        console.error('Error reloading data:', error);
                      }
                    }}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                    title="미야옹비니 데이터 다시 로드"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">데이터 재로드</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">상품 등록</span>
                <span className="sm:hidden">등록</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {isLoadingData && (
          <div className="text-center py-8 text-gray-500">데이터 로딩 중...</div>
        )}


        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">총 관리 상품</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}개</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-amber-100 mr-4">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">재고 부족 주의</p>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStock}개</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-rose-100 mr-4">
              <AlertCircle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">품절 임박/위험</p>
              <p className="text-2xl font-bold text-rose-600">{stats.critical}개</p>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 상품이 없습니다</h3>
            <p className="text-gray-500 mb-6">새로운 상품을 등록하여 재고 관리를 시작해보세요.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              첫 상품 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Table Area */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">재고 현황 및 예측</h2>
              </div>
              <div className="flex-1 min-h-[500px]">
                <InventoryTable
                  products={forecastData}
                  onSelectProduct={(p) => setSelectedProductId(p.id)}
                  selectedProductId={selectedProductId}
                />
              </div>
            </div>

            {/* Sidebar: Details & AI */}
            <div className="flex flex-col gap-6">

              {/* Chart Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 min-h-[500px] relative">
                {selectedProductId && (
                  <button
                    onClick={() => handleDeleteProduct(selectedProductId)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                    title="이 상품 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <SalesChart product={selectedProduct} />
              </div>

              {/* 계산 로직 설명 */}
              {selectedProduct && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-xs text-gray-600">
                  <div className="font-semibold text-gray-700 mb-2">📊 소진 예측 계산 로직</div>
                  <div className="space-y-1">
                    <div>• <strong>기본 일평균 판매량:</strong> 과거 판매 이력의 평균값</div>
                    <div>• <strong>동적 판매량 조정:</strong> 재고가 많을수록 판매량 증가 (최대 1.5배), 재고 부족 시 감소 (0.3배)</div>
                    <div>• <strong>일일 재고 변화:</strong> 전일 재고 + 입고량 - 일일 판매량</div>
                    <div>• <strong>입고 일정 반영:</strong> 예정된 입고 일정에 따라 재고 증가</div>
                    <div>• <strong>소진일 계산:</strong> 입고 일정과 동적 판매량을 반영하여 재고가 0이 되는 시점 계산</div>
                    {selectedProduct.reorderSchedule && selectedProduct.reorderSchedule.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="font-semibold text-gray-700">📦 입고 일정:</div>
                        {selectedProduct.reorderSchedule.map((reorder, idx) => (
                          <div key={idx} className="ml-2">
                            {reorder.date}: +{reorder.quantity.toLocaleString()}개
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis Card */}
              <AIAnalysis products={forecastData} />

            </div>
          </div>
        )}
      </main>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddProduct}
      />
    </div>
  );
};

export default App;