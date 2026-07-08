import React, { useState, useEffect } from 'react';

export default function Header({ isLive, isAiLive }) {
  const [time, setTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kakaoToken, setKakaoToken] = useState('');
  const [sendingType, setSendingType] = useState(null); // 'forecast', 'dart', 'financials' or null

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Initial load of token from localStorage
    const savedToken = localStorage.getItem('kakao_access_token') || '';
    setKakaoToken(savedToken);

    // If local storage is empty, grab pre-filled default env token from backend
    if (!savedToken) {
      fetch('http://localhost:5005/api/kakao-token')
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            setKakaoToken(data.token);
          }
        })
        .catch(err => console.warn('[Header] Failed to fetch pre-filled token:', err.message));
    }

    return () => clearInterval(timer);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('kakao_access_token', kakaoToken.trim());
    setIsModalOpen(false);
    alert('🔑 카카오톡 액세스 토큰 설정이 브라우저 로컬 저장소에 정상 저장되었습니다!');
  };

  const triggerKakaoTest = async () => {
    if (sendingType) return;
    setSendingType('forecast');
    try {
      // 1. Get Access Token from localStorage first, then fallback to backend
      let token = localStorage.getItem('kakao_access_token');
      if (!token) {
        const tokenRes = await fetch('http://localhost:5005/api/kakao-token');
        const { token: fallbackToken } = await tokenRes.json();
        token = fallbackToken;
      }

      if (!token) {
        alert('❌ 설정에서 카카오 액세스 토큰을 먼저 등록해 주세요.');
        setSendingType(null);
        return;
      }

      // 2. Fetch the 10-company AI stock forecast report text from backend
      const textRes = await fetch('http://localhost:5005/api/generate-forecast-text', { method: 'POST' });
      if (!textRes.ok) {
        alert('❌ AI 전망 보고서 생성에 실패했습니다. Gemini 할당량 또는 API 연결을 확인해 주세요.');
        setSendingType(null);
        return;
      }
      const { report } = await textRes.json();

      // 3. Dispatch post request directly to Kakao API from browser
      const templateObject = {
        object_type: 'text',
        text: report,
        link: {
          web_url: window.location.origin,
          mobile_web_url: window.location.origin
        },
        button_title: '대시보드 보기'
      };

      const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          template_object: JSON.stringify(templateObject)
        })
      });

      const result = await res.json();
      if (result.result_code === 0) {
        alert('📊 K-TOP 10대 기업 주가 및 AI 전망 카톡 발송이 성공적으로 완료되었습니다!');
      } else {
        alert(`❌ 전송 실패: ${result.msg || '인증 오류가 발생했습니다.'}`);
      }
    } catch (err) {
      alert('❌ 통신 중 오류가 발생했습니다.');
    } finally {
      setSendingType(null);
    }
  };

  const triggerDartTalk = async () => {
    if (sendingType) return;
    setSendingType('dart');
    try {
      let token = localStorage.getItem('kakao_access_token');
      if (!token) {
        const tokenRes = await fetch('http://localhost:5005/api/kakao-token');
        const { token: fallbackToken } = await tokenRes.json();
        token = fallbackToken;
      }

      if (!token) {
        alert('❌ 설정에서 카카오 액세스 토큰을 먼저 등록해 주세요.');
        setSendingType(null);
        return;
      }

      const textRes = await fetch('http://localhost:5005/api/generate-dart-report-text', { method: 'POST' });
      if (!textRes.ok) {
        alert('❌ DART 공시 요약 생성에 실패했습니다.');
        setSendingType(null);
        return;
      }
      const { report } = await textRes.json();

      const templateObject = {
        object_type: 'text',
        text: report,
        link: {
          web_url: window.location.origin,
          mobile_web_url: window.location.origin
        },
        button_title: '대시보드 보기'
      };

      const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          template_object: JSON.stringify(templateObject)
        })
      });

      const result = await res.json();
      if (result.result_code === 0) {
        alert('📋 10대 기업 DART 공시 요약 카톡 전송이 성공적으로 완료되었습니다!');
      } else {
        alert(`❌ 전송 실패: ${result.msg || '인증 오류가 발생했습니다.'}`);
      }
    } catch (err) {
      alert('❌ 통신 중 오류가 발생했습니다.');
    } finally {
      setSendingType(null);
    }
  };

  const triggerFinancialsTalk = async () => {
    if (sendingType) return;
    setSendingType('financials');
    try {
      let token = localStorage.getItem('kakao_access_token');
      if (!token) {
        const tokenRes = await fetch('http://localhost:5005/api/kakao-token');
        const { token: fallbackToken } = await tokenRes.json();
        token = fallbackToken;
      }

      if (!token) {
        alert('❌ 설정에서 카카오 액세스 토큰을 먼저 등록해 주세요.');
        setSendingType(null);
        return;
      }

      const textRes = await fetch('http://localhost:5005/api/generate-financials-report-text', { method: 'POST' });
      if (!textRes.ok) {
        alert('❌ 재무제표 요약 생성에 실패했습니다.');
        setSendingType(null);
        return;
      }
      const { report } = await textRes.json();

      const templateObject = {
        object_type: 'text',
        text: report,
        link: {
          web_url: window.location.origin,
          mobile_web_url: window.location.origin
        },
        button_title: '대시보드 보기'
      };

      const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          template_object: JSON.stringify(templateObject)
        })
      });

      const result = await res.json();
      if (result.result_code === 0) {
        alert('📉 10대 기업 핵심 재무제표 요약 카톡 전송이 성공적으로 완료되었습니다!');
      } else {
        alert(`❌ 전송 실패: ${result.msg || '인증 오류가 발생했습니다.'}`);
      }
    } catch (err) {
      alert('❌ 통신 중 오류가 발생했습니다.');
    } finally {
      setSendingType(null);
    }
  };

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

          {/* KakaoTalk Test Notification Trigger Button */}
          <button 
            className="kakao-test-btn" 
            onClick={triggerKakaoTest}
            disabled={sendingType !== null}
            style={{
              background: sendingType === 'forecast' ? '#555555' : '#FEE500',
              color: sendingType === 'forecast' ? '#ffffff' : '#191919',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: sendingType !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: sendingType !== null && sendingType !== 'forecast' ? 0.4 : 1,
              boxShadow: '0 2px 6px rgba(254, 229, 0, 0.2)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => sendingType === null && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => sendingType === null && (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span>{sendingType === 'forecast' ? '⏳ 분석 중...' : '💬 전망 톡'}</span>
          </button>

          {/* DART Talk Trigger Button */}
          <button 
            className="kakao-dart-btn" 
            onClick={triggerDartTalk}
            disabled={sendingType !== null}
            style={{
              background: sendingType === 'dart' ? '#555555' : '#E6FFE6',
              color: sendingType === 'dart' ? '#ffffff' : '#006600',
              border: sendingType === 'dart' ? 'none' : '1px solid rgba(0, 102, 0, 0.2)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: sendingType !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: sendingType !== null && sendingType !== 'dart' ? 0.4 : 1,
              boxShadow: '0 2px 6px rgba(0, 102, 0, 0.1)',
              transition: 'all 0.15s ease',
              marginLeft: '4px'
            }}
            onMouseOver={(e) => sendingType === null && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => sendingType === null && (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span>{sendingType === 'dart' ? '⏳ 분석 중...' : '📋 DART 톡'}</span>
          </button>

          {/* Financials Talk Trigger Button */}
          <button 
            className="kakao-fin-btn" 
            onClick={triggerFinancialsTalk}
            disabled={sendingType !== null}
            style={{
              background: sendingType === 'financials' ? '#555555' : '#E6F0FF',
              color: sendingType === 'financials' ? '#ffffff' : '#0044cc',
              border: sendingType === 'financials' ? 'none' : '1px solid rgba(0, 68, 204, 0.2)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: sendingType !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: sendingType !== null && sendingType !== 'financials' ? 0.4 : 1,
              boxShadow: '0 2px 6px rgba(0, 68, 204, 0.1)',
              transition: 'all 0.15s ease',
              marginLeft: '4px'
            }}
            onMouseOver={(e) => sendingType === null && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => sendingType === null && (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span>{sendingType === 'financials' ? '⏳ 분석 중...' : '📉 재무 톡'}</span>
          </button>

          {/* Settings Modal Trigger Button */}
          <button 
            className="settings-btn" 
            onClick={() => setIsModalOpen(true)} 
            title="카카오 설정"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            ⚙️ 설정
          </button>

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

      {/* Settings Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="settings-modal glass-panel">
            <div className="modal-header">
              <h3>🧬 카카오톡 알림 토큰 설정</h3>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label htmlFor="kakaoTokenInput">KakaoTalk Access Token (액세스 토큰)</label>
                <div className="input-with-clear">
                  <input
                    id="kakaoTokenInput"
                    type="password"
                    placeholder="카카오 디벨로퍼스 REST API 테스트 도구에서 발급받은 토큰을 입력하세요"
                    value={kakaoToken}
                    onChange={(e) => setKakaoToken(e.target.value)}
                  />
                  {kakaoToken && (
                    <button type="button" className="input-clear-btn" onClick={() => setKakaoToken('')}>✕</button>
                  )}
                </div>
                <p className="form-helper">
                  입력하신 카카오 액세스 토큰은 브라우저의 안전한 로컬 보관소(LocalStorage)에 보관되며, 
                  카톡 API 요청 시 실시간 인증 헤더로 즉시 교체되어 사용됩니다. (토큰이 유출되지 않음)
                  <br />
                  <a href="https://developers.kakao.com/tool/rest-api/open/talk/memo/default/send/post" target="_blank" rel="noreferrer" className="helper-link">
                    토큰 신규 발급하러 가기 (10초 소요) ↗
                  </a>
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>취소</button>
                <button type="submit" className="btn-save">토큰 저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
