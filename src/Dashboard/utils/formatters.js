export const hasValue = (value) =>
  value !== null && value !== undefined && value !== "-";

export const formatNumber = (value, fallback = "-") =>
  hasValue(value) && Number.isFinite(Number(value))
    ? Number(value).toLocaleString()
    : fallback;

export const formatMetricValue = (metricId, value, fallback = "-") => {
  if (!hasValue(value) || !Number.isFinite(Number(value))) return fallback;

  if (metricId === "sub_rate_percent") {
    return `${(Number(value) * 100).toFixed(2)}%`;
  }

  return Number(value).toLocaleString();
};
