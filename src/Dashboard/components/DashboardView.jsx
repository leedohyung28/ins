import React from "react";
import KoreaMap from "./KoreaMap";
import MapLegend from "./MapLegend";
import MetricSelector from "./MetricSelector";
import RegionDetailCard from "./RegionDetailCard";
import StatCards from "./StatCards";
import TopRegionsChart from "./TopRegionsChart";

const DashboardView = ({
  selectedYear,
  scopeName,
  displayTotals,
  mapView,
  mapCenter,
  mapZoom,
  selectedProvCode,
  selectedMunicipality,
  mapData,
  metric,
  metrics,
  selectedMetricIndex,
  onMetricSelect,
  onProvinceClick,
  onMunicipalityClick,
  onResetMap,
  onRegionEnter,
  onRegionLeave,
  topRegions,
  targetName,
  displayData,
  insightText,
  isInsightLoading,
}) => (
  <div className="dashboard-view">
    <StatCards scopeName={scopeName} totals={displayTotals} />

    <div className="main-content-grid">
      <div className="left-column">
        <section className="map-card dashboard-map-card">
          <h3>
            {selectedYear || "-"}년 지역별 지표 현황
            <span className="map-helper-text">
              {mapView === "national"
                ? "(시/도를 클릭하여 줌인하세요)"
                : "(시/군/구를 클릭하여 상세 조회하세요)"}
            </span>
          </h3>

          {mapView === "province" && (
            <button type="button" className="map-back-btn" onClick={onResetMap}>
              ← 전국 지도로 돌아가기
            </button>
          )}

          <MapLegend metric={metric} />
          <KoreaMap
            mapView={mapView}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            selectedProvCode={selectedProvCode}
            selectedMunicipality={selectedMunicipality}
            processedData={mapData.processedData}
            onProvinceClick={onProvinceClick}
            onMunicipalityClick={onMunicipalityClick}
            onRegionEnter={onRegionEnter}
            onRegionLeave={onRegionLeave}
            enableMunicipalityClick
            heightClass="dashboard-map-canvas"
          />

          <MetricSelector
            metrics={metrics}
            selectedIndex={selectedMetricIndex}
            onSelect={onMetricSelect}
            title="지도 표시 지표 선택"
          />
        </section>

        <TopRegionsChart
          metric={metric}
          selectedYear={selectedYear}
          topRegions={topRegions}
          minimum={mapData.min}
          maximum={mapData.max}
        />
      </div>

      <div className="right-column">
        <RegionDetailCard
          targetName={targetName}
          metric={metric}
          displayData={displayData}
          insightText={insightText}
          isInsightLoading={isInsightLoading}
        />
      </div>
    </div>
  </div>
);

export default DashboardView;
