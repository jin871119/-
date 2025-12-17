# Vercel 환경 변수 설정 가이드

## 🔑 Gemini API 키 설정 방법

### 1단계: Gemini API 키 발급

1. **API 키 발급 사이트 접속**
   - https://aistudio.google.com/apikey 접속
   - Google 계정으로 로그인

2. **API 키 생성**
   - "Create API Key" 버튼 클릭
   - 프로젝트 선택 또는 새로 생성
   - API 키 복사 (예: `AIzaSy...`)

### 2단계: Vercel에 환경 변수 추가

1. **Vercel 대시보드 접속**
   - https://vercel.com 접속
   - 로그인 후 배포된 프로젝트 선택

2. **환경 변수 설정 페이지로 이동**
   - 프로젝트 페이지에서 **"Settings"** 탭 클릭
   - 좌측 메뉴에서 **"Environment Variables"** 클릭

3. **새 환경 변수 추가**
   - **"Add New"** 버튼 클릭
   - 다음 정보 입력:
     - **Key**: `VITE_GEMINI_API_KEY`
     - **Value**: 발급받은 Gemini API 키 (예: `AIzaSy...`)
     - **Environment**: 
       - ✅ Production
       - ✅ Preview
       - ✅ Development
       - (모두 체크하는 것을 권장)

4. **저장**
   - **"Save"** 버튼 클릭

### 3단계: 재배포

환경 변수는 재배포 후에만 적용됩니다:

1. **자동 재배포 대기** (약 1-2분)
   - 또는

2. **수동 재배포**
   - 프로젝트 페이지에서 **"Deployments"** 탭 클릭
   - 최신 배포 옆 **"..."** 메뉴 → **"Redeploy"** 클릭

### 4단계: 확인

재배포 완료 후:
1. 배포된 사이트 접속
2. **"AI 재고 분석"** 버튼 클릭
3. 정상적으로 분석이 실행되는지 확인

## ⚠️ 주의사항

- API 키는 절대 GitHub에 커밋하지 마세요
- `.env.local` 파일은 로컬 개발용이며, Vercel에서는 웹 대시보드에서 설정합니다
- 환경 변수 변경 후에는 반드시 재배포해야 합니다

## 🔍 문제 해결

**여전히 API 키 오류가 발생하는 경우:**

1. 환경 변수 이름 확인: `VITE_GEMINI_API_KEY` (정확히 일치해야 함)
2. 재배포 확인: 환경 변수 추가 후 반드시 재배포 필요
3. 브라우저 캐시 삭제: Ctrl+Shift+R (강력 새로고침)
4. Vercel 로그 확인: Deployments → 최신 배포 → "View Function Logs"
