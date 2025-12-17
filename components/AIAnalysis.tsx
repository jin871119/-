import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { getInventoryAnalysis } from '../services/geminiService';
import { ProductForecast } from '../types';

interface Props {
  products: ProductForecast[];
}

const AIAnalysis: React.FC<Props> = ({ products }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (products.length === 0) {
      setAnalysis("⚠️ 분석할 상품 데이터가 없습니다.");
      return;
    }

    setLoading(true);
    setAnalysis(''); // 이전 결과 초기화
    try {
      const result = await getInventoryAnalysis(products);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis(`오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">AI 재고 분석</h2>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-xs font-medium"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {analysis ? '재분석' : '분석 실행'}
        </button>
      </div>

      <div className="flex-1 min-h-[120px]">
        {loading && !analysis && (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">데이터 분석 중...</p>
            </div>
          </div>
        )}

        {!loading && !analysis && (
          <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4">
            <p className="text-xs text-center">전체 재고 데이터를 분석하여<br/>최적화 리포트를 생성합니다.</p>
          </div>
        )}

        {analysis && (
          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 h-full overflow-y-auto text-sm">
             <div className="whitespace-pre-wrap font-sans leading-relaxed">
               {analysis}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;