import { useEffect, useMemo, useState } from "react";
import { fetchAnalysisInsights } from "../services/insightsService";
import { getBaseUrl } from "../services/dashboardDataService";

export const useInsights = ({
  active,
  selectedYear,
  mapView,
  selectedRegion,
  targetName,
  metricId,
}) => {
  const [dictionary, setDictionary] = useState({});
  const [insightText, setInsightText] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchAnalysisInsights(getBaseUrl()).then((data) => {
      if (isMounted) setDictionary(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentInsight = useMemo(() => {
    if (!selectedYear || !targetName) {
      return "선택 가능한 데이터가 없습니다.";
    }

    const isProvinceSummary =
      mapView === "province" && targetName === `${selectedRegion} 전체`;
    const regionLevel =
      mapView === "national" || isProvinceSummary ? "시도" : "시군구";
    const sido = mapView === "national" ? targetName : selectedRegion;
    const regionName = isProvinceSummary ? selectedRegion : targetName;
    const lookupKey = `${selectedYear}|${regionLevel}|${sido}|${regionName}|${metricId}`;
    const defaultKey = `${selectedYear}|${regionLevel}|${sido}|${regionName}|overall`;

    const fallback = `선택하신 ${targetName}의 ${selectedYear}년 기준 상세 지표 현황입니다. 지도 아래의 지표 선택기를 이용해 분포와 순위를 비교할 수 있습니다.`;

    return dictionary[lookupKey] || dictionary[defaultKey] || fallback;
  }, [dictionary, mapView, metricId, selectedRegion, selectedYear, targetName]);

  useEffect(() => {
    if (!active) return undefined;

    setIsInsightLoading(true);
    const timer = window.setTimeout(() => {
      setInsightText(currentInsight);
      setIsInsightLoading(false);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [active, currentInsight]);

  return { insightText, isInsightLoading };
};
