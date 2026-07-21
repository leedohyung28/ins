import React from "react";
import TypewriterEffect from "./TypewriterEffect";
import { formatMetricValue, formatNumber, hasValue } from "../utils/formatters";

const detailMetrics = [
  { id: "target_housing", label: "대상가구", unit: "건" },
  { id: "sub_housing", label: "가입가구", unit: "건" },
  { id: "sub_rate_percent", label: "가입률(%)", unit: "" },
  { id: "sub_rate_z", label: "가입률(Z값)", unit: "" },
  { id: "damage", label: "우심피해액", unit: "원" },
  { id: "population", label: "인구수", unit: "명" },
];

const formatDetailValue = (id, value) => {
  if (id === "sub_rate_percent") return formatMetricValue(id, value);
  return formatNumber(value);
};

const RegionDetailCard = ({
  targetName,
  metric,
  displayData,
  insightText,
  isInsightLoading,
}) => (
  <section className="detail-card region-detail-card">
    <div className="detail-header">
      <h3>선택 지역 상세 정보</h3>
    </div>

    <div className="region-title">
      <h2>📍 {targetName}</h2>
    </div>

    <div className="radar-section">
      <div className="index-score">
        <p>선택된 지표 ({metric.label})</p>
        <h1 style={{ color: displayData.color || "#94A3B8" }}>
          {formatMetricValue(metric.id, displayData.displayValue)}
          {metric.id !== "sub_rate_percent" && metric.unit && (
            <span>{metric.unit}</span>
          )}
        </h1>
      </div>
    </div>

    <div className="detail-metrics-list">
      {detailMetrics.map((detailMetric) => (
        <div className="metric-box" key={detailMetric.id}>
          <p>{detailMetric.label}</p>
          <h4>
            {formatDetailValue(detailMetric.id, displayData[detailMetric.id])}
            {detailMetric.unit && hasValue(displayData[detailMetric.id]) && (
              <span>{detailMetric.unit}</span>
            )}
          </h4>
        </div>
      ))}
    </div>

    <div className="ai-insight">
      <h4>✨ 분석 인사이트</h4>
      {isInsightLoading ? (
        <div className="insight-loading" aria-label="인사이트 로딩중">
          <span className="spinner" />
        </div>
      ) : (
        <p>
          <TypewriterEffect text={insightText} delay={30} />
        </p>
      )}
    </div>
  </section>
);

export default RegionDetailCard;
