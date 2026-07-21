import React from "react";
const MetricSelector = ({
  metrics,
  selectedIndex,
  onSelect,
  compact = false,
  title,
}) => (
  <div className={`metric-selector-wrap ${compact ? "compact" : ""}`}>
    {title && (
      <p className="metric-selector-title">
        {title} : <strong>{metrics[selectedIndex].label}</strong>
      </p>
    )}
    <div
      className="metric-selector"
      style={{
        "--metric-count": metrics.length,
        "--selected-index": selectedIndex,
      }}
      role="tablist"
      aria-label="지도 표시 지표"
    >
      <span className="metric-selector-indicator" aria-hidden="true" />
      {metrics.map((metric, index) => (
        <button
          key={metric.id}
          type="button"
          role="tab"
          aria-selected={selectedIndex === index}
          className={selectedIndex === index ? "selected" : ""}
          title={metric.label}
          onClick={() => onSelect(index)}
        >
          {metric.label}
        </button>
      ))}
    </div>
  </div>
);

export default MetricSelector;
