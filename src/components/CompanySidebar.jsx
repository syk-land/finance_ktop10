import React, { useState } from 'react';

export default function CompanySidebar({ companies, selectedCompanyId, onSelectCompany }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.ticker.includes(searchTerm)
  );

  return (
    <aside className="company-sidebar">
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="기업명 또는 종목코드 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')}>
            ✕
          </button>
        )}
      </div>

      <div className="sidebar-title">
        <span>대한민국 10대 기업 목록</span>
        <span className="count-badge">{filteredCompanies.length}</span>
      </div>

      <div className="company-list">
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => {
            const isSelected = company.id === selectedCompanyId;
            return (
              <div
                key={company.id}
                className={`company-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectCompany(company.id)}
              >
                <div className="card-logo">
                  <span>{company.logoText}</span>
                </div>
                <div className="card-info">
                  <div className="card-header-row">
                    <span className="company-name">{company.name}</span>
                    <span className="company-ticker">{company.ticker}</span>
                  </div>
                  <div className="card-footer-row">
                    <span className="company-industry">{company.industry}</span>
                    <span className="company-cap">{company.marketCap}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">검색 결과가 없습니다.</div>
        )}
      </div>
    </aside>
  );
}
