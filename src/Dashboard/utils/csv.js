import { EMPTY_TOTALS } from "../config";

const HEADER_CANDIDATES = {
  target_housing: ["대상가구", "대상주택", "가입대상"],
  sub_housing: ["가입가구", "가입주택"],
  sub_rate_z: ["가입률Z값", "가입률(Z값)", "Z값"],
  sub_rate_percent: ["가입률퍼센트", "가입률(%)", "가입률"],
  population: ["인구수"],
  damage: ["우심피해액", "피해액"],
};

export const parseNumericValue = (value) => {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();
  if (!normalized || normalized === "NaN" || normalized === "-") return null;

  const parsed = Number.parseFloat(normalized.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      // RFC 4180-style escaped quote inside a quoted field.
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
};

const findHeaderIndex = (headers, candidates, fallbackIndex) => {
  const normalizedHeaders = headers.map((header) => header.replace(/\s/g, ""));

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.replace(/\s/g, "");
    const index = normalizedHeaders.findIndex((header) =>
      header.includes(normalizedCandidate),
    );
    if (index !== -1) return index;
  }

  return fallbackIndex;
};

export const parseCsv = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const headers = parseCsvLine(lines[0]);
  const indexes = {
    target_housing: findHeaderIndex(
      headers,
      HEADER_CANDIDATES.target_housing,
      1,
    ),
    sub_housing: findHeaderIndex(headers, HEADER_CANDIDATES.sub_housing, 1),
    sub_rate_z: findHeaderIndex(headers, HEADER_CANDIDATES.sub_rate_z, 2),
    sub_rate_percent: findHeaderIndex(
      headers,
      HEADER_CANDIDATES.sub_rate_percent,
      3,
    ),
    population: findHeaderIndex(headers, HEADER_CANDIDATES.population, 6),
    damage: findHeaderIndex(headers, HEADER_CANDIDATES.damage, 7),
  };

  let totals = { ...EMPTY_TOTALS };
  const dataMap = {};

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const columns = parseCsvLine(lines[rowIndex]);
    if (columns.length < 5) continue;

    const regionName = (columns[0] || "").replace(/\s/g, "");
    if (
      !regionName ||
      regionName === "0" ||
      regionName === "NaN" ||
      regionName.includes("주택")
    ) {
      continue;
    }

    const row = Object.fromEntries(
      Object.entries(indexes).map(([metricId, columnIndex]) => [
        metricId,
        parseNumericValue(columns[columnIndex]),
      ]),
    );

    if (regionName === "합계") {
      totals = row;
      continue;
    }

    if (regionName === "평균" || regionName === "표준편차") continue;
    dataMap[regionName] = row;
  }

  return { totals, dataMap };
};

export const decodeCsvBuffer = (arrayBuffer) => {
  let decoded = new TextDecoder("utf-8").decode(arrayBuffer);

  if (decoded.includes("\uFFFD")) {
    try {
      decoded = new TextDecoder("euc-kr").decode(arrayBuffer);
    } catch {
      // Keep the UTF-8 result when the runtime does not provide EUC-KR.
    }
  }

  return decoded;
};
