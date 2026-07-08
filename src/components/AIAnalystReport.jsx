import React, { useState } from 'react';

export default function AIAnalystReport({ company, aiReport, financeReport, aiLoading, isLive, lastUpdated }) {
  const formatAnalysisTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const yy = String(date.getFullYear()).substring(2);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${yy}${mm}${dd} ${hh}:${min}`;
    } catch (err) {
      return '';
    }
  };

  const { aiAnalysis } = company;
  const [reportTab, setReportTab] = useState('finance'); // 'finance' or 'causation'

  const getBriefText = () => {
    if (reportTab === 'finance') {
      return financeReport ? financeReport.brief : aiAnalysis.brief;
    }
    return aiReport ? aiReport.reasoning : '';
  };

  const briefText = getBriefText();

  const getMetricColorClass = (val) => {
    if (val >= 90) return 'metric-high';
    if (val >= 80) return 'metric-mid';
    return 'metric-low';
  };

  // Stability, profitability, growth values dynamically injected from cache
  const stabilityScore = financeReport ? financeReport.stability : aiAnalysis.metrics.stability;
  const profitabilityScore = financeReport ? financeReport.profitability : aiAnalysis.metrics.profitability;
  const growthScore = financeReport ? financeReport.growth : aiAnalysis.metrics.growthPotential;

  return (
    <div className="ai-analyst-report glass-panel">
      <div className="report-header">
        <div className="header-title-row">
          <span className="sparkle-icon">✨</span>
          <h3>AI Analyst 종합 브리핑</h3>
        </div>
        <div className="ai-badge-row">
          <div className="rating-badge">
            <span className="badge-label">AI GRADE</span>
            <span className="badge-value">{aiAnalysis.rating}</span>
          </div>
        </div>
      </div>

      {/* Evaluation Tab Switch */}
      <div className="report-type-switch">
        <button
          className={`switch-btn ${reportTab === 'finance' ? 'active' : ''}`}
          onClick={() => setReportTab('finance')}
        >
          기본 재무 분석
        </button>
        <button
          className={`switch-btn ${reportTab === 'causation' ? 'active' : ''}`}
          onClick={() => setReportTab('causation')}
        >
          주가 변동 인과 분석 (Gemini)
        </button>
      </div>

      {reportTab === 'finance' ? (
        <>
          {aiLoading && !financeReport ? (
            <div className="causation-loader">
              <span className="loader-ring"></span>
              <span>Gemini AI 모델이 3개년 주요 실적 데이터 분석을 동적으로 취득 중입니다...</span>
            </div>
          ) : (
            <>
              {/* Finance Metrics */}
              <div className="metrics-grid">
                <div className="metric-bar-item">
                  <div className="metric-info">
                    <span className="metric-name">재무 안정성 (Stability)</span>
                    <span className="metric-score">{stabilityScore}점</span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className={`progress-fill ${getMetricColorClass(stabilityScore)}`}
                      style={{ width: `${stabilityScore}%` }}
                    ></div>
                  </div>
                </div>

                <div className="metric-bar-item">
                  <div className="metric-info">
                    <span className="metric-name">수익성 (Profitability)</span>
                    <span className="metric-score">{profitabilityScore}점</span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className={`progress-fill ${getMetricColorClass(profitabilityScore)}`}
                      style={{ width: `${profitabilityScore}%` }}
                    ></div>
                  </div>
                </div>

                <div className="metric-bar-item">
                  <div className="metric-info">
                    <span className="metric-name">성장 잠재력 (Growth)</span>
                    <span className="metric-score">{growthScore}점</span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className={`progress-fill ${getMetricColorClass(growthScore)}`}
                      style={{ width: `${growthScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* AI Briefing Text Box */}
              <div className="ai-brief-box">
                {/* Warning tag if not live */}
                {!isLive && (
                  <div className="causation-warning-tag">
                    ⚠️ Gemini 모델 연동 불가 (로컬 오프라인 데이터 출력)
                  </div>
                )}
                
                <div className="brief-title">
                  <span>Financial Insight Report</span>
                  {lastUpdated && (
                    <span style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '10.5px', 
                      color: '#93C5FD', 
                      fontFamily: 'monospace' 
                    }}>
                      ⏱ {formatAnalysisTime(lastUpdated)}
                    </span>
                  )}
                  <span className="typing-status">분석 완료</span>
                </div>
                <div className="brief-content text-scrollable">
                  <p>{briefText}</p>
                </div>

                <div className="evaluation-tags">
                  <div className="eval-tag">
                    <span className="tag-label">성장성</span>
                    <span className="tag-val status-positive">{aiAnalysis.growth}</span>
                  </div>
                  <div className="eval-tag">
                    <span className="tag-label">재무건전도</span>
                    <span className="tag-val status-info">{aiAnalysis.financialHealth}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* Real AI Causation Report */
        <div className="causation-report-container">
          {aiLoading ? (
            <div className="causation-loader">
              <span className="loader-ring"></span>
              <span>Gemini AI 모델이 1년 주가 흐름, 재무 성과 및 최근 뉴스 간의 상관관계를 종합 분석 중입니다...</span>
            </div>
          ) : (
            <div className="ai-brief-box">
              {/* Warning tag if not live */}
              {!isLive && (
                <div className="causation-warning-tag">
                  ⚠️ Gemini 모델 연동 불가 (로컬 오프라인 데이터 출력)
                </div>
              )}
              
              {aiReport && (
                <>
                  <div className="brief-title">
                    <span>Stock causation analyzer</span>
                    {lastUpdated && (
                      <span style={{ 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '10.5px', 
                        color: '#93C5FD', 
                        fontFamily: 'monospace' 
                      }}>
                        ⏱ {formatAnalysisTime(lastUpdated)}
                      </span>
                    )}
                    <span className="typing-status">분석 완료</span>
                  </div>
                  
                  {/* Summary Box */}
                  <div className="causation-summary">
                    <strong>💡 AI 분석 요약:</strong> {aiReport.summary}
                  </div>

                  {/* Static content */}
                  <div className="brief-content text-scrollable">
                    <p>{briefText}</p>
                  </div>

                  {/* Trigger Bullets */}
                  {aiReport.keyTriggers && (
                    <div className="triggers-box">
                      <h6>🔑 주요 가격 변동 트리거</h6>
                      <ul>
                        {aiReport.keyTriggers.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Valuation Opinion */}
                  {aiReport.valuationOpinion && (
                    <div className="valuation-opinion-box">
                      <strong>⚖️ AI 밸류에이션 의견:</strong> {aiReport.valuationOpinion}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
