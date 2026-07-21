import { useEffect, useMemo, useState } from "react";
import { EMPTY_DATASET, YEARS_TO_PROBE } from "../config";
import {
  fetchCsvData,
  getMunicipalDataUrl,
  getNationalDataUrl,
} from "../services/dashboardDataService";

export const useDashboardData = ({ mapView, selectedRegion }) => {
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [nationalDataCache, setNationalDataCache] = useState({});
  const [municipalDataCache, setMunicipalDataCache] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const probeYears = async () => {
      setIsLoading(true);
      setHasError(false);

      const results = await Promise.all(
        YEARS_TO_PROBE.map(async (year) => ({
          year,
          data: await fetchCsvData(getNationalDataUrl(year), controller.signal),
        })),
      );

      if (!isMounted) return;

      const validEntries = results.filter(
        ({ data }) => data && Object.keys(data.dataMap).length > 0,
      );

      if (validEntries.length === 0) {
        setAvailableYears([]);
        setSelectedYear(null);
        setHasError(true);
        setIsLoading(false);
        return;
      }

      const cache = Object.fromEntries(
        validEntries.map(({ year, data }) => [year, data]),
      );
      const years = validEntries.map(({ year }) => year).sort((a, b) => a - b);

      setNationalDataCache(cache);
      setAvailableYears(years);
      setSelectedYear(years[years.length - 1]);
      setIsLoading(false);
    };

    probeYears();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedYear || nationalDataCache[selectedYear]) return undefined;

    const controller = new AbortController();
    fetchCsvData(getNationalDataUrl(selectedYear), controller.signal).then(
      (data) => {
        if (data && Object.keys(data.dataMap).length > 0) {
          setNationalDataCache((previous) => ({
            ...previous,
            [selectedYear]: data,
          }));
        }
      },
    );

    return () => controller.abort();
  }, [selectedYear, nationalDataCache]);

  useEffect(() => {
    if (mapView !== "province" || !selectedRegion || !selectedYear) {
      return undefined;
    }

    const url = getMunicipalDataUrl(selectedRegion, selectedYear);
    if (!url) return undefined;

    const cacheKey = `${selectedRegion}_${selectedYear}`;
    if (Object.prototype.hasOwnProperty.call(municipalDataCache, cacheKey)) {
      return undefined;
    }

    const controller = new AbortController();
    fetchCsvData(url, controller.signal).then((data) => {
      setMunicipalDataCache((previous) => ({
        ...previous,
        [cacheKey]: data || EMPTY_DATASET,
      }));
    });

    return () => controller.abort();
  }, [mapView, selectedRegion, selectedYear, municipalDataCache]);

  const currentNational = useMemo(
    () => nationalDataCache[selectedYear] || EMPTY_DATASET,
    [nationalDataCache, selectedYear],
  );

  const currentMunicipal = useMemo(() => {
    const key = `${selectedRegion}_${selectedYear}`;
    return municipalDataCache[key] || EMPTY_DATASET;
  }, [municipalDataCache, selectedRegion, selectedYear]);

  return {
    availableYears,
    selectedYear,
    setSelectedYear,
    nationalDataCache,
    currentNational,
    currentMunicipal,
    isLoading,
    hasError,
  };
};
