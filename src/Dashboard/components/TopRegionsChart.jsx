import React from "react";
import { formatMetricValue } from "../utils/formatters";

const TopRegionsChart = ({
  metric,
  selectedYear,
  topRegions,
  minimum,
  maximum,
}) => (
  <section className="chart-card top-regions-card">
    <h3>
      {metric.label} TOP 5 ({selectedYear || "-"}년)
    </h3>
    <div className="bar-chart">
      {topRegions.length > 0 ? (
        topRegions.map(([regionName, row], index) => {
          const value = row[metric.id];
          const width =
            maximum > minimum
              ? ((value - minimum) / (maximum - minimum)) * 100
              : 50;

          return (
            <div className="bar-row" key={regionName}>
              <span className="bar-rank">{index + 1}</span>
              <span className="bar-label">{regionName}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(width, 5)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
              <span className="bar-value">
                {formatMetricValue(metric.id, value)}
              </span>
            </div>
          );
        })
      ) : (
        <div className="empty-state">데이터가 없습니다.</div>
      )}
    </div>
  </section>
);

export default TopRegionsChart;
