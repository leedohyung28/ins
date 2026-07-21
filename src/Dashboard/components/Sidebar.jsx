import React from "react";
const Sidebar = ({ activeTab, onTabChange, onDownload }) => (
  <aside className="sidebar">
    <div className="sidebar-logo">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div>
        <h1>보험보장공백 대시보드</h1>
        <p>AI 기반 지역별 보험보장공백 분석</p>
      </div>
    </div>

    <nav className="nav-menu" aria-label="대시보드 메뉴">
      <button
        type="button"
        className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
        onClick={() => onTabChange("dashboard")}
      >
        대시보드
      </button>
      <button
        type="button"
        className={`nav-item ${activeTab === "analysis" ? "active" : ""}`}
        onClick={() => onTabChange("analysis")}
      >
        보험보장공백 분석
      </button>
      <button type="button" className="nav-item" onClick={onDownload}>
        데이터 다운로드
      </button>
    </nav>
  </aside>
);

export default Sidebar;
