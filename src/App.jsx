import React, { useState, useEffect } from 'react';
import { companiesData } from './data/mockData';
import Header from './components/Header';
import CompanySidebar from './components/CompanySidebar';
import FinancialDashboard from './components/FinancialDashboard';
import AIAnalystReport from './components/AIAnalystReport';
import NewsSentiment from './components/NewsSentiment';
import DartViewer from './components/DartViewer';
import NotificationToast from './components/NotificationToast';
import './App.css';

const BACKEND_URL = 'http://localhost:5005';

function App() {
  const [selectedId, setSelectedId] = useState('samsung');
  const [stockData, setStockData] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  
  const [newsData, setNewsData] = useState([]); // Real-time news feed
  const [newsAnalysis, setNewsAnalysis] = useState([]); // Gemini-analyzed news
  
  const [aiReport, setAiReport] = useState(null); // Causation Report
  const [financeReport, setFinanceReport] = useState(null); // Financial Report
  const [lastUpdated, setLastUpdated] = useState('');
  const [marketCap, setMarketCap] = useState('');
  const [companies, setCompanies] = useState(companiesData);
  const [dartData, setDartData] = useState([]);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [isLive, setIsLive] = useState(false); // Stock/News connection status
  const [isAiLive, setIsAiLive] = useState(false); // Gemini API connection status

  const selectedCompany = companiesData.find((c) => c.id === selectedId) || companiesData[0];

  // Fetch complete pre-analyzed packet from backend GET endpoint
  useEffect(() => {
    let active = true;

    async function fetchCompanyData() {
      setStockLoading(true);
      setAiLoading(true);
      
      try {
        // Fetch unified stock + news + AI analysis packet from backend Cache Hub
        const stockRes = await fetch(`${BACKEND_URL}/api/stock/${selectedId}`);
        if (!stockRes.ok) throw new Error('Stock & Analysis packet fetch failed');
        const stockResult = await stockRes.json();
        
        if (!active) return;

        setStockData(stockResult.stockData);
        setNewsData(stockResult.newsData);
        setAiReport(stockResult.aiReport);
        setFinanceReport(stockResult.financeReport);
        setDartData(stockResult.dartData || []);
        setLastUpdated(stockResult.lastUpdated || '');
        setMarketCap(stockResult.marketCap || selectedCompany.marketCap);

        // Sync sidebar list market caps dynamically
        if (stockResult.allMarketCaps) {
          const updated = companiesData.map(c => ({
            ...c,
            marketCap: stockResult.allMarketCaps[c.id] || c.marketCap
          }));
          setCompanies(updated);
        }

        // Pipe Gemini analyzed articles to NewsSentiment component
        if (stockResult.aiReport && stockResult.aiReport.newsAnalysis && stockResult.aiReport.newsAnalysis.length > 0) {
          setNewsAnalysis(stockResult.aiReport.newsAnalysis);
        } else {
          // Fallback map
          const fallbackNews = stockResult.newsData.map((item, idx) => ({
            ...item,
            sentiment: idx % 2 === 0 ? 'positive' : 'neutral',
            summary: `${item.title} 관련 속보 기사입니다. AI 분석기의 평가 피드가 로딩 중입니다.`
          }));
          setNewsAnalysis(fallbackNews);
        }

        // Live connection indicator mappings
        const isSystemLive = stockResult.stockSource === 'live' && stockResult.newsSource === 'live';
        setIsLive(isSystemLive);
        setIsAiLive(stockResult.isAiLive); // Derived from backend's successful api authorization check

        setStockLoading(false);
        setAiLoading(false);
      } catch (err) {
        console.warn('[App] Connection failed, using offline fallback. Details:', err.message);
        
        if (!active) return;
        
        setIsLive(false);
        setIsAiLive(false);
        setLastUpdated(new Date().toISOString());
        setMarketCap(selectedCompany.marketCap);
        setDartData([]);

        const mockCloses = generateLocalMockStock(selectedId);
        setStockData(mockCloses);
        setStockLoading(false);

        const start = mockCloses[0].close;
        const end = mockCloses[mockCloses.length - 1].close;
        const max = Math.max(...mockCloses.map(d => d.close));
        const min = Math.min(...mockCloses.map(d => d.close));
        const diff = ((end - start) / start) * 100;
        
        setAiReport({
          summary: `${selectedCompany.name}은 1년간 ${diff >= 0 ? '상승' : '하락'} 국면(${diff.toFixed(1)}% 변동)을 통과했습니다.`,
          reasoning: `[오프라인 데모 모드] ${selectedCompany.name}의 주가 움직임은 영업이익 회복 기조와 뉴스 이슈에 동조화되었습니다. 3개년 재무 분석 결과에 따르면 매출 성장세와 부채비율 통제가 핵심적인 주가 지지 동력으로 기능했습니다.`,
          keyTriggers: [
            "사업 포트폴리오의 실적 마진 회복 속도",
            "글로벌 거시 리스크에 따른 업황 수요 둔화 여부"
          ],
          valuationOpinion: "재무제표의 우수한 안정성 지표에 비추어 볼 때 현 주가는 중장기적인 투자 메리트가 높은 가격 밴드에 안착해 있습니다."
        });

        setFinanceReport({
          brief: `${selectedCompany.name}의 3개년 실적과 자산 흐름을 재무 안전성, 수익 마진, 성장동력 지수 측면에서 다차원 심층 진단한 결과입니다. 전반적인 부채비율 통제와 현금 창출 능력이 우수하며 성장 흐름이 지지되고 있습니다.`,
          stability: 85,
          profitability: 80,
          growth: 78
        });

        const offlineNews = selectedCompany.news.map(item => ({
          title: item.title,
          source: item.source,
          time: item.time,
          sentiment: item.sentiment,
          summary: item.summary
        }));
        setNewsAnalysis(offlineNews);
        setAiLoading(false);
      }
    }

    fetchCompanyData();

    return () => {
      active = false;
    };
  }, [selectedId]);

  // Local stock generator helper for pure client-side fallback
  const generateLocalMockStock = (companyId) => {
    const data = [];
    let price = 70000;
    if (companyId === 'skhynix') price = 170000;
    else if (companyId === 'hyundai') price = 240000;
    else if (companyId === 'samsungbiologics') price = 800000;
    
    for (let i = 52; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      price += price * ((Math.random() - 0.48) * 0.035);
      data.push({
        date: date.toISOString().split('T')[0],
        close: Math.round(price)
      });
    }
    return data;
  };

  return (
    <div className="app-container">
      <NotificationToast />
      <Header isLive={isLive} isAiLive={isAiLive} />
      <div className="app-layout">
        <CompanySidebar
          companies={companies}
          selectedCompanyId={selectedId}
          onSelectCompany={setSelectedId}
        />
        <main className="dashboard-content">
          <div className="grid-double-row">
            <FinancialDashboard
              company={selectedCompany}
              stockData={stockData}
              stockLoading={stockLoading}
              isLive={isLive}
              marketCap={marketCap}
            />
            <AIAnalystReport
              company={selectedCompany}
              aiReport={aiReport}
              financeReport={financeReport}
              aiLoading={aiLoading}
              isLive={isLive && isAiLive}
              lastUpdated={lastUpdated}
            />
          </div>
          <NewsSentiment
            news={newsAnalysis.length > 0 ? newsAnalysis : selectedCompany.news}
            isLive={isLive}
          />
          <DartViewer
            companyName={selectedCompany.name}
            dartData={dartData}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
