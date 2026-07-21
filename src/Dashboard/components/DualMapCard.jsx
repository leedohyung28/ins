import React, { useMemo, useState } from "react";
import { METRICS } from "../config";
import { getTenStepColors } from "../utils/colors";
import { formatMetricValue } from "../utils/formatters";
import { processMapData } from "../utils/mapData";
import KoreaMap from "./KoreaMap";
import MetricSelector from "./MetricSelector";

const DualMapCard = ({
  label,
  initialMetricIndex,
  currentMapData,
  mapView,
  mapCenter,
  mapZoom,
  selectedProvCode,
  onProvinceClick,
  onResetMap,
}) => {
  const [metricIndex, setMetricIndex] = useState(initialMetricIndex);
  const [checkedRanges, setCheckedRanges] = useState([]);
  const metric = METRICS[metricIndex];

  const mapData = useMemo(
    () => processMapData(currentMapData, metric.id, checkedRanges),
    [checkedRanges, currentMapData, metric.id],
  );

  const rangeColors = getTenStepColors(metric.id);

  const toggleRange = (rangeIndex) => {
    setCheckedRanges((previous) =>
      previous.includes(rangeIndex)
        ? previous.filter((index) => index !== rangeIndex)
        : [...previous, rangeIndex],
    );
  };

  return (
    <section className="map-card analysis-map-card">
      <h3>
        {metric.label} 분포 분석 <span className="map-card-label">{label}</span>
      </h3>

      {mapView === "province" && (
        <button type="button" className="map-back-btn" onClick={onResetMap}>
          ← 전국 지도
        </button>
      )}

      <KoreaMap
        mapView={mapView}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        selectedProvCode={selectedProvCode}
        processedData={mapData.processedData}
        onProvinceClick={onProvinceClick}
        heightClass="analysis-map-canvas"
      />

      <MetricSelector
        metrics={METRICS}
        selectedIndex={metricIndex}
        onSelect={(index) => {
          setMetricIndex(index);
          setCheckedRanges([]);
        }}
        compact
      />

      <div className="range-filter-panel">
        <p>10% 단위 분포 필터링</p>
        <div className="range-filter-grid">
          {Array.from({ length: 10 }, (_, rangeIndex) => {
            const isChecked = checkedRanges.includes(rangeIndex);
            const color = rangeColors[rangeIndex];

            return (
              <button
                key={rangeIndex}
                type="button"
                className={isChecked ? "selected" : ""}
                style={{
                  "--range-color": color,
                }}
                onClick={() => toggleRange(rangeIndex)}
              >
                {rangeIndex * 10}~{(rangeIndex + 1) * 10}%
              </button>
            );
          })}
        </div>
      </div>

      <div className="filtered-results">
        <strong>필터링된 지역 결과:</strong>
        {checkedRanges.length === 0 ? (
          <span className="muted-result">
            10% 단위 버튼을 선택하여 지역을 확인하세요.
          </span>
        ) : mapData.filteredRegions.length > 0 ? (
          <div className="filtered-result-grid">
            {mapData.filteredRegions.map((region) => (
              <div className="filtered-result-row" key={region.name}>
                <span>{region.name}</span>
                <b>{formatMetricValue(metric.id, region.value)}</b>
              </div>
            ))}
          </div>
        ) : (
          <span className="empty-filter-result">
            해당 구간에 속하는 지역이 없습니다.
          </span>
        )}
      </div>
    </section>
  );
};

export default DualMapCard;
