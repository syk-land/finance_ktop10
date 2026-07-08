import React, { useState, useEffect } from 'react';

export default function Header({ isLive, isAiLive }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <header className="main-header">
        <div className="logo-container">
          <div className="logo-icon">🧬</div>
          <div className="logo-text">
            <h1>K-TOP 10 FINANCE</h1>
            <p>AI Real-Time Financial & News Analyst</p>
          </div>
        </div>

        <div className="header-status">
          {/* Real-time Data Source Badge */}
          {isLive ? (
            <div className="data-source-badge live">
              <span className="source-dot"></span>
              <span>네이버 실시간 시세 연동</span>
            </div>
          ) : (
            <div className="data-source-badge demo">
              <span className="source-dot"></span>
              <span>⚠️ 데모/오프라인 모드</span>
            </div>
          )}

          {/* AI Connection dynamic badge (Static view only, no settings modal trigger) */}
          {isAiLive ? (
            <div className="api-key-badge active" style={{ cursor: 'default' }}>
              <span className="key-icon">🔑</span>
              <span>Gemini 모델 연결됨</span>
            </div>
          ) : (
            <div className="api-key-badge inactive" style={{ cursor: 'default' }}>
              <span className="key-icon">⚠️</span>
              <span>AI 모델 오프라인 데모</span>
            </div>
          )}

          <div className="status-indicator">
            <span className="pulse-dot"></span>
            <span className="status-label">AI Engine Active</span>
          </div>

          <div className="live-clock">
            {time.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short'
            })}{' '}
            {time.toLocaleTimeString('ko-KR', { hour12: false })}
          </div>
        </div>
      </header>
    </>
  );
}
