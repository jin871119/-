import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Vercel 환경 변수는 process.env에서 자동으로 제공됨
    // loadEnv는 .env 파일에서 읽지만, Vercel에서는 process.env를 직접 사용
    const env = loadEnv(mode, '.', '');
    
    // Vercel 환경 변수 우선 사용 (process.env에서 직접 읽기)
    const geminiApiKey = process.env.VITE_GEMINI_API_KEY || 
                         process.env.GEMINI_API_KEY || 
                         env.VITE_GEMINI_API_KEY || 
                         env.GEMINI_API_KEY;
    
    console.log('[Vite Config] 환경 변수 로드:', {
      mode,
      'process.env.VITE_GEMINI_API_KEY': process.env.VITE_GEMINI_API_KEY ? '있음' : '없음',
      'process.env.GEMINI_API_KEY': process.env.GEMINI_API_KEY ? '있음' : '없음',
      'env.VITE_GEMINI_API_KEY': env.VITE_GEMINI_API_KEY ? '있음' : '없음',
      'env.GEMINI_API_KEY': env.GEMINI_API_KEY ? '있음' : '없음',
      '최종 사용 키': geminiApiKey ? '있음' : '없음'
    });
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Vite는 VITE_ 접두사가 있는 환경 변수를 자동으로 import.meta.env에 주입
        // 명시적으로 define에 추가하여 확실히 주입
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'import.meta.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
