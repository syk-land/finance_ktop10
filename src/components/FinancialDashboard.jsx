import React, { useState } from 'react';

export default function FinancialDashboard({ company, stockData, stockLoading, isLive, marketCap }) {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'revenue', or 'ratios'
  const { financials } = company;

  // 1. Calculations for Financial Charts (Revenue / Profit)
  const revenues = financials.map((f) => f.revenue);
  const profits = financials.map((f) => f.operatingProfit);
  const maxVal = Math.max(...revenues, ...profits, 1);
  const minVal = Math.min(...revenues, ...profits, 0);

  // Ratios (ROE, Debt Ratio)
  const roes = financials.map((f) => f.roe);
  const debts = financials.map((f) => f.debtRatio);
  const maxRatioVal = Math.max(...roes, ...debts, 100);

  // 2. Calculations for Historical Stock Chart
  const stockCloses = (stockData || []).map((d) => d?.close || 0);
  const maxPrice = stockCloses.length > 0 ? Math.max(...stockCloses) * 1.03 : 1;
  const minPrice = stockCloses.length > 0 ? Math.min(...stockCloses) * 0.97 : 0;
  const startPrice = stockCloses.length > 0 ? stockCloses[0] : 0;
  const endPrice = stockCloses.length > 0 ? stockCloses[stockCloses.length - 1] : 0;
  const priceChangePct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  // SVG dimensions
  const width = 500;
  const height = 220;
  const padding = 40;

  // Coordinates calculators
  const getX = (index, total) => padding + (index * (width - padding * 2)) / (total - 1 || 1);
  
  const getY = (val, max, min) => {
    const chartHeight = height - padding * 2;
    const valueRange = max - min || 1;
    return height - padding - ((val - min) / valueRange) * chartHeight;
  };

  return (
    <div className="financial-dashboard glass-panel">
      <div className="dashboard-header">
        <div className="company-badge-info" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h2>{company.name} 시장분석지표</h2>
          <span className="industry-tag">{company.industry}</span>
          <span className="cap-tag">시총 {marketCap || company.marketCap}</span>
          <a 
            href={`https://finance.naver.com/item/main.naver?code=${company.ticker}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="naver-finance-link"
            style={{
              background: '#03C75A', 
              color: '#FFFFFF',
              padding: '3px 9px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(3, 199, 90, 0.2)',
              marginLeft: '4px',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>네이버 금융 ↗</span>
          </a>
        </div>
        <div className="chart-tabs">
          <button
            className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            1년 주가
          </button>
          <button
            className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            3년 실적
          </button>
          <button
            className={`tab-btn ${activeTab === 'ratios' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratios')}
          >
            재무 비율
          </button>
        </div>
      </div>

      <p className="company-desc">{company.description}</p>

      <div className="dashboard-body">
        {/* SVG Chart Area */}
        <div className="chart-container">
          {/* Warning banner when stock data isn't live */}
          {activeTab === 'stock' && !isLive && !stockLoading && (
            <div className="chart-warning-banner">
              ⚠️ 주가 데이터 로드 실패 (네이버 금융 서버 미도달) - 데모용 난수 시뮬레이션 표시 중
            </div>
          )}

          {stockLoading && activeTab === 'stock' ? (
            <div className="chart-loader">
              <span className="spinner"></span>
              <span>네이버 금융 실시간 시세 수집 중...</span>
            </div>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
              {/* Gradients */}
              <defs>
                <linearGradient id="stockAreaGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Axis */}
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="axis-line" />
              <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="axis-line" />

              {/* Horizontal Helper grid lines */}
              {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = padding + ((height - padding * 2) * (1 - ratio));
                return (
                  <line
                    key={i}
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    className="grid-line"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {activeTab === 'stock' && stockData.length > 0 && (
                <>
                  {/* Stock Area Gradient Path */}
                  {(() => {
                    const startX = getX(0, stockData.length);
                    const startY = height - padding;
                    const pathCoords = stockData
                      .map((d, i) => `L ${getX(i, stockData.length)} ${getY(d.close, maxPrice, minPrice)}`)
                      .join(' ');
                    const endX = getX(stockData.length - 1, stockData.length);
                    const endY = height - padding;
                    const fullPath = `M ${startX} ${startY} ${pathCoords.substring(1)} L ${endX} ${endY} Z`;
                    return <path d={fullPath} fill="url(#stockAreaGlow)" />;
                  })()}

                  {/* Stock Line */}
                  {(() => {
                    const points = stockData
                      .map((d, i) => `${getX(i, stockData.length)},${getY(d.close, maxPrice, minPrice)}`)
                      .join(' ');
                    return <polyline points={points} className="line-stock-price" />;
                  })()}

                  {/* Key Price Indicators (High, Low, Start, End) */}
                  {(() => {
                    const maxIdx = stockCloses.indexOf(Math.max(...stockCloses));
                    const minIdx = stockCloses.indexOf(Math.min(...stockCloses));

                    return (
                      <>
                        {/* Max Node */}
                        <circle
                          cx={getX(maxIdx, stockData.length)}
                          cy={getY(maxPrice / 1.03, maxPrice, minPrice)}
                          r="4"
                          fill="#F59E0B"
                        />
                        <text
                          x={getX(maxIdx, stockData.length)}
                          y={getY(maxPrice / 1.03, maxPrice, minPrice) - 8}
                          className="stock-marker-text max-marker"
                        >
                          최고 {Math.max(...stockCloses).toLocaleString()}
                        </text>

                        {/* Min Node */}
                        <circle
                          cx={getX(minIdx, stockData.length)}
                          cy={getY(minPrice * 1.03, maxPrice, minPrice)}
                          r="4"
                          fill="#EF4444"
                        />
                        <text
                          x={getX(minIdx, stockData.length)}
                          y={getY(minPrice * 1.03, maxPrice, minPrice) + 12}
                          className="stock-marker-text min-marker"
                        >
                          최저 {Math.min(...stockCloses).toLocaleString()}
                        </text>
                      </>
                    );
                  })()}

                  {/* X Axis Range Markers */}
                  <text x={padding} y={height - 12} className="chart-label-year" textAnchor="start">
                    {stockData[0].date}
                  </text>
                  <text x={width - padding} y={height - 12} className="chart-label-year" textAnchor="end">
                    최신 ({stockData[stockData.length - 1].date})
                  </text>
                </>
              )}

              {activeTab === 'revenue' && (
                <>
                  {/* Revenue Bars */}
                  {financials.map((data, index) => {
                    const x = getX(index, financials.length);
                    const y = getY(data.revenue, maxVal, minVal);
                    const barWidth = 36;
                    return (
                      <g key={`rev-${data.year}`}>
                        <rect
                          x={x - barWidth / 2}
                          y={y}
                          width={barWidth}
                          height={height - padding - y}
                          className="bar-revenue"
                          rx="4"
                        />
                        <text x={x} y={y - 8} className="chart-val-text rev-text">
                          {data.revenue.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Operating Profit Line */}
                  {(() => {
                    const points = financials
                      .map((data, index) => `${getX(index, financials.length)},${getY(data.operatingProfit, maxVal, minVal)}`)
                      .join(' ');
                    return (
                      <>
                        <polyline points={points} className="line-profit" />
                        {financials.map((data, index) => {
                          const x = getX(index, financials.length);
                          const y = getY(data.operatingProfit, maxVal, minVal);
                          return (
                            <g key={`prof-node-${data.year}`}>
                              <circle cx={x} cy={y} r="5" className="circle-profit" />
                              <text x={x} y={y - 10} className="chart-val-text profit-text">
                                {data.operatingProfit.toFixed(1)}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}

                  {financials.map((data, index) => (
                    <text key={`yr-${data.year}`} x={getX(index, financials.length)} y={height - 12} className="chart-label-year">
                      {data.year}년
                    </text>
                  ))}
                </>
              )}

              {activeTab === 'ratios' && (
                <>
                  {/* Debt Ratio Line */}
                  {(() => {
                    const points = financials
                      .map((data, index) => `${getX(index, financials.length)},${getY(data.debtRatio, maxRatioVal, 0)}`)
                      .join(' ');
                    return (
                      <>
                        <polyline points={points} className="line-debt" />
                        {financials.map((data, index) => {
                          const x = getX(index, financials.length);
                          const y = getY(data.debtRatio, maxRatioVal, 0);
                          return (
                            <g key={`debt-node-${data.year}`}>
                              <circle cx={x} cy={y} r="5" className="circle-debt" />
                              <text x={x} y={y - 10} className="chart-val-text debt-text">
                                부채:{data.debtRatio.toFixed(0)}%
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}

                  {/* ROE Line */}
                  {(() => {
                    const points = financials
                      .map((data, index) => `${getX(index, financials.length)},${getY(data.roe, maxRatioVal, 0)}`)
                      .join(' ');
                    return (
                      <>
                        <polyline points={points} className="line-roe" />
                        {financials.map((data, index) => {
                          const x = getX(index, financials.length);
                          const y = getY(data.roe, maxRatioVal, 0);
                          return (
                            <g key={`roe-node-${data.year}`}>
                              <circle cx={x} cy={y} r="5" className="circle-roe" />
                              <text x={x} y={y + 18} className="chart-val-text roe-text">
                                ROE:{data.roe.toFixed(1)}%
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}

                  {financials.map((data, index) => (
                    <text key={`yr2-${data.year}`} x={getX(index, financials.length)} y={height - 12} className="chart-label-year">
                      {data.year}년
                    </text>
                  ))}
                </>
              )}
            </svg>
          )}

          <div className="chart-legend">
            {activeTab === 'stock' ? (
              <div className={`stock-performance ${priceChangePct >= 0 ? 'text-positive' : 'text-negative'}`}>
                1년 수익률: <strong>{priceChangePct.toFixed(1)}%</strong> ({startPrice.toLocaleString()}원 → {endPrice.toLocaleString()}원)
              </div>
            ) : activeTab === 'revenue' ? (
              <>
                <span className="legend-item"><span className="legend-color rev-color"></span>매출액 (Bar)</span>
                <span className="legend-item"><span className="legend-color profit-color"></span>영업이익 (Line)</span>
              </>
            ) : (
              <>
                <span className="legend-item"><span className="legend-color debt-color"></span>부채비율 (Line)</span>
                <span className="legend-item"><span className="legend-color roe-color"></span>ROE (Line)</span>
              </>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container">
          <table className="financial-table">
            <thead>
              <tr>
                <th>구분</th>
                {financials.map((d) => <th key={d.year}>{d.year}년</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="row-title">매출액 (조 원)</td>
                {financials.map((d) => <td key={d.year}>{d.revenue.toFixed(1)}</td>)}
              </tr>
              <tr>
                <td className="row-title">영업이익 (조 원)</td>
                {financials.map((d) => (
                  <td key={d.year} className={d.operatingProfit < 0 ? 'text-negative' : 'text-positive'}>
                    {d.operatingProfit.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="row-title">부채비율 (%)</td>
                {financials.map((d) => <td key={d.year}>{d.debtRatio.toFixed(1)}%</td>)}
              </tr>
              <tr>
                <td className="row-title">ROE (%)</td>
                {financials.map((d) => (
                  <td key={d.year} className={d.roe < 0 ? 'text-negative' : 'text-positive'}>
                    {d.roe.toFixed(1)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
