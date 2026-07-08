import React from 'react';

export default function DartViewer({ companyName, dartData }) {
  const downloadCsv = () => {
    if (!dartData || dartData.length === 0) {
      alert('다운로드할 DART 공시 데이터가 존재하지 않습니다.');
      return;
    }

    // Compose CSV content with Korean BOM formatting to prevent character corruption in Excel
    let csvContent = '\uFEFF';
    csvContent += '공시일자,공시제목,제출인,AI 핵심 요약\n';

    dartData.forEach((item) => {
      const summary = item.aiSummary || '요약 준비 중';
      // Escape commas and double quotes for clean CSV columns
      const escapedTitle = `"${item.title.replace(/"/g, '""')}"`;
      const escapedSummary = `"${summary.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      csvContent += `${item.date},${escapedTitle},${item.reporter},${escapedSummary}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${companyName}_DART_공시_AI_요약.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dart-viewer glass-panel">
      <div className="dart-header">
        <div className="title-section">
          <span className="dart-icon">📋</span>
          <h3>{companyName} DART 주요 공시 및 AI 요약</h3>
        </div>
        <button className="csv-download-btn" onClick={downloadCsv} title="CSV 내보내기">
          📥 CSV 다운로드
        </button>
      </div>

      <div className="dart-table-wrapper text-scrollable">
        {dartData && dartData.length > 0 ? (
          <table className="dart-table">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>공시일자</th>
                <th style={{ width: '28%' }}>공시제목</th>
                <th style={{ width: '15%' }}>제출인</th>
                <th style={{ width: '45%' }}>✨ AI 1줄 핵심 요약</th>
              </tr>
            </thead>
            <tbody>
              {dartData.map((item, idx) => (
                <tr key={idx}>
                  <td className="dart-date">{item.date}</td>
                  <td className="dart-title">{item.title}</td>
                  <td className="dart-reporter">{item.reporter}</td>
                  <td className="dart-summary">
                    {item.aiSummary ? (
                      <span className="ai-summary-text">{item.aiSummary}</span>
                    ) : (
                      <span className="demo-badge">요약 수집 대기 중</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-dart-data">
            <p>최근 3개월 내에 DART에 공시된 주요 의무 공시 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
