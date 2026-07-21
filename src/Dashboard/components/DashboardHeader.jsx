import React, { useState } from "react";

const DashboardHeader = ({
  availableYears,
  selectedYear,
  onYearChange,
  isLoading,
  hasError,
  csvLastModified,
}) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        {isLoading && (
          <span className="header-status muted">데이터 로딩중...</span>
        )}
        {!isLoading && hasError && (
          <span className="header-status error">
            데이터를 불러올 수 없습니다. 경로를 확인해주세요.
          </span>
        )}
        {!isLoading && !hasError && availableYears.length > 0 && (
          <label className="year-select-label">
            <span className="sr-only">데이터 연도</span>
            <select
              value={selectedYear ?? ""}
              onChange={(event) => onYearChange(Number(event.target.value))}
            >
              {[...availableYears].reverse().map((year) => (
                <option key={year} value={year}>
                  {year}년 데이터
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="header-right">
        <span>데이터 연동 완료</span>
        <div
          className="data-info-wrap"
          onMouseEnter={() => setIsInfoOpen(true)}
          onMouseLeave={() => setIsInfoOpen(false)}
          onFocus={() => setIsInfoOpen(true)}
          onBlur={() => setIsInfoOpen(false)}
        >
          <button
            type="button"
            className="header-btn"
            aria-expanded={isInfoOpen}
          >
            ⓘ 데이터 안내
          </button>
          {isInfoOpen && (
            <div className="data-info-tooltip" role="tooltip">
              최종 수정일 : <strong>{csvLastModified}</strong>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
