export const BASE_GRADIENT_STOPS = [
  "#15803D",
  "#84CC16",
  "#EAB308",
  "#F97316",
  "#EF4444",
];

export const TEN_STEP_GRADIENT = [
  "#15803D",
  "#22C55E",
  "#84CC16",
  "#D9F99D",
  "#FEF08A",
  "#EAB308",
  "#F97316",
  "#EA580C",
  "#EF4444",
  "#B91C1C",
];

const interpolateColor = (firstColor, secondColor, factor) => {
  const first = firstColor.replace("#", "");
  const second = secondColor.replace("#", "");

  const firstRgb = [0, 2, 4].map((start) =>
    Number.parseInt(first.substring(start, start + 2), 16),
  );
  const secondRgb = [0, 2, 4].map((start) =>
    Number.parseInt(second.substring(start, start + 2), 16),
  );

  const [red, green, blue] = firstRgb.map((channel, index) =>
    Math.round(channel + factor * (secondRgb[index] - channel)),
  );

  return `#${((1 << 24) + (red << 16) + (green << 8) + blue)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
};

export const isReverseMetric = (metricId) =>
  metricId === "sub_rate_z" || metricId === "sub_rate_percent";

export const getGradientColor = (ratio, isReverse = false) => {
  const stops = isReverse
    ? [...BASE_GRADIENT_STOPS].reverse()
    : BASE_GRADIENT_STOPS;

  if (!Number.isFinite(ratio) || ratio <= 0) return stops[0];
  if (ratio >= 1) return stops[stops.length - 1];

  const scaled = ratio * (stops.length - 1);
  const index = Math.floor(scaled);
  const factor = scaled - index;
  return interpolateColor(stops[index], stops[index + 1], factor);
};

export const getTenStepColors = (metricId) =>
  isReverseMetric(metricId)
    ? [...TEN_STEP_GRADIENT].reverse()
    : TEN_STEP_GRADIENT;
