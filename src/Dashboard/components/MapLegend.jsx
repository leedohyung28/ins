import React from "react";
import { isReverseMetric } from "../utils/colors";

const MapLegend = ({ metric }) => {
  const reverse = isReverseMetric(metric.id);

  return (
    <div className="map-legend">
      <p>{metric.label} 분포</p>
      <div className="legend-scale-labels">
        {metric.id === "sub_rate_percent" ? (
          <>
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </>
        ) : (
          <>
            <span>낮음</span>
            <span>높음</span>
          </>
        )}
      </div>
      <div className={`legend-gradient ${reverse ? "reverse" : ""}`} />
      <div className="legend-item no-data">
        <span className="legend-color" /> 데이터 없음
      </div>
    </div>
  );
};

export default MapLegend;
