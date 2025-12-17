import React from 'react';
import { ProductForecast, StockLevel } from '../types';
import StockStatusBadge from './StockStatusBadge';

interface Props {
  products: ProductForecast[];
  onSelectProduct: (product: ProductForecast) => void;
  selectedProductId: string | null;
}

const InventoryTable: React.FC<Props> = ({ products, onSelectProduct, selectedProductId }) => {
  // Sort products: Critical first, then Warning, then Safe
  const sortedProducts = [...products].sort((a, b) => {
    const priority = {
      [StockLevel.OUT_OF_STOCK]: 0,
      [StockLevel.CRITICAL]: 1,
      [StockLevel.WARNING]: 2,
      [StockLevel.SAFE]: 3,
    };
    return priority[a.status] - priority[b.status] || a.daysUntilEmpty - b.daysUntilEmpty;
  });

  const getBarColor = (status: StockLevel) => {
    switch (status) {
      case StockLevel.SAFE: return 'bg-emerald-500';
      case StockLevel.WARNING: return 'bg-amber-500';
      case StockLevel.CRITICAL: return 'bg-rose-500';
      case StockLevel.OUT_OF_STOCK: return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명 / 카테고리</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">가용재고</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">일평균 판매</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">예상 소진일 (재고수준)</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProducts.map((product) => {
              // Calculate percentage for bar (Max 30 days)
              // 가용재고 기준 (재고시트의 재고 데이터)
              const availableStock = product.currentStock; // 재고시트에서 읽은 가용재고
              const maxDays = 30;
              let percentage = 0;
              if (availableStock > 0 && product.averageDailySales === 0) {
                 percentage = 100; // Sales 0 means infinite stock
              } else if (product.daysUntilEmpty !== Infinity) {
                 percentage = Math.min((product.daysUntilEmpty / maxDays) * 100, 100);
              }
              
              return (
                <tr 
                  key={product.id} 
                  onClick={() => onSelectProduct(product)}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedProductId === product.id ? 'bg-indigo-50 hover:bg-indigo-100' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{product.name}</span>
                      <span className="text-xs text-gray-500">{product.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                    {availableStock.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    {product.averageDailySales.toFixed(1)}개
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="text-sm text-gray-900 font-medium">
                          {product.predictedEmptyDate || '-'}
                      </div>
                      
                      {/* Visual Stock Level Bar */}
                      {product.daysUntilEmpty !== Infinity && availableStock > 0 ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 tabular-nums">
                                {product.daysUntilEmpty.toFixed(0)}일 남음
                            </span>
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(product.status)}`} 
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                      ) : availableStock === 0 ? (
                        <span className="text-xs text-red-500 font-medium">재고 없음</span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">재고 충분</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <StockStatusBadge status={product.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;