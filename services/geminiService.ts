import { GoogleGenAI } from "@google/genai";
import { ProductForecast, StockLevel } from "../types";

// API 키 확인
const getApiKey = (): string | null => {
  // Vite 환경 변수 읽기 (빌드 시점에 주입됨)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY || 
                 (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
                 (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
                 (typeof process !== 'undefined' && process.env?.API_KEY);
  
  // 디버깅: 환경 변수 확인 (프로덕션에서도 확인 가능)
  console.log('[Gemini Service] 환경 변수 확인:', {
    'import.meta.env.VITE_GEMINI_API_KEY': import.meta.env.VITE_GEMINI_API_KEY ? `설정됨 (${import.meta.env.VITE_GEMINI_API_KEY.substring(0, 10)}...)` : '없음',
    'import.meta.env.GEMINI_API_KEY': import.meta.env.GEMINI_API_KEY ? `설정됨 (${import.meta.env.GEMINI_API_KEY.substring(0, 10)}...)` : '없음',
    'import.meta.env.MODE': import.meta.env.MODE,
    'import.meta.env.PROD': import.meta.env.PROD,
    'process.env.VITE_GEMINI_API_KEY': typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY ? '설정됨' : '없음',
    'process.env.GEMINI_API_KEY': typeof process !== 'undefined' && process.env?.GEMINI_API_KEY ? '설정됨' : '없음',
  });
  
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || (typeof apiKey === 'string' && apiKey.trim() === '')) {
    console.warn('[Gemini Service] API 키가 설정되지 않았습니다.');
    return null;
  }
  return apiKey;
};

export const getInventoryAnalysis = async (products: ProductForecast[]): Promise<string> => {
  try {
    // API 키 확인
    const apiKey = getApiKey();
    if (!apiKey) {
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
      if (isVercel) {
        return "⚠️ **API 키가 설정되지 않았습니다.**\n\n**Vercel 환경 변수 설정 방법:**\n\n1. Vercel 대시보드 접속: https://vercel.com\n2. 프로젝트 선택 → Settings → Environment Variables\n3. 다음 환경 변수 추가:\n   - **Key**: `VITE_GEMINI_API_KEY`\n   - **Value**: (Gemini API 키)\n   - **Environment**: Production, Preview, Development (모두 선택)\n4. 저장 후 **Redeploy** 클릭\n\n**API 키 발급:**\nhttps://aistudio.google.com/apikey\n\n**로컬 개발 시:**\n`.env.local` 파일에 `VITE_GEMINI_API_KEY=your_api_key_here` 추가";
      } else {
        return "⚠️ **API 키가 설정되지 않았습니다.**\n\n`.env.local` 파일을 생성하고 다음 내용을 추가해주세요:\n```\nVITE_GEMINI_API_KEY=your_api_key_here\n```\n\nAPI 키는 https://aistudio.google.com/apikey 에서 발급받을 수 있습니다.";
      }
    }

    // AI 인스턴스 생성
    const ai = new GoogleGenAI({ apiKey });

    // Prepare a simplified dataset for the AI to consume fewer tokens and focus on key metrics
    const inventorySummary = products.map(p => ({
      name: p.name,
      stock: p.currentStock,
      warehouseStock: p.warehouseStock || 0,
      totalStock: p.currentStock + (p.warehouseStock || 0),
      avgDailySales: p.averageDailySales.toFixed(1),
      daysLeft: p.daysUntilEmpty === Infinity ? 'N/A' : p.daysUntilEmpty.toFixed(1),
      status: p.status
    }));

    const prompt = `
      다음은 현재 상품 재고 및 판매 데이터입니다. 
      재고 관리자로서, 이 데이터를 분석하여 한국어로 요약 보고서를 작성해주세요.
      
      데이터: ${JSON.stringify(inventorySummary, null, 2)}
      
      다음 내용을 포함해주세요:
      1. **긴급 조치 필요 항목**: 'CRITICAL' 또는 'OUT_OF_STOCK' 상태인 품목에 대한 구체적인 발주 권고.
      2. **판매 추세 요약**: 판매 속도가 빠른 품목 식별.
      3. **재고 최적화 제안**: 재고가 너무 많이 남은 품목이나 부족한 품목에 대한 전략.
      4. **매장재고 vs 물류재고**: 매장재고와 물류재고의 균형에 대한 제안.
      
      보고서는 간결하고 실행 가능한 항목 위주로 작성해주세요. 마크다운 형식을 사용하세요.
    `;

    // 모델 사용 - 사용 가능한 모델 순차 시도
    // 타입 정의에 따르면: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash 등이 사용 가능
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash-001'
    ];

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`모델 시도: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
          }
        });

        return response.text || "분석을 생성할 수 없습니다.";
      } catch (modelError: any) {
        console.warn(`${modelName} 실패:`, modelError?.message || modelError);
        lastError = modelError;
        // 다음 모델 시도
        continue;
      }
    }

    // 모든 모델 실패
    throw lastError || new Error('사용 가능한 모델을 찾을 수 없습니다.');
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    
    // 더 구체적인 에러 메시지
    let errorMessage = "AI 분석 중 오류가 발생했습니다.\n\n";
    
    if (error?.message) {
      errorMessage += `오류 내용: ${error.message}\n\n`;
    }
    
    if (error?.message?.includes('API_KEY') || error?.message?.includes('api key')) {
      errorMessage += "API 키가 유효하지 않거나 설정되지 않았습니다. `.env.local` 파일을 확인해주세요.";
    } else if (error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
      errorMessage += "API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
    } else {
      errorMessage += "잠시 후 다시 시도해주세요. 문제가 계속되면 브라우저 콘솔을 확인해주세요.";
    }
    
    return errorMessage;
  }
};
