import React, { useState } from 'react';

export default function NewsSentiment({ news, isLive }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Calculate sentiment distribution
  const total = news.length;
  const positiveCount = news.filter((n) => n.sentiment === 'positive').length;
  const neutralCount = news.filter((n) => n.sentiment === 'neutral').length;
  const negativeCount = news.filter((n) => n.sentiment === 'negative').length;

  const posPct = total > 0 ? (positiveCount / total) * 100 : 0;
  const neuPct = total > 0 ? (neutralCount / total) * 100 : 0;
  const negPct = total > 0 ? (negativeCount / total) * 100 : 0;

  const getSentimentLabel = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return { text: '호재 (Positive)', class: 'sent-pos' };
      case 'negative':
        return { text: '악재 (Negative)', class: 'sent-neg' };
      default:
        return { text: '중립 (Neutral)', class: 'sent-neu' };
    }
  };

  return (
    <div className="news-sentiment glass-panel">
      <div className="news-header">
        <div className="news-header-title">
          <span className="news-icon">📰</span>
          <h3>AI 뉴스 & 센티먼트 분석</h3>
          {!isLive && (
            <span className="news-warning-tag">
              ⚠️ 로컬 오프라인 데이터 수록 중
            </span>
          )}
        </div>
        <span className="news-count">최신 4개 기사 분석</span>
      </div>

      {/* Sentiment Cumulative Bar */}
      <div className="sentiment-tracker">
        <div className="tracker-labels">
          <span className="pos-label">긍정 {posPct.toFixed(0)}%</span>
          <span className="neu-label">중립 {neuPct.toFixed(0)}%</span>
          <span className="neg-label">부정 {negPct.toFixed(0)}%</span>
        </div>
        <div className="sentiment-bar-progress">
          <div className="bar-part part-pos" style={{ width: `${posPct}%` }} title={`긍정: ${posPct}%`}></div>
          <div className="bar-part part-neu" style={{ width: `${neuPct}%` }} title={`중립: ${neuPct}%`}></div>
          <div className="bar-part part-neg" style={{ width: `${negPct}%` }} title={`부정: ${negPct}%`}></div>
        </div>
      </div>

      {/* News Accordion Feed */}
      <div className="news-feed">
        {news.map((item, index) => {
          const isOpen = openIndex === index;
          const sentimentMeta = getSentimentLabel(item.sentiment);

          return (
            <div
              key={index}
              className={`news-item-card ${isOpen ? 'expanded' : ''}`}
            >
              <div className="news-item-header" onClick={() => toggleAccordion(index)}>
                <div className="news-title-row">
                  <span className={`sentiment-badge ${sentimentMeta.class}`}>
                    {item.sentiment === 'positive' ? '🟢' : item.sentiment === 'negative' ? '🔴' : '🟡'} {sentimentMeta.text}
                  </span>
                  <span className="news-source">{item.source} · {item.time}</span>
                </div>
                <div className="news-title-text-row">
                  <h4 className="news-title">{item.title}</h4>
                  <span className="accordion-arrow">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              <div className={`news-item-body ${isOpen ? 'open' : ''}`}>
                <div className="ai-summary-box">
                  <div className="summary-header-row">
                    <span className="summary-sparkle">✨</span>
                    <h5>AI 3줄 핵심 요약</h5>
                  </div>
                  <p className="summary-text">{item.summary}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
