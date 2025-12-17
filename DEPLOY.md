# Vercel 배포 가이드

## 방법 1: Vercel CLI 사용 (권장)

1. **Vercel CLI 설치**
   ```bash
   npm install -g vercel
   ```

2. **프로젝트 디렉토리에서 로그인**
   ```bash
   vercel login
   ```

3. **배포 실행**
   ```bash
   vercel
   ```
   
   첫 배포 시:
   - 프로젝트 이름 설정
   - 배포 설정 확인
   - 프로덕션 배포 여부 선택

4. **프로덕션 배포**
   ```bash
   vercel --prod
   ```

## 방법 2: GitHub 연동 (자동 배포)

1. **GitHub에 프로젝트 푸시**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Vercel 웹사이트에서 배포**
   - https://vercel.com 접속
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - 프로젝트 설정 확인 후 "Deploy" 클릭

## 환경 변수 설정

Vercel 대시보드에서 환경 변수를 설정하세요:

1. Vercel 프로젝트 설정 → Environment Variables
2. 다음 변수 추가:
   - `VITE_GEMINI_API_KEY` 또는 `GEMINI_API_KEY`: Gemini API 키

## 빌드 설정

- **Framework Preset**: Vite
- **Build Command**: `npm run build` (자동 감지)
- **Output Directory**: `dist` (자동 감지)
- **Install Command**: `npm install` (자동 감지)

## 배포 후 확인

배포가 완료되면 Vercel이 제공하는 URL로 접속하여 확인하세요.
