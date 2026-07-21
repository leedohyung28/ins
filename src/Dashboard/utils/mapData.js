import { getGradientColor, getTenStepColors, isReverseMetric } from "./colors";

const NO_DATA_COLOR = "#94A3B8";
const FILTERED_OUT_COLOR = "#E2E8F0";
const MID_COLOR = "#EAB308";

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const getMetricRange = (dataMap, metricId) => {
  if (metricId === "sub_rate_percent") {
    return { min: 0, max: 1 };
  }

  const values = Object.values(dataMap)
    .map((row) => row?.[metricId])
    .filter(
      (value) =>
        value !== null && value !== undefined && Number.isFinite(value),
    );

  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
};

export const processMapData = (
  currentMapData,
  metricId,
  checkedRanges = [],
) => {
  const { min, max } = getMetricRange(currentMapData, metricId);
  const reverse = isReverseMetric(metricId);
  const stepColors = getTenStepColors(metricId);
  const processedData = {};
  const filteredRegions = [];

  Object.entries(currentMapData).forEach(([regionName, row]) => {
    const value = row?.[metricId];
    const hasMetric =
      value !== null && value !== undefined && Number.isFinite(value);
    const ratio =
      hasMetric && min !== max ? clamp((value - min) / (max - min)) : 0;

    let color = NO_DATA_COLOR;
    if (hasMetric) {
      if (checkedRanges.length === 0) {
        color = min === max ? MID_COLOR : getGradientColor(ratio, reverse);
      } else {
        const rangeIndex = Math.min(9, Math.floor(ratio * 10));
        color = checkedRanges.includes(rangeIndex)
          ? stepColors[rangeIndex]
          : FILTERED_OUT_COLOR;

        if (checkedRanges.includes(rangeIndex)) {
          filteredRegions.push({ name: regionName, value });
        }
      }
    }

    processedData[regionName] = {
      ...row,
      color,
      displayValue: hasMetric ? value : "-",
      ratio,
    };
  });

  return { processedData, min, max, filteredRegions };
};

export const processRatioMapData = (
  currentMapData,
  numeratorId,
  denominatorId,
) => {
  const valuesByRegion = {};
  const numericValues = [];

  Object.entries(currentMapData).forEach(([regionName, row]) => {
    const numerator = row?.[numeratorId];
    const denominator = row?.[denominatorId];
    const isValid =
      numerator !== null &&
      numerator !== undefined &&
      denominator !== null &&
      denominator !== undefined &&
      Number.isFinite(numerator) &&
      Number.isFinite(denominator) &&
      denominator !== 0;

    const value = isValid ? numerator / denominator : null;
    valuesByRegion[regionName] = value;
    if (value !== null) numericValues.push(value);
  });

  const min = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const max = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  const processedData = {};

  Object.entries(currentMapData).forEach(([regionName, row]) => {
    const value = valuesByRegion[regionName];
    const ratio =
      value !== null && min !== max ? clamp((value - min) / (max - min)) : 0;

    processedData[regionName] = {
      ...row,
      color:
        value === null
          ? NO_DATA_COLOR
          : min === max
            ? MID_COLOR
            : getGradientColor(ratio),
      displayValue: value === null ? "-" : value,
      ratio,
    };
  });

  return { processedData, min, max };
};

export const getTopRegions = (processedData, metricId, limit = 5) =>
  Object.entries(processedData)
    .filter(([, row]) => {
      const value = row?.[metricId];
      return value !== null && value !== undefined && Number.isFinite(value);
    })
    .sort(([, first], [, second]) => second[metricId] - first[metricId])
    .slice(0, limit);

export const fillTotalsFromParent = ({ totals, mapView, parentRegionData }) => {
  if (mapView !== "province" || !parentRegionData) return totals;

  return {
    ...totals,
    sub_housing: totals.sub_housing ?? parentRegionData.sub_housing,
    population: totals.population ?? parentRegionData.population,
    damage: totals.damage ?? parentRegionData.damage,
  };
};
