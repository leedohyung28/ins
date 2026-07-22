import { useEffect, useMemo, useState } from "react";
import { fetchAnalysisInsights } from "../services/insightsService";
import { getBaseUrl } from "../services/dashboardDataService";
import { resolveInsight } from "../utils/insights";

export const useInsights = ({
  active,
  selectedYear,
  mapView,
  selectedRegion,
  targetName,
  metricId,
}) => {
  const [dictionary, setDictionary] = useState({});
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(true);
  const [insightText, setInsightText] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setIsDictionaryLoading(true);
    fetchAnalysisInsights(getBaseUrl())
      .then((data) => {
        if (isMounted) setDictionary(data);
      })
      .finally(() => {
        if (isMounted) setIsDictionaryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedInsight = useMemo(
    () =>
      resolveInsight({
        dictionary,
        selectedYear,
        mapView,
        selectedRegion,
        targetName,
        metricId,
      }),
    [dictionary, mapView, metricId, selectedRegion, selectedYear, targetName],
  );

  useEffect(() => {
    if (!active) return undefined;

    if (isDictionaryLoading) {
      setIsInsightLoading(true);
      return undefined;
    }

    setIsInsightLoading(true);
    const timer = window.setTimeout(() => {
      setInsightText(resolvedInsight.text);
      setIsInsightLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [active, isDictionaryLoading, resolvedInsight.text]);

  return {
    insightText,
    isInsightLoading: isDictionaryLoading || isInsightLoading,
    insightSource: resolvedInsight.source,
    matchedInsightKey: resolvedInsight.matchedKey,
  };
};
