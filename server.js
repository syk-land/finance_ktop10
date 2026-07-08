import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dns from 'dns';
import fs from 'fs';
import path from 'path';

// Force Node.js to resolve DNS using IPv4 first to bypass Windows IPv6 fetch failures
dns.setDefaultResultOrder('ipv4first');

// Bypass self-signed/restricted corporate SSL handshake blocks for external APIs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

const CACHE_FILE = path.join(process.cwd(), 'analysis_cache.json');
const NOTIF_FILE = path.join(process.cwd(), 'notifications_cache.json');

// Supported Gemini Models (Fallback order to handle RPM/RPD limits)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

// DART Mock source data for 10 companies
const COMPANY_DART_MOCK = {
  samsung: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: '삼성전자', content: '매출액 78.5조원, 영업이익 10.2조원 기록. AI 반도체 HBM 사업부 매출이 전년 동기 대비 140% 성장하며 실적 호조 견인. 파운드리 부문 수율 개선으로 적자 폭 대폭 축소.' },
    { date: '2026-04-20', title: '특허 취득 (반도체 패키징 기술)', reporter: '삼성전자', content: '3D 실리콘 관통전극(TSV)을 활용한 초고대역폭 메모리 적층 특허 취득. 차세대 AI 가속기 시장의 독점적 기술 우위 확보를 목적으로 함.' },
    { date: '2026-03-12', title: '주주총회결과', reporter: '삼성전자', content: '사내이사 선임의 건 및 배당금 총액 9.8조원 배당 안건 원안대로 가결. 온디바이스 AI 및 스마트가전 연계 생태계 확장 계획 발표.' }
  ],
  skhynix: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: 'SK하이닉스', content: '매출액 15.2조원, 영업이익 3.2조원 달성. 고성능 HBM3E 및 서버용 DDR5 판매 호조로 어닝 서프라이즈 기록. 순이익 2.1조원으로 흑자 턴어라운드 안착.' },
    { date: '2026-04-10', title: '단일판매ㆍ공급계약체결 (AI 가속기용 메모리)', reporter: 'SK하이닉스', content: '글로벌 주요 테크사향 차세대 AI 가속기용 HBM 대규모 장기 공급 계약 체결. 계약 금액은 경영상 비밀로 유보하였으나 직전 매출액의 15% 이상으로 추정.' },
    { date: '2026-03-25', title: '주주총회결과', reporter: 'SK하이닉스', content: '재무제표 승인 및 신임 사외이사 선임 완료. 초고다층 3D NAND 개발 및 첨단 패키징 설비 확충을 위한 투자 재원 확보 승인.' }
  ],
  hyundai: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: '현대자동차', content: '매출액 42.1조원, 영업이익 3.9조원 기록. 북미 및 유럽향 하이브리드(HEV) 차량 판매 급증 및 고부가가치 제네시스 차종 비중 확대로 이익률 방어 성공.' },
    { date: '2026-04-05', title: '신규시설투자계획 (친환경 라인 증설)', reporter: '현대자동차', content: '미국 조지아 메타플랜트 내에 하이브리드 전용 생산 라인 증설 결정. 총 투자 금액 8,500억 원 규모로 친환경차 수요 다변화 대응 목적.' }
  ],
  samsungbiologics: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: '삼성바이오로직스', content: '매출액 9,800억원, 영업이익 3,100억원 기록. 4공장 가동률 상승 및 글로벌 제약사 수주 물량 확대. 부채비율 60% 이하로 재무안전성 유지.' },
    { date: '2026-04-18', title: '단일판매ㆍ공급계약체결 (의약품 위탁생산)', reporter: '삼성바이오로직스', content: '미국 소재 글로벌 제약사와 3,400억 원 규모의 바이오 의약품 위탁생산(CMO) 계약 체결. 5공장 조기 가동 로드맵에 따른 추가 캐파 확보 완료.' }
  ],
  kia: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: '기아', content: '매출액 26.2조원, 영업이익 2.8조원 달성. 미국 레저용 차량(RV) 중심 판매 믹스 개선 및 친환경차 인센티브 하락으로 분기 사상 최대 이익률 달성.' }
  ],
  celltrion: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: '셀트리온', content: '매출액 6,200억원, 영업이익 1,500억원 기록. 자가면역질환 치료제 램시마SC의 미국 짐펜트라 신규 런칭 매출 본격화. 마진율 24% 수준 회복.' }
  ],
  kbfg: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: 'KB금융', content: '당기순이익 1.2조원 기록. 비이자이익 수수료 부문 회복 및 선제적 대손충당금 적립 완료. 보통주자본(CET1) 비율 13.5%로 주주환원 확대 가능.' }
  ],
  posco: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: 'POSCO홀딩스', content: '매출액 18.9조원, 영업이익 8,900억원 기록. 철강 시황 회복 지연에 따라 실적이 다소 횡보하였으나 리튬 등 이차전지 소재 공장 순차 가동 개시.' }
  ],
  naver: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: 'NAVER', content: '매출액 2.5조원, 영업이익 4,200억원 기록. 서치플랫폼 검색 광고 매출 회복 및 AI 기반 맞춤형 타겟 광고 고도화 성공. 네이버웹툰 글로벌 유료 가입자 성장세 유지.' }
  ],
  lgchem: [
    { date: '2026-05-15', title: '분기보고서 (2026.03)', reporter: 'LG화학', content: '매출액 12.8조원, 영업이익 4,500억원 기록. 석유화학 범용 스프레드 악화에도 불구하고 첨단소재 양극재 물량 본격 양산으로 실적 방어 성공.' }
  ]
};

// K-TOP 10 Stock ticker mapping
const TICKER_MAP = {
  samsung: '005930',
  skhynix: '000660',
  hyundai: '005380',
  samsungbiologics: '207940',
  kia: '000270',
  celltrion: '068270',
  kbfg: '105560',
  posco: '005490',
  naver: '035420',
  lgchem: '051910'
};

const COMPANY_NAME_MAP = {
  samsung: '삼성전자',
  skhynix: 'SK하이닉스',
  hyundai: '현대자동차',
  samsungbiologics: '삼성바이오로직스',
  kia: '기아',
  celltrion: '셀트리온',
  kbfg: 'KB금융',
  posco: 'POSCO홀딩스',
  naver: 'NAVER',
  lgchem: 'LG화학'
};

// Outstanding shares for real-time market cap calculation
const OUTSTANDING_SHARES = {
  samsung: 5969782550,
  skhynix: 728002365,
  hyundai: 208826569,
  samsungbiologics: 71174000,
  kia: 397875103,
  celltrion: 219908981,
  kbfg: 402683674,
  posco: 84571230,
  naver: 160937215,
  lgchem: 70592343
};

const COMPANY_FINANCIALS = {
  samsung: [
    { year: 2021, revenue: 279.6, operatingProfit: 51.6, roe: 13.9, debtRatio: 37.1 },
    { year: 2022, revenue: 302.2, operatingProfit: 43.3, roe: 17.0, debtRatio: 26.4 },
    { year: 2023, revenue: 258.9, operatingProfit: 6.5, roe: 4.1, debtRatio: 24.5 }
  ],
  skhynix: [
    { year: 2021, revenue: 42.9, operatingProfit: 12.4, roe: 16.8, debtRatio: 51.2 },
    { year: 2022, revenue: 44.6, operatingProfit: 6.8, roe: 3.5, debtRatio: 64.1 },
    { year: 2023, revenue: 32.7, operatingProfit: -7.7, roe: -15.6, debtRatio: 85.3 }
  ],
  hyundai: [
    { year: 2021, revenue: 117.6, operatingProfit: 6.6, roe: 6.8, debtRatio: 181.4 },
    { year: 2022, revenue: 142.5, operatingProfit: 9.8, roe: 9.3, debtRatio: 178.2 },
    { year: 2023, revenue: 162.6, operatingProfit: 15.1, roe: 13.1, debtRatio: 165.7 }
  ],
  samsungbiologics: [
    { year: 2021, revenue: 1.5, operatingProfit: 0.5, roe: 8.2, debtRatio: 59.7 },
    { year: 2022, revenue: 3.0, operatingProfit: 0.9, roe: 11.4, debtRatio: 84.6 },
    { year: 2023, revenue: 3.6, operatingProfit: 1.1, roe: 10.3, debtRatio: 78.4 }
  ],
  kia: [
    { year: 2021, revenue: 69.8, operatingProfit: 5.0, roe: 14.5, debtRatio: 102.4 },
    { year: 2022, revenue: 86.5, operatingProfit: 7.2, roe: 17.6, debtRatio: 90.8 },
    { year: 2023, revenue: 99.8, operatingProfit: 11.6, roe: 20.8, debtRatio: 81.3 }
  ],
  celltrion: [
    { year: 2021, revenue: 1.9, operatingProfit: 0.7, roe: 16.2, debtRatio: 37.8 },
    { year: 2022, revenue: 2.2, operatingProfit: 0.6, roe: 11.5, debtRatio: 34.6 },
    { year: 2023, revenue: 2.1, operatingProfit: 0.6, roe: 9.8, debtRatio: 31.4 }
  ],
  kbfg: [
    { year: 2021, revenue: 58.4, operatingProfit: 6.1, roe: 9.8, debtRatio: 28.6 },
    { year: 2022, revenue: 68.2, operatingProfit: 6.4, roe: 9.3, debtRatio: 30.1 },
    { year: 2023, revenue: 75.3, operatingProfit: 6.7, roe: 9.1, debtRatio: 29.4 }
  ],
  posco: [
    { year: 2021, revenue: 76.3, operatingProfit: 9.2, roe: 15.2, debtRatio: 66.8 },
    { year: 2022, revenue: 84.7, operatingProfit: 4.8, roe: 6.4, debtRatio: 72.4 },
    { year: 2023, revenue: 77.1, operatingProfit: 3.5, roe: 3.8, debtRatio: 74.2 }
  ],
  naver: [
    { year: 2021, revenue: 6.8, operatingProfit: 1.3, roe: 15.8, debtRatio: 44.5 },
    { year: 2022, revenue: 8.2, operatingProfit: 1.3, roe: 5.6, debtRatio: 52.1 },
    { year: 2023, revenue: 9.6, operatingProfit: 1.4, roe: 5.1, debtRatio: 48.7 }
  ],
  lgchem: [
    { year: 2021, revenue: 42.6, operatingProfit: 5.0, roe: 18.2, debtRatio: 120.3 },
    { year: 2022, revenue: 51.8, operatingProfit: 2.9, roe: 6.8, debtRatio: 125.4 },
    { year: 2023, revenue: 55.2, operatingProfit: 2.5, roe: 4.2, debtRatio: 130.2 }
  ]
};

// JSON cache helper
const readJsonFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[FileIO] Read error for ${filePath}:`, err.message);
  }
  return {};
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[FileIO] Write error for ${filePath}:`, err.message);
  }
};

const readCache = () => readJsonFile(CACHE_FILE);
const writeCache = (data) => writeJsonFile(CACHE_FILE, data);

const readNotifCache = () => {
  const data = readJsonFile(NOTIF_FILE);
  if (!data.notifications) data.notifications = [];
  if (!data.priceTracker) data.priceTracker = {};
  return data;
};
const writeNotifCache = (data) => writeJsonFile(NOTIF_FILE, data);

const getRelativeTime = (date) => {
  const diffMs = new Date() - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins || 1}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
};

// Fallback generators
const generateMockStockHistory = (companyId) => {
  const data = [];
  const today = new Date();
  let price = 100000;
  if (companyId === 'samsung') price = 72000;
  else if (companyId === 'skhynix') price = 180000;
  else if (companyId === 'hyundai') price = 240000;
  else if (companyId === 'samsungbiologics') price = 800000;
  else if (companyId === 'kia') price = 110000;
  else if (companyId === 'celltrion') price = 190000;
  else if (companyId === 'kbfg') price = 75000;
  else if (companyId === 'posco') price = 350000;
  else if (companyId === 'naver') price = 175000;
  else if (companyId === 'lgchem') price = 400000;

  for (let i = 52; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i * 7);
    price += price * (0.001 + (Math.random() - 0.5) * 0.04);
    data.push({ date: date.toISOString().split('T')[0], close: Math.round(price) });
  }
  return data;
};

const generateMockNews = (companyName) => {
  return [
    { title: `${companyName}, 신제품 공급망 안정화 확보`, source: '연합뉴스', time: '1시간 전' },
    { title: `${companyName}, 실적 개선세에 따른 기관 매수세 유입`, source: '경제데일리', time: '4시간 전' },
    { title: `${companyName}, 원자재 가격 변동성 우려 증가`, source: '금융신문', time: '1일 전' },
    { title: `${companyName}, 내수 활성화에 따른 실적 턴어라운드`, source: '한국경제', time: '2일 전' }
  ];
};

const getMockFinanceAnalysis = (companyName) => {
  return {
    brief: `[오프라인 데모 모드] ${companyName}의 3개년 재무 구조 진단 총평입니다. 매출 안정성과 현금창출능력이 우수한 상태이나 외부 금리 리스크에 노출되어 있습니다.`,
    stability: 85,
    profitability: 80,
    growth: 82
  };
};

const getMockCausationAnalysis = (companyName, stockSummary, newsData) => {
  const mockNewsAnalysis = newsData.map((item, i) => ({
    title: item.title,
    sentiment: i % 2 === 0 ? 'positive' : 'negative',
    summary: `이 기사는 ${companyName}의 주요 사업 동향과 관련이 깊습니다.\n실제 Gemini 모델 연동 시 여기에 기사의 상세 3줄 요약이 자동으로 생성됩니다.`
  }));
  return {
    summary: `${companyName}은 최근 1년간 핵심 사업 부문의 실적 변화와 거시 경제 변수에 연동되어 ${stockSummary} 흐름을 보였습니다.`,
    reasoning: `[오프라인 데모 모드] ${companyName}의 지난 1년 주가 흐름을 분석한 결과, 주가 등락은 재무 실적의 개선 유무 및 거시적 수급 요인과 강하게 결합되어 있습니다.`,
    keyTriggers: ["분기별 영업이익 가이드라인 달성 여부"],
    valuationOpinion: "주요 재무 안전성 점수와 연동했을 때 현재 주가는 적정 가치 구간 내에 있습니다.",
    newsAnalysis: mockNewsAnalysis
  };
};

// Core fetch helpers
async function fetchStockData(companyId, ticker) {
  try {
    const naverUrl = `https://fchart.stock.naver.com/sise.nhn?symbol=${ticker}&timeframe=week&count=52&requestType=0`;
    const response = await fetch(naverUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) throw new Error('Naver response error');
    const xmlText = await response.text();
    const itemRegex = /<item data="([^"]+)"/g;
    let match;
    const stockData = [];
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const dataStr = match[1];
      const [dateStr, open, high, low, close] = dataStr.split('|');
      if (dateStr && close) {
        stockData.push({
          date: `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`,
          close: parseInt(close, 10)
        });
      }
    }
    return { data: stockData, source: 'live' };
  } catch (err) {
    console.warn(`[NaverFinance] Fetch failed for ${companyId}, using mock:`, err.message);
    return { data: generateMockStockHistory(companyId), source: 'mock' };
  }
}

async function fetchNewsData(companyName) {
  try {
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(companyName + ' 주가')}&hl=ko&gl=KR&ceid=KR:ko`;
    const response = await fetch(googleNewsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) throw new Error('Google News response error');
    const xmlText = await response.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>([\s\S]*?)<\/title>/;
    const dateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
    const sourceRegex = /<source[^>]*>([\s\S]*?)<\/source>/;
    
    let match;
    const newsData = [];
    while ((match = itemRegex.exec(xmlText)) !== null && newsData.length < 4) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(titleRegex);
      const dateMatch = itemContent.match(dateRegex);
      const sourceMatch = itemContent.match(sourceRegex);

      if (titleMatch) {
        let rawTitle = titleMatch[1];
        let sourceName = sourceMatch ? sourceMatch[1] : '언론사';
        let title = rawTitle;
        if (rawTitle.includes(' - ')) {
          const parts = rawTitle.split(' - ');
          title = parts.slice(0, -1).join(' - ');
          sourceName = parts[parts.length - 1] || sourceName;
        }
        const relativeTime = getRelativeTime(dateMatch ? new Date(dateMatch[1]) : new Date());
        newsData.push({ title, source: sourceName, time: relativeTime });
      }
    }
    return { data: newsData, source: 'live' };
  } catch (err) {
    console.warn(`[GoogleNews] Fetch failed for ${companyName}, using mock:`, err.message);
    return { data: generateMockNews(companyName), source: 'mock' };
  }
}

// Generate DART summary via Gemini
async function generateDartSummary(geminiApiKey, title, content) {
  if (!geminiApiKey) {
    return `[데모 요약] ${title}에 관해 공시된 사항입니다.`;
  }
  const prompt = `
당신은 DART 기업 공시 분석가입니다. 주주들을 위해 다음 공시의 핵심 요약문 1문장(50자 내외)만 명확히 써주세요. 설명이나 인사말 없이 결과 문장만 리턴하세요.
- 공시 제목: ${title}
- 공시 내용: ${content}
  `;
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    return `[데모 요약] ${title}: 핵심 사업 및 재무 성과 연계 공시.`;
  }
}

// Generate real Gemini Stock causation analysis
async function generateGeminiAnalysis(geminiApiKey, companyName, financials, newsData, stockData) {
  const closes = stockData.map(d => d.close);
  const startPrice = closes[0];
  const endPrice = closes[closes.length - 1];
  const maxPrice = Math.max(...closes);
  const minPrice = Math.min(...closes);
  const priceChangePct = ((endPrice - startPrice) / startPrice) * 100;
  const stockSummary = `${priceChangePct >= 0 ? '상승' : '하락'}세 (${priceChangePct.toFixed(1)}% 변동, 최고가 ${maxPrice.toLocaleString()}원, 최저가 ${minPrice.toLocaleString()}원)`;

  if (!geminiApiKey) {
    return getMockCausationAnalysis(companyName, stockSummary, newsData);
  }

  const prompt = `
당신은 대한민국 금융 시장과 대기업을 깊이 있게 통찰하는 수석 투자전략가이자 AI 금융 분석가입니다.
제시된 기업의 [1년 주가 흐름], [3개년 재무 실적], [최근 실시간 기사 목록] 세 가지 차원의 데이터를 정밀하게 비교 분석하여, "이 기업의 주가가 지난 1년간 왜 이렇게 흘러왔는가?"에 대한 인과관계 보고서를 작성하고, 각 기사의 센티먼트 분류 및 요약을 완성해 주세요.

- 기업명: ${companyName}
- 1년 주가: 시작가 ${startPrice.toLocaleString()}원, 종료가 ${endPrice.toLocaleString()}원, 최고가 ${maxPrice.toLocaleString()}원, 최저가 ${minPrice.toLocaleString()}원 (변동률 ${priceChangePct.toFixed(2)}%)
- 3개년 재무 현황: ${JSON.stringify(financials)}
- 실시간 기사: ${JSON.stringify(newsData)}

---
[출력 JSON 스키마 규격 (markdown 블록 없이 순수 JSON만 반환할 것)]
{
  "summary": "1년 주가 흐름과 주요 원인을 정리한 명쾌한 한줄 요약",
  "reasoning": "재무 지표 및 뉴스 이슈와 연동하여 지난 1년간 주가가 등락한 원인을 논리적으로 규명한 본문 (600자 내외)",
  "keyTriggers": [
    "핵심 등락 트리거 1",
    "핵심 등락 트리거 2"
  ],
  "valuationOpinion": "재무안전성과 현재 성장성을 대조하여 도출한 현재 주가 밸류에이션에 대한 AI 최종 의견 (150자 내외)",
  "newsAnalysis": [
    {
      "title": "전달받은 기사의 원본 제목과 정확히 일치해야 함",
      "sentiment": "positive 또는 neutral 또는 negative 중 택1",
      "summary": "해당 기사가 내포한 팩트와 가치에 관한 AI 3줄 요약 문장 (각 줄 끝에 개행문자 \\n 추가하여 3줄로 구성)"
    }
  ]
}
  `;

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[GeminiAPI] [Causation] Querying ${modelName} for ${companyName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(result.response.text().trim());
      console.log(`[GeminiAPI] [Causation] Succeeded using model: ${modelName}`);
      return parsed;
    } catch (err) {
      console.warn(`[GeminiAPI] [Causation] Model ${modelName} failed for ${companyName}:`, err.message);
      lastError = err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error(`[GeminiAPI] All models exhausted for ${companyName} causation report.`);
  throw lastError;
}

// Generate static Gemini Finance analysis
async function generateGeminiFinanceAnalysis(geminiApiKey, companyName, financials) {
  if (!geminiApiKey) {
    return getMockFinanceAnalysis(companyName);
  }

  const prompt = `
당신은 기업 신용평가사와 글로벌 투자은행의 수석 재무 연구원입니다.
제시된 기업의 [3개년 주요 재무제표 현황]을 면밀하게 진단하여, 이 기업의 장기 성장 잠재력, 수익 마진의 회복 강도, 그리고 부채 수준 및 자본 적정성에 기초한 재무 안정성을 종합적으로 판단한 레포트를 작성해 주세요.

- 기업명: ${companyName}
- 3개년 재무 데이터: ${JSON.stringify(financials)}

---
[출력 JSON 스키마 규격 (markdown 블록 없이 순수 JSON만 반환할 것)]
{
  "brief": "3개년 재무 구조 및 실적 트렌드 진단 총평 본문 (개행문자 없이 문단 형태로 구성, 400자 내외)",
  "stability": 88,
  "profitability": 75,
  "growth": 90
}
  `;

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[GeminiAPI] [Finance] Querying ${modelName} for ${companyName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(result.response.text().trim());
      console.log(`[GeminiAPI] [Finance] Succeeded using model: ${modelName}`);
      return parsed;
    } catch (err) {
      console.warn(`[GeminiAPI] [Finance] Model ${modelName} failed for ${companyName}:`, err.message);
      lastError = err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error(`[GeminiAPI] All models exhausted for ${companyName} finance report.`);
  throw lastError;
}

// Background Async Updater
async function executeSingleCompanyUpdateInBackground(companyId, geminiApiKey) {
  const ticker = TICKER_MAP[companyId];
  const companyName = COMPANY_NAME_MAP[companyId];
  const financials = COMPANY_FINANCIALS[companyId];

  try {
    console.log(`[AsyncUpdater] Starting background pre-fetch pipeline for ${companyName}...`);
    const stockRes = await fetchStockData(companyId, ticker);
    const newsRes = await fetchNewsData(companyName);

    const latestPrice = stockRes.data[stockRes.data.length - 1]?.close || 100000;
    const latestNewsTitle = newsRes.data[0]?.title || '';

    // Generate summaries for DART mock articles
    const dartData = COMPANY_DART_MOCK[companyId] || [];
    const summarizedDart = await Promise.all(
      dartData.map(async (item) => ({
        ...item,
        aiSummary: await generateDartSummary(geminiApiKey, item.title, item.content)
      }))
    );

    const [aiReport, financeReport] = await Promise.all([
      generateGeminiAnalysis(geminiApiKey, companyName, financials, newsRes.data, stockRes.data),
      generateGeminiFinanceAnalysis(geminiApiKey, companyName, financials)
    ]);

    const cache = readCache();
    cache[companyId] = {
      lastUpdated: new Date().toISOString(),
      lastPrice: latestPrice,
      lastNewsTitle: latestNewsTitle,
      stockSource: stockRes.source,
      newsSource: newsRes.source,
      stockData: stockRes.data,
      newsData: newsRes.data,
      aiReport,
      financeReport,
      dartData: summarizedDart,
      isAiLive: !!geminiApiKey
    };
    writeCache(cache);

    // Track price fluctuations for 5% notifications
    trackPriceFluctuation(companyId, latestPrice);

    console.log(`[AsyncUpdater] Success! Cached updated for ${companyName}.`);
  } catch (err) {
    console.error(`[AsyncUpdater] Background pipeline failed for ${companyName}:`, err.message);
  }
}

// Send KakaoTalk "Talk memo send (나에게 보내기)" default template notification
async function sendKakaoTalkNotification(message) {
  const token = process.env.KAKAO_ACCESS_TOKEN;
  if (!token) {
    console.warn('[KakaoTalk] No access token set in env. Skipping message dispatch.');
    return;
  }

  const templateObject = {
    object_type: 'text',
    text: message,
    link: {
      web_url: 'http://localhost:5173',
      mobile_web_url: 'http://localhost:5173'
    },
    button_title: '대시보드 보기'
  };

  try {
    const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(templateObject)
      })
    });

    const result = await response.json();
    if (result.result_code === 0) {
      console.log('[KakaoTalk] Message dispatched successfully to syk-land.');
    } else {
      console.warn('[KakaoTalk] Dispatched failed. Response:', result);
    }
  } catch (err) {
    console.error('[KakaoTalk] Network API fetch error:', err.message);
  }
}

// Track price fluctuation and trigger 5% alerts
function trackPriceFluctuation(companyId, currentPrice) {
  const notifCache = readNotifCache();
  const companyName = COMPANY_NAME_MAP[companyId];

  if (!notifCache.priceTracker[companyId]) {
    notifCache.priceTracker[companyId] = {
      dayOpenPrice: currentPrice,
      lastNotifiedPrice: currentPrice,
      notifiedBands: []
    };
    writeNotifCache(notifCache);
    return;
  }

  const tracker = notifCache.priceTracker[companyId];
  const openPrice = tracker.dayOpenPrice || currentPrice;
  const lastPrice = tracker.lastNotifiedPrice || openPrice;

  const pctFromOpen = ((currentPrice - openPrice) / openPrice) * 100;
  const pctFromLast = ((currentPrice - lastPrice) / lastPrice) * 100;

  let triggerAlert = false;
  let alertMessage = '';

  // 1. Initial 5% change from open
  if (Math.abs(pctFromOpen) >= 5 && !tracker.notifiedBands.includes('open_5')) {
    triggerAlert = true;
    tracker.notifiedBands.push('open_5');
    alertMessage = `⚠️ [${companyName}] 주가 급등락! 시작가(${openPrice.toLocaleString()}원) 대비 ${pctFromOpen.toFixed(1)}% 변동 (현재가: ${currentPrice.toLocaleString()}원)`;
  } 
  // 2. Subsequent 5% changes from last notified price
  else if (Math.abs(pctFromLast) >= 5) {
    triggerAlert = true;
    alertMessage = `⚠️ [${companyName}] 주가 추가 변동! 직전 알림가(${lastPrice.toLocaleString()}원) 대비 ${pctFromLast.toFixed(1)}% 변동 (현재가: ${currentPrice.toLocaleString()}원)`;
  }

  if (triggerAlert) {
    tracker.lastNotifiedPrice = currentPrice;
    const notification = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
      companyId,
      companyName,
      type: 'price_fluctuation',
      message: alertMessage,
      timestamp: new Date().toISOString()
    };
    notifCache.notifications.unshift(notification);
    // Keep max 30 recent alerts
    if (notifCache.notifications.length > 30) {
      notifCache.notifications.pop();
    }
    console.log(`[NotificationTriggered] ${alertMessage}`);

    // Trigger KakaoTalk notification message
    sendKakaoTalkNotification(alertMessage).catch(err => {
      console.error('[KakaoTalk] Async error in scheduler loop:', err.message);
    });
  }

  notifCache.priceTracker[companyId] = tracker;
  writeNotifCache(notifCache);
}

// Combined dynamic synchronization logic (Pre-fetch & 1-minute interval update)
async function executeSynchronizationCycle(forcedApiKey = null, isInitialRun = false) {
  console.log(`[CacheScheduler] Executing synchronization cycle (Forced Initial Build: ${isInitialRun})...`);
  const cache = readCache();
  const geminiApiKey = forcedApiKey || process.env.GEMINI_API_KEY;

  for (const companyId of Object.keys(TICKER_MAP)) {
    try {
      const companyName = COMPANY_NAME_MAP[companyId];
      const financials = COMPANY_FINANCIALS[companyId];

      const stockRes = await fetchStockData(companyId, TICKER_MAP[companyId]);
      const newsRes = await fetchNewsData(companyName);

      const latestPrice = stockRes.data[stockRes.data.length - 1]?.close || 100000;
      const latestNewsTitle = newsRes.data[0]?.title || '';

      const cached = cache[companyId];
      let needsReanalysis = true;

      if (!isInitialRun && cached && cached.aiReport && cached.financeReport) {
        const priceChangePct = Math.abs((latestPrice - cached.lastPrice) / cached.lastPrice) * 100;
        const isNewsSame = latestNewsTitle === cached.lastNewsTitle;

        if (priceChangePct < 5 && isNewsSame) {
          needsReanalysis = false;
        }
      }

      if (needsReanalysis) {
        console.log(`[CacheScheduler] [REBUILD REQUIRED] Generating AI reports for ${companyName}...`);
        
        const dartData = COMPANY_DART_MOCK[companyId] || [];
        const summarizedDart = await Promise.all(
          dartData.map(async (item) => ({
            ...item,
            aiSummary: await generateDartSummary(geminiApiKey, item.title, item.content)
          }))
        );

        const aiReport = await generateGeminiAnalysis(
          geminiApiKey,
          companyName,
          financials,
          newsRes.data,
          stockRes.data
        );

        const financeReport = await generateGeminiFinanceAnalysis(
          geminiApiKey,
          companyName,
          financials
        );

        cache[companyId] = {
          lastUpdated: new Date().toISOString(),
          lastPrice: latestPrice,
          lastNewsTitle: latestNewsTitle,
          stockSource: stockRes.source,
          newsSource: newsRes.source,
          stockData: stockRes.data,
          newsData: newsRes.data,
          aiReport,
          financeReport,
          dartData: summarizedDart,
          isAiLive: !!geminiApiKey
        };
        writeCache(cache);
        console.log(`[CacheScheduler] Cache database entry updated & saved for ${companyName}.`);

        if (geminiApiKey) {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      } else {
        console.log(`[CacheScheduler] Cache hit! ${companyName} data is already up-to-date. Skipping AI regeneration.`);
        cache[companyId].stockSource = stockRes.source;
        cache[companyId].newsSource = newsRes.source;
        cache[companyId].stockData = stockRes.data;
        cache[companyId].newsData = newsRes.data;
        writeCache(cache);
      }

      // Track price fluctuations
      trackPriceFluctuation(companyId, latestPrice);

    } catch (err) {
      console.error(`[CacheScheduler] Failed synchronization for ${companyId}:`, err.message);
    }
  }
  console.log('[CacheScheduler] Synchronization cycle completed.');
}

// 1. Unified GET Endpoint (0ms Stale Serve)
app.get('/api/stock/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const ticker = TICKER_MAP[companyId];
  const companyName = COMPANY_NAME_MAP[companyId];

  if (!ticker) {
    return res.status(400).json({ error: 'Invalid company ID' });
  }

  try {
    const cache = readCache();
    let cached = cache[companyId];

    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Calculate all real-time market caps from cache
    const allMarketCaps = {};
    for (const cid of Object.keys(TICKER_MAP)) {
      const entry = cache[cid];
      if (entry && entry.stockData && entry.stockData.length > 0) {
        const lastClose = entry.stockData[entry.stockData.length - 1]?.close || 100000;
        const shares = OUTSTANDING_SHARES[cid] || 100000000;
        allMarketCaps[cid] = (lastClose * shares / 1000000000000).toFixed(1) + '조 원';
      } else {
        allMarketCaps[cid] = '계산 대기';
      }
    }

    if (cached && cached.aiReport && cached.financeReport) {
      const latestClose = cached.stockData[cached.stockData.length - 1]?.close || 100000;
      const sharesCount = OUTSTANDING_SHARES[companyId] || 100000000;
      const calculatedMarketCap = latestClose * sharesCount;
      const marketCapTrillion = (calculatedMarketCap / 1000000000000).toFixed(1) + '조 원';

      return res.json({
        isAiLive: cached.isAiLive,
        source: cached.stockSource === 'live' && cached.newsSource === 'live' ? 'live' : 'mock',
        stockSource: cached.stockSource,
        newsSource: cached.newsSource,
        stockData: cached.stockData,
        newsData: cached.newsData,
        aiReport: cached.aiReport,
        financeReport: cached.financeReport,
        dartData: cached.dartData || [],
        lastUpdated: cached.lastUpdated,
        marketCap: marketCapTrillion,
        allMarketCaps
      });
    }

    console.log(`[API /stock] Cache missing for ${companyName}. Serving quick mock.`);
    const mockData = generateMockStockHistory(companyId);
    const mockNews = generateMockNews(companyName);
    const mockCausation = getMockCausationAnalysis(companyName, '보합세', mockNews);
    const mockFinance = getMockFinanceAnalysis(companyName);

    res.json({
      isAiLive: false,
      source: 'mock',
      stockSource: 'mock',
      newsSource: 'mock',
      stockData: mockData,
      newsData: mockNews,
      aiReport: mockCausation,
      financeReport: mockFinance,
      dartData: COMPANY_DART_MOCK[companyId] || [],
      lastUpdated: new Date().toISOString(),
      marketCap: '계산 불가',
      allMarketCaps
    });

    executeSingleCompanyUpdateInBackground(companyId, geminiApiKey).catch(err => {
      console.error(`[API /stock] Background pre-fetch failed for ${companyName}:`, err.message);
    });

  } catch (error) {
    console.error(`[API /stock] Critical endpoint failure for ${companyName || companyId}:`, error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Notifications Pull API Endpoint
app.get('/api/notifications', (req, res) => {
  try {
    const notifCache = readNotifCache();
    res.json(notifCache.notifications || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// 3. KakaoTalk Manual Test Notification API Endpoint
app.post('/api/test-kakao', async (req, res) => {
  try {
    const alertMessage = '🔔 [K-TOP 10] 카카오톡 실시간 주가 알림 연동 테스트가 성공적으로 완료되었습니다!';
    await sendKakaoTalkNotification(alertMessage);
    res.json({ success: true, message: 'Test message sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dispatch test KakaoTalk message' });
  }
});

// 4. Expose Kakao Token safely to client for browser direct send bypass
app.get('/api/kakao-token', (req, res) => {
  res.json({ token: process.env.KAKAO_ACCESS_TOKEN || '' });
});

// Daily AI Forecast Generator
async function generateDailyForecastReport(geminiApiKey) {
  const cache = readCache();
  const companiesList = [];

  for (const cid of Object.keys(TICKER_MAP)) {
    const entry = cache[cid];
    const name = COMPANY_NAME_MAP[cid];
    const lastClose = entry?.stockData?.[entry.stockData.length - 1]?.close || 100000;
    
    companiesList.push({
      id: cid,
      name,
      price: lastClose,
      financials: COMPANY_FINANCIALS[cid]
    });
  }

  const prompt = `
당신은 대한민국 대표 AI 계량투자 모델입니다.
제시된 10대 기업들의 현재가와 3개년 재무 정보를 종합 검토하여, 단기(향후 1주일) 주가 방향을 "상승(▲)" 또는 "하락(▼)" 또는 "보합(●)"으로 단정적으로 예측하고, 그 예측 이유를 각 기업당 1줄(30자 내외)로 명쾌하게 규명해 주세요.

- 분석 대상 기업 목록:
${JSON.stringify(companiesList, null, 2)}

---
[출력 템플릿 규격 (이 포맷 그대로 텍스트를 반환할 것, 불필요한 서론/결론 배제)]
📊 [K-TOP 10 데일리 AI 주가 전망]

1. 삼성전자: [현재가]원 ([예측 기호])
- [한줄 근거]

2. SK하이닉스: [현재가]원 ([예측 기호])
- [한줄 근거]
...
  `;

  let lastError = null;
  if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`[GeminiAPI] [DailyForecast] Generating report using ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        console.warn(`[GeminiAPI] [DailyForecast] Model ${modelName} failed:`, err.message);
        lastError = err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.log(`[DailyForecast] Using offline mock generator for daily report.`);
  let reportText = `📊 [K-TOP 10 데일리 AI 주가 전망 (오프라인 데모)]\n\n`;
  companiesList.forEach((c, idx) => {
    const symbols = ['▲ 상승 예상', '▼ 하락 예상', '● 보합 예상'];
    const selectedSymbol = symbols[idx % 3];
    const reasons = [
      '3개년 영업이익률 개선 흐름 지속 관측.',
      '글로벌 수요 둔화 우려 및 원자재 마진 압박.',
      '수급 균형 상태 및 분기 가이드라인 부합 예정.'
    ];
    reportText += `${idx + 1}. ${c.name}: ${c.price.toLocaleString()}원 (${selectedSymbol})\n- ${reasons[idx % 3]}\n\n`;
  });
  return reportText.trim();
}

// 5. Trigger Daily Forecast Manually via POST API
// Expose forecast text generator API for client bypass send
app.post('/api/generate-forecast-text', async (req, res) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    console.log('[DailyForecast] Generating text for client bypass send...');
    const reportText = await generateDailyForecastReport(geminiApiKey);
    res.json({ success: true, report: reportText });
  } catch (err) {
    console.error('[DailyForecast] Text generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate forecast text' });
  }
});

// Start server and initialize loops
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Finance AI Backend is running on http://127.0.0.1:${PORT}`);
  
  setTimeout(async () => {
    // Reset notification tracker on startup
    const notifCache = readNotifCache();
    notifCache.notifications = [];
    notifCache.priceTracker = {};
    writeNotifCache(notifCache);

    if (fs.existsSync(CACHE_FILE)) {
      try {
        fs.unlinkSync(CACHE_FILE);
        console.log('[Server] Cleared stale/corrupt analysis_cache.json for clean rebuild.');
      } catch (e) {
        console.warn('[Server] Failed to clear cached file:', e.message);
      }
    }

    await executeSynchronizationCycle(null, true);
    
    console.log('[CacheScheduler] Scheduling 1-minute interval cache updates.');
    setInterval(() => {
      executeSynchronizationCycle();
    }, 60000);

    // Schedule Daily AI Forecast auto-dispatch at 3:00 PM (15:00) every day
    console.log('[CacheScheduler] Daily AI Forecast scheduled for 3:00 PM KST.');
    let dailyReportSentToday = false;
    setInterval(async () => {
      try {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Reset sent flag at midnight
        if (hours === 0 && minutes === 0) {
          dailyReportSentToday = false;
        }

        // Trigger at 15:00 (오후 3시)
        if (hours === 15 && minutes === 0 && !dailyReportSentToday) {
          dailyReportSentToday = true;
          console.log('[DailyScheduler] 3:00 PM reached. Generating and sending daily AI forecast...');
          const geminiApiKey = process.env.GEMINI_API_KEY;
          const report = await generateDailyForecastReport(geminiApiKey);
          await sendKakaoTalkNotification(report);
        }
      } catch (err) {
        console.error('[DailyScheduler] Scheduled 3:00 PM dispatch failed:', err.message);
      }
    }, 60000); // Check every minute
  }, 3000);
});
