import React, { useMemo, useState } from "react";
import { CSV_LAST_MODIFIED, METRICS } from "./config";
import AnalysisView from "./components/AnalysisView";
import DashboardHeader from "./components/DashboardHeader";
import DashboardView from "./components/DashboardView";
import Sidebar from "./components/Sidebar";
import { useDashboardData } from "./hooks/useDashboardData";
import { useInsights } from "./hooks/useInsights";
import { useMapNavigation } from "./hooks/useMapNavigation";
import {
  downloadCsvFile,
  getMunicipalDataUrl,
  getNationalDataUrl,
} from "./services/dashboardDataService";
import { hasValue } from "./utils/formatters";
import {
  fillTotalsFromParent,
  getTopRegions,
  processMapData,
} from "./utils/mapData";
import "./styles/index.css";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMetricIndex, setSelectedMetricIndex] = useState(0);

  const mapNavigation = useMapNavigation();
  const {
    selectedRegion,
    selectedMunicipality,
    hoveredRegion,
    setHoveredRegion,
    hoveredMunicipality,
    setHoveredMunicipality,
    mapView,
    mapCenter,
    mapZoom,
    selectedProvCode,
    handleProvinceClick,
    handleMunicipalityClick,
    handleResetMap,
  } = mapNavigation;

  const {
    availableYears,
    selectedYear,
    setSelectedYear,
    currentNational,
    currentMunicipal,
    isLoading,
    hasError,
  } = useDashboardData({ mapView, selectedRegion });

  const currentMetric = METRICS[selectedMetricIndex];
  const currentMapData =
    mapView === "national" ? currentNational.dataMap : currentMunicipal.dataMap;
  const currentTotals =
    mapView === "national" ? currentNational.totals : currentMunicipal.totals;

  const dashboardMapData = useMemo(
    () => processMapData(currentMapData, currentMetric.id),
    [currentMapData, currentMetric.id],
  );

  const parentRegionData = currentNational.dataMap[selectedRegion];
  const displayTotals = fillTotalsFromParent({
    totals: currentTotals,
    mapView,
    parentRegionData,
  });

  const { targetName, displayData } = useMemo(() => {
    if (mapView === "national") {
      const regionName = hoveredRegion || selectedRegion;
      return {
        targetName: regionName,
        displayData: dashboardMapData.processedData[regionName] || {
          color: "#94A3B8",
          displayValue: "-",
        },
      };
    }

    const municipalityName = hoveredMunicipality || selectedMunicipality;
    if (municipalityName) {
      return {
        targetName: municipalityName,
        displayData: dashboardMapData.processedData[municipalityName] || {
          color: "#94A3B8",
          displayValue: "-",
        },
      };
    }

    const parent = currentNational.dataMap[selectedRegion];
    return {
      targetName: `${selectedRegion} 전체`,
      displayData: parent
        ? {
            ...parent,
            color: "#94A3B8",
            displayValue: hasValue(parent[currentMetric.id])
              ? parent[currentMetric.id]
              : "-",
          }
        : { color: "#94A3B8", displayValue: "-" },
    };
  }, [
    currentMetric.id,
    currentNational.dataMap,
    dashboardMapData.processedData,
    hoveredMunicipality,
    hoveredRegion,
    mapView,
    selectedMunicipality,
    selectedRegion,
  ]);

  const topRegions = useMemo(
    () => getTopRegions(dashboardMapData.processedData, currentMetric.id),
    [currentMetric.id, dashboardMapData.processedData],
  );

  const { insightText, isInsightLoading } = useInsights({
    active: activeTab === "dashboard",
    selectedYear,
    mapView,
    selectedRegion,
    targetName,
    metricId: currentMetric.id,
  });

  const handleDownload = async () => {
    if (!selectedYear) {
      window.alert("선택된 년도 데이터가 없습니다.");
      return;
    }

    const isNational = mapView === "national";
    const url = isNational
      ? getNationalDataUrl(selectedYear)
      : getMunicipalDataUrl(selectedRegion, selectedYear);
    const fileName = isNational
      ? `전국_${selectedYear}년_데이터.csv`
      : `${selectedRegion}_${selectedYear}년_데이터.csv`;

    try {
      await downloadCsvFile({ url, fileName });
    } catch (error) {
      console.error("CSV download failed", error);
      window.alert(error.message || "다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleMapRegionEnter = (regionName) => {
    if (mapView === "national") setHoveredRegion(regionName);
    else setHoveredMunicipality(regionName);
  };

  const handleMapRegionLeave = () => {
    if (mapView === "national") setHoveredRegion(null);
    else setHoveredMunicipality(null);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDownload={handleDownload}
      />

      <div className="main-area">
        <DashboardHeader
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          isLoading={isLoading}
          hasError={hasError}
          csvLastModified={CSV_LAST_MODIFIED}
        />

        <main className="content-wrapper">
          {activeTab === "analysis" ? (
            <AnalysisView
              currentMapData={currentMapData}
              mapView={mapView}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              selectedProvCode={selectedProvCode}
              onProvinceClick={handleProvinceClick}
              onResetMap={handleResetMap}
            />
          ) : (
            <DashboardView
              selectedYear={selectedYear}
              scopeName={mapView === "national" ? "전국" : selectedRegion}
              displayTotals={displayTotals}
              mapView={mapView}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              selectedProvCode={selectedProvCode}
              selectedMunicipality={selectedMunicipality}
              mapData={dashboardMapData}
              metric={currentMetric}
              metrics={METRICS}
              selectedMetricIndex={selectedMetricIndex}
              onMetricSelect={setSelectedMetricIndex}
              onProvinceClick={handleProvinceClick}
              onMunicipalityClick={handleMunicipalityClick}
              onResetMap={handleResetMap}
              onRegionEnter={handleMapRegionEnter}
              onRegionLeave={handleMapRegionLeave}
              topRegions={topRegions}
              targetName={targetName}
              displayData={displayData}
              insightText={insightText}
              isInsightLoading={isInsightLoading}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
