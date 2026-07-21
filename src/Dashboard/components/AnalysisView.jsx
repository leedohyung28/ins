import React, { useState } from "react";
import DualMapCard from "./DualMapCard";
import RatioMapView from "./RatioMapView";

const AnalysisView = ({
  currentMapData,
  mapView,
  mapCenter,
  mapZoom,
  selectedProvCode,
  onProvinceClick,
  onResetMap,
}) => {
  const [analysisMode, setAnalysisMode] = useState("compare1");

  const sharedMapProps = {
    currentMapData,
    mapView,
    mapCenter,
    mapZoom,
    selectedProvCode,
    onProvinceClick,
    onResetMap,
  };

  return (
    <section className="analysis-view">
      <div className="analysis-mode-tabs" role="tablist" aria-label="분석 방식">
        <button
          type="button"
          role="tab"
          aria-selected={analysisMode === "compare1"}
          className={analysisMode === "compare1" ? "selected" : ""}
          onClick={() => setAnalysisMode("compare1")}
        >
          비교 1 (듀얼 맵)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={analysisMode === "compare2"}
          className={analysisMode === "compare2" ? "selected" : ""}
          onClick={() => setAnalysisMode("compare2")}
        >
          비교 2 (사용자 수식 맵)
        </button>
      </div>

      {analysisMode === "compare1" ? (
        <div className="dual-map-layout">
          <DualMapCard label="A" initialMetricIndex={0} {...sharedMapProps} />
          <DualMapCard label="B" initialMetricIndex={1} {...sharedMapProps} />
        </div>
      ) : (
        <RatioMapView {...sharedMapProps} />
      )}
    </section>
  );
};

export default AnalysisView;
