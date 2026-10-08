import type { SiteLang } from '../../lib/siteLang'

/**
 * 로그인 화면 문구 (한국어 / English / 中文). 서버가 내려주는 오류 메시지(res.message)는 서버 언어 그대로 표시한다.
 * 함수형 항목은 이름·주소 같은 값을 문장 안에 끼워 넣는다.
 */
export interface LoginMsgs {
  tagline: string
  backHome: string
  heading: string
  google: string
  metamask: string
  noAccount: string
  signup: string
  termsBefore: string
  termsLink: string
  termsAfter: string
  naverChecking: string
  naverOk: (name: string) => string
  naverFail: string
  naverError: string
  naverOpening: string
  googleNoClientId: string
  googleLoading: string
  googleOpening: string
  googleProfile: string
  googleOk: (name: string) => string
  googleFail: string
  googleProfileErr: (msg: string) => string
  googleCancel: string
  googlePopupFail: (msg: string) => string
  kakaoOpening: string
  kakaoOk: (name: string) => string
  kakaoFail: string
  kakaoProfileFail: (msg: string) => string
  kakaoCancel: string
  appleLoading: string
  appleOpening: string
  appleOk: (name: string) => string
  appleFail: string
  appleCancel: (msg: string) => string
  metamaskMissing: string
  metamaskWaiting: string
  metamaskOk: (addr: string) => string
  metamaskFail: string
  metamaskCancel: string
  instantRunning: (provider: string) => string
  instantOk: (name: string, provider: string) => string
  instantFail: string
  instantDone: (provider: string) => string
  emailRequired: string
  emailVerifying: string
  emailOk: (name: string) => string
  emailFail: string
  serverError: (msg: string) => string
  networkHint: string
}

const ko: LoginMsgs = {
  tagline: '실시간 시장 데이터와 분석 도구를 더 빠르게 확인하세요.',
  backHome: '홈으로 돌아가기',
  heading: '로그인',
  google: 'Google로 계속하기',
  metamask: 'MetaMask 지갑 연결',
  noAccount: '아직 계정이 없으신가요?',
  signup: '무료 회원가입',
  termsBefore: '로그인함으로써 귀하는 저희 ',
  termsLink: '개인정보 처리방침',
  termsAfter: ' 및 서비스 이용약관에 동의합니다.',
  naverChecking: '네이버 공식 프로필 확인 중...',
  naverOk: (n) => `🎉 [${n}] 님, 네이버 공식 계정 로그인 성공!`,
  naverFail: '네이버 로그인 실패',
  naverError: '네이버 연동 처리 오류',
  naverOpening: '네이버 공식 로그인 창을 여는 중...',
  googleNoClientId: '구글 Client ID 환경 변수가 설정되지 않았습니다. .env.local을 확인해 주세요.',
  googleLoading: '구글 인증 모듈을 로딩 중입니다. 1~2초 후 다시 시도해 주세요.',
  googleOpening: '구글 공식 계정 로그인 창을 여는 중...',
  googleProfile: '구글 공식 프로필 확인 중...',
  googleOk: (n) => `🎉 [${n}] 님, 구글 공식 계정 로그인 성공!`,
  googleFail: '구글 로그인 처리에 실패했습니다.',
  googleProfileErr: (m) => '구글 프로필 조회 오류: ' + m,
  googleCancel: '구글 로그인이 취소되었거나 팝업이 닫혔습니다.',
  googlePopupFail: (m) => '구글 로그인 팝업 호출 실패: ' + m,
  kakaoOpening: '카카오 공식 계정 로그인 창을 여는 중...',
  kakaoOk: (n) => `🎉 [${n}] 님, 카카오 공식 계정 로그인 성공!`,
  kakaoFail: '카카오 로그인 처리에 실패했습니다.',
  kakaoProfileFail: (m) => '카카오 프로필 조회 실패: ' + m,
  kakaoCancel: '카카오 로그인이 취소되었거나 팝업이 닫혔습니다.',
  appleLoading: '애플 인증 SDK 로딩 중입니다. 1초 후 다시 시도해 주세요.',
  appleOpening: 'Apple ID 공식 로그인 창을 여는 중...',
  appleOk: (n) => `🎉 [${n}] 님, Apple ID 공식 계정 로그인 성공!`,
  appleFail: '애플 로그인 처리에 실패했습니다.',
  appleCancel: (m) => '애플 로그인 취소 또는 오류: ' + m,
  metamaskMissing: 'MetaMask 확장 프로그램이 설치되어 있지 않습니다. 브라우저에 MetaMask를 설치해 주세요.',
  metamaskWaiting: '메타마스크 지갑 연결 승인 대기 중...',
  metamaskOk: (a) => `🎉 [${a}] 메타마스크 지갑 연결 로그인 성공!`,
  metamaskFail: '지갑 인증에 실패했습니다.',
  metamaskCancel: '메타마스크 연결이 취소되었거나 거부되었습니다.',
  instantRunning: (p) => `[${p}] 간편 소셜 계정 승인 및 로그인 진행 중...`,
  instantOk: (n, p) => `🎉 [${n}] 님, ${p} 로그인 완료!`,
  instantFail: '소셜 인증에 실패했습니다.',
  instantDone: (p) => `🎉 ${p} 인증 완료! 메인으로 이동합니다.`,
  emailRequired: '이메일(아이디)과 비밀번호를 모두 입력해 주세요.',
  emailVerifying: '로그인 승인 및 보안 세션 검증 중...',
  emailOk: (n) => `🎉 [${n}] 님, 환영합니다!`,
  emailFail: '이메일(아이디) 또는 비밀번호가 일치하지 않습니다.',
  serverError: (m) => '서버 통신 오류: ' + m,
  networkHint: '네트워크 연결을 확인해 주세요.'
}

const en: LoginMsgs = {
  tagline: 'Get real-time market data and analysis tools, faster.',
  backHome: 'Back to home',
  heading: 'Log in',
  google: 'Continue with Google',
  metamask: 'Connect MetaMask wallet',
  noAccount: "Don't have an account?",
  signup: 'Sign up free',
  termsBefore: 'By logging in, you agree to our ',
  termsLink: 'Privacy Policy',
  termsAfter: ' and Terms of Service.',
  naverChecking: 'Verifying your Naver profile…',
  naverOk: (n) => `🎉 Welcome, ${n}! Logged in with your Naver account.`,
  naverFail: 'Naver login failed.',
  naverError: 'Error while processing the Naver sign-in.',
  naverOpening: 'Opening the Naver sign-in window…',
  googleNoClientId: 'The Google Client ID is not configured. Please check .env.local.',
  googleLoading: 'The Google sign-in module is still loading. Please try again in a second or two.',
  googleOpening: 'Opening the Google sign-in window…',
  googleProfile: 'Verifying your Google profile…',
  googleOk: (n) => `🎉 Welcome, ${n}! Logged in with your Google account.`,
  googleFail: 'Google login failed.',
  googleProfileErr: (m) => 'Could not read your Google profile: ' + m,
  googleCancel: 'Google login was cancelled or the popup was closed.',
  googlePopupFail: (m) => 'Could not open the Google popup: ' + m,
  kakaoOpening: 'Opening the Kakao sign-in window…',
  kakaoOk: (n) => `🎉 Welcome, ${n}! Logged in with your Kakao account.`,
  kakaoFail: 'Kakao login failed.',
  kakaoProfileFail: (m) => 'Could not read your Kakao profile: ' + m,
  kakaoCancel: 'Kakao login was cancelled or the popup was closed.',
  appleLoading: 'The Apple sign-in SDK is still loading. Please try again in a second.',
  appleOpening: 'Opening the Apple ID sign-in window…',
  appleOk: (n) => `🎉 Welcome, ${n}! Logged in with your Apple ID.`,
  appleFail: 'Apple login failed.',
  appleCancel: (m) => 'Apple login was cancelled or failed: ' + m,
  metamaskMissing: 'The MetaMask extension is not installed. Please install MetaMask in your browser.',
  metamaskWaiting: 'Waiting for you to approve the MetaMask wallet connection…',
  metamaskOk: (a) => `🎉 Logged in with MetaMask wallet ${a}.`,
  metamaskFail: 'Wallet authentication failed.',
  metamaskCancel: 'The MetaMask connection was cancelled or rejected.',
  instantRunning: (p) => `Signing in with your ${p} account…`,
  instantOk: (n, p) => `🎉 Welcome, ${n}! ${p} login complete.`,
  instantFail: 'Social authentication failed.',
  instantDone: (p) => `🎉 ${p} authentication complete! Taking you to the main page.`,
  emailRequired: 'Please enter both your email (ID) and password.',
  emailVerifying: 'Verifying your login and secure session…',
  emailOk: (n) => `🎉 Welcome, ${n}!`,
  emailFail: 'Your email (ID) or password is incorrect.',
  serverError: (m) => 'Server communication error: ' + m,
  networkHint: 'Please check your network connection.'
}

const cn: LoginMsgs = {
  tagline: '更快获取实时市场数据与分析工具。',
  backHome: '返回首页',
  heading: '登录',
  google: '使用 Google 继续',
  metamask: '连接 MetaMask 钱包',
  noAccount: '还没有账号？',
  signup: '免费注册',
  termsBefore: '登录即表示您同意我们的',
  termsLink: '隐私政策',
  termsAfter: '及服务条款。',
  naverChecking: '正在确认 Naver 官方资料…',
  naverOk: (n) => `🎉 ${n}，已通过 Naver 官方账号登录成功！`,
  naverFail: 'Naver 登录失败。',
  naverError: 'Naver 登录处理出错。',
  naverOpening: '正在打开 Naver 官方登录窗口…',
  googleNoClientId: '未配置 Google Client ID，请检查 .env.local。',
  googleLoading: 'Google 登录模块正在加载，请 1~2 秒后重试。',
  googleOpening: '正在打开 Google 官方登录窗口…',
  googleProfile: '正在确认 Google 官方资料…',
  googleOk: (n) => `🎉 ${n}，已通过 Google 官方账号登录成功！`,
  googleFail: 'Google 登录处理失败。',
  googleProfileErr: (m) => '读取 Google 资料出错：' + m,
  googleCancel: 'Google 登录已取消或弹窗已关闭。',
  googlePopupFail: (m) => '无法打开 Google 弹窗：' + m,
  kakaoOpening: '正在打开 Kakao 官方登录窗口…',
  kakaoOk: (n) => `🎉 ${n}，已通过 Kakao 官方账号登录成功！`,
  kakaoFail: 'Kakao 登录处理失败。',
  kakaoProfileFail: (m) => '读取 Kakao 资料失败：' + m,
  kakaoCancel: 'Kakao 登录已取消或弹窗已关闭。',
  appleLoading: 'Apple 登录 SDK 正在加载，请 1 秒后重试。',
  appleOpening: '正在打开 Apple ID 官方登录窗口…',
  appleOk: (n) => `🎉 ${n}，已通过 Apple ID 登录成功！`,
  appleFail: 'Apple 登录处理失败。',
  appleCancel: (m) => 'Apple 登录已取消或出错：' + m,
  metamaskMissing: '未安装 MetaMask 扩展程序，请在浏览器中安装 MetaMask。',
  metamaskWaiting: '正在等待您批准 MetaMask 钱包连接…',
  metamaskOk: (a) => `🎉 已通过 MetaMask 钱包 ${a} 登录成功！`,
  metamaskFail: '钱包验证失败。',
  metamaskCancel: 'MetaMask 连接已取消或被拒绝。',
  instantRunning: (p) => `正在使用 ${p} 账号登录…`,
  instantOk: (n, p) => `🎉 ${n}，${p} 登录完成！`,
  instantFail: '社交账号验证失败。',
  instantDone: (p) => `🎉 ${p} 验证完成！正在跳转到首页。`,
  emailRequired: '请输入邮箱（账号）和密码。',
  emailVerifying: '正在验证登录与安全会话…',
  emailOk: (n) => `🎉 ${n}，欢迎！`,
  emailFail: '邮箱（账号）或密码不正确。',
  serverError: (m) => '服务器通信错误：' + m,
  networkHint: '请检查网络连接。'
}

export const LOGIN_MSGS: Record<SiteLang, LoginMsgs> = { ko, en, cn }
