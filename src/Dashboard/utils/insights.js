import { parseCsvLine } from "./csv";

const PROVINCE_NAME_MAPPING = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원도: "강원",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

// Dashboard metric IDs and analysis_insights.csv metric IDs are not identical.
// The first existing candidate is used, so future CSVs can add the dashboard ID
// directly without changing this code.
const DASHBOARD_METRIC_CANDIDATES = {
  damage: ["damage"],
  population: ["population"],
  target_housing: ["housingTarget", "housing"],
  sub_housing: ["housing"],
  sub_rate_percent: ["housingRate", "housing"],
  sub_rate_z: ["housingZ", "housingRate", "housing"],
};

const MUNICIPALITY_ALIASES = {
  "인천|남구": ["미추홀구"],
  "인천|미추홀구": ["남구"],
  "경기|여주군": ["여주시"],
  "경기|여주시": ["여주군"],
  "세종|세종시": ["세종특별자치시"],
  "세종|세종특별자치시": ["세종시"],
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const cleanText = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

const compactText = (value) => cleanText(value).replace(/\s+/g, "");

const normalizeHeader = (header) => compactText(header);

export const normalizeRegionLevel = (value) => {
  const normalized = compactText(value).toLowerCase();

  if (["전국", "national", "country"].includes(normalized)) return "전국";
  if (["시도", "province", "sido"].includes(normalized)) return "시도";
  if (
    ["시군구", "municipality", "municipal", "sigungu"].includes(normalized)
  ) {
    return "시군구";
  }

  return cleanText(value);
};

export const normalizeSidoName = (value) => {
  const normalized = compactText(value).replace(/전체$/, "");
  return PROVINCE_NAME_MAPPING[normalized] || normalized;
};

export const normalizeRegionName = (value, regionLevel = "") => {
  const normalizedLevel = normalizeRegionLevel(regionLevel);
  let normalized = compactText(value).replace(/전체$/, "");

  if (normalizedLevel === "전국" || normalized === "전국") return "전국";

  // Remove a full province prefix when a map source supplies names such as
  // "서울특별시 종로구" instead of "종로구".
  Object.keys(PROVINCE_NAME_MAPPING).forEach((fullName) => {
    if (normalized.startsWith(fullName) && normalized.length > fullName.length) {
      normalized = normalized.slice(fullName.length);
    }
  });

  if (normalizedLevel === "시도") return normalizeSidoName(normalized);
  return normalized;
};

export const buildInsightKey = ({
  year,
  regionLevel,
  sido = "",
  regionName,
  indicatorId = "overall",
}) => {
  const normalizedLevel = normalizeRegionLevel(regionLevel);
  const normalizedYear = cleanText(year);
  const normalizedSido =
    normalizedLevel === "전국" ? "" : normalizeSidoName(sido);
  const normalizedRegion = normalizeRegionName(regionName, normalizedLevel);
  const normalizedIndicator = cleanText(indicatorId) || "overall";

  if (!normalizedYear || !normalizedLevel || !normalizedRegion) return "";
  if (normalizedLevel !== "전국" && !normalizedSido) return "";

  return [
    normalizedYear,
    normalizedLevel,
    normalizedSido,
    normalizedRegion,
    normalizedIndicator,
  ].join("|");
};

export const normalizeInsightKey = (lookupKey) => {
  const rawKey = cleanText(lookupKey);
  if (!rawKey) return "";

  const parts = rawKey.split("|");
  if (parts.length < 5) return rawKey;

  const [year, regionLevel, sido, regionName, ...indicatorParts] = parts;
  return buildInsightKey({
    year,
    regionLevel,
    sido,
    regionName,
    indicatorId: indicatorParts.join("|") || "overall",
  });
};

const getRowValue = (row, candidates) => {
  for (const candidate of candidates) {
    const value = row[normalizeHeader(candidate)];
    if (cleanText(value)) return cleanText(value);
  }
  return "";
};

export const buildInsightDictionaryFromRows = (rows) => {
  const dictionary = {};

  rows.forEach((rawRow) => {
    const row = Object.fromEntries(
      Object.entries(rawRow || {}).map(([key, value]) => [
        normalizeHeader(key),
        value,
      ]),
    );

    const insight = getRowValue(row, [
      "분석인사이트",
      "insight",
      "인사이트",
      "text",
      "내용",
    ]);
    if (!insight) return;

    const rawLookupKey = getRowValue(row, [
      "lookup_key",
      "lookupKey",
      "조회키",
    ]);
    const normalizedLookupKey = normalizeInsightKey(rawLookupKey);
    if (normalizedLookupKey) dictionary[normalizedLookupKey] = insight;

    const year = getRowValue(row, ["year", "연도"]);
    const regionLevel = getRowValue(row, [
      "regionLevel",
      "지역단계",
      "지역레벨",
      "지역구분",
    ]);
    const sido = getRowValue(row, ["sido", "시도"]);
    const regionName = getRowValue(row, [
      "regionName",
      "지역명",
      "시군구",
    ]);
    const indicatorId =
      getRowValue(row, ["indicatorId", "지표ID", "지표"]) || "overall";

    const generatedKey = buildInsightKey({
      year,
      regionLevel,
      sido,
      regionName: regionName || sido || "전국",
      indicatorId,
    });
    if (generatedKey) dictionary[generatedKey] = insight;
  });

  return dictionary;
};

// Splits CSV records while preserving line breaks inside quoted fields.
const splitCsvRecords = (csvText) => {
  const records = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (character === '"') {
      current += character;

      if (inQuotes && csvText[index + 1] === '"') {
        current += csvText[index + 1];
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && csvText[index + 1] === "\n") index += 1;
      if (current.trim()) records.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) records.push(current);
  return records;
};

export const parseInsightsCsv = (csvText) => {
  const records = splitCsvRecords(cleanText(csvText));
  if (records.length < 2) return {};

  const headers = parseCsvLine(records[0]).map(normalizeHeader);
  const rows = records.slice(1).map((record) => {
    const values = parseCsvLine(record);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });

  return buildInsightDictionaryFromRows(rows);
};

export const normalizeInsightsJson = (payload) => {
  if (!payload) return {};
  if (Array.isArray(payload)) return buildInsightDictionaryFromRows(payload);
  if (Array.isArray(payload.insights)) {
    return buildInsightDictionaryFromRows(payload.insights);
  }

  if (typeof payload !== "object") return {};

  const dictionary = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === "string") {
      const normalizedKey = normalizeInsightKey(key);
      if (normalizedKey && cleanText(value)) {
        dictionary[normalizedKey] = cleanText(value);
      }
      return;
    }

    if (value && typeof value === "object") {
      Object.assign(
        dictionary,
        buildInsightDictionaryFromRows([{ lookup_key: key, ...value }]),
      );
    }
  });

  return dictionary;
};

export const getMetricCandidates = (metricId) =>
  unique([metricId, ...(DASHBOARD_METRIC_CANDIDATES[metricId] || [])]);

export const getRegionNameCandidates = ({ sido, regionName, regionLevel }) => {
  const normalizedSido = normalizeSidoName(sido);
  const normalizedRegion = normalizeRegionName(regionName, regionLevel);
  const candidates = [normalizedRegion];

  const aliases = MUNICIPALITY_ALIASES[`${normalizedSido}|${normalizedRegion}`];
  if (aliases) candidates.push(...aliases);

  // Some map datasets expose autonomous-gu names as "수원시장안구" while
  // the analytical CSV aggregates them as "수원시". Try the parent city too.
  const parentCityMatch = normalizedRegion.match(/^(.+?시).+구$/);
  if (parentCityMatch) candidates.push(parentCityMatch[1]);

  return unique(candidates.map((name) => normalizeRegionName(name, regionLevel)));
};

const findInsight = ({
  dictionary,
  year,
  regionLevel,
  sido,
  regionNames,
  indicatorIds,
}) => {
  for (const regionName of regionNames) {
    for (const indicatorId of indicatorIds) {
      const key = buildInsightKey({
        year,
        regionLevel,
        sido,
        regionName,
        indicatorId,
      });
      const text = dictionary[key];
      if (text) return { text, key };
    }
  }

  return null;
};

export const resolveInsight = ({
  dictionary,
  selectedYear,
  mapView,
  selectedRegion,
  targetName,
  metricId,
}) => {
  if (!selectedYear || !targetName) {
    return {
      text: "선택 가능한 데이터가 없습니다.",
      source: "empty-selection",
      matchedKey: "",
    };
  }

  const normalizedSelectedRegion = normalizeSidoName(selectedRegion);
  const normalizedTargetAsProvince = normalizeRegionName(targetName, "시도");
  const isNationalSummary = normalizedTargetAsProvince === "전국";
  const isProvinceSummary =
    mapView === "province" &&
    normalizedTargetAsProvince === normalizedSelectedRegion;

  const regionLevel = isNationalSummary
    ? "전국"
    : mapView === "national" || isProvinceSummary
      ? "시도"
      : "시군구";
  const sido =
    regionLevel === "전국"
      ? ""
      : mapView === "national"
        ? normalizeSidoName(targetName)
        : normalizedSelectedRegion;
  const regionName =
    regionLevel === "전국"
      ? "전국"
      : isProvinceSummary
        ? normalizedSelectedRegion
        : normalizeRegionName(targetName, regionLevel);

  const regionNames = getRegionNameCandidates({
    sido,
    regionName,
    regionLevel,
  });
  const metricCandidates = getMetricCandidates(metricId);

  const exactMetric = findInsight({
    dictionary,
    year: selectedYear,
    regionLevel,
    sido,
    regionNames,
    indicatorIds: metricCandidates,
  });
  if (exactMetric) {
    return {
      text: exactMetric.text,
      source: "exact-metric",
      matchedKey: exactMetric.key,
    };
  }

  if (regionLevel === "시군구") {
    const parentMetric = findInsight({
      dictionary,
      year: selectedYear,
      regionLevel: "시도",
      sido,
      regionNames: [sido],
      indicatorIds: metricCandidates,
    });
    if (parentMetric) {
      return {
        text: parentMetric.text,
        source: "parent-metric",
        matchedKey: parentMetric.key,
      };
    }
  }

  const exactOverall = findInsight({
    dictionary,
    year: selectedYear,
    regionLevel,
    sido,
    regionNames,
    indicatorIds: ["overall"],
  });
  if (exactOverall) {
    return {
      text: exactOverall.text,
      source: "exact-overall",
      matchedKey: exactOverall.key,
    };
  }

  if (regionLevel === "시군구") {
    const parentOverall = findInsight({
      dictionary,
      year: selectedYear,
      regionLevel: "시도",
      sido,
      regionNames: [sido],
      indicatorIds: ["overall"],
    });
    if (parentOverall) {
      return {
        text: parentOverall.text,
        source: "parent-overall",
        matchedKey: parentOverall.key,
      };
    }
  }

  const nationalMetric = findInsight({
    dictionary,
    year: selectedYear,
    regionLevel: "전국",
    sido: "",
    regionNames: ["전국"],
    indicatorIds: metricCandidates,
  });
  if (nationalMetric) {
    return {
      text: nationalMetric.text,
      source: "national-metric",
      matchedKey: nationalMetric.key,
    };
  }

  const nationalOverall = findInsight({
    dictionary,
    year: selectedYear,
    regionLevel: "전국",
    sido: "",
    regionNames: ["전국"],
    indicatorIds: ["overall"],
  });
  if (nationalOverall) {
    return {
      text: nationalOverall.text,
      source: "national-overall",
      matchedKey: nationalOverall.key,
    };
  }

  return {
    text: `${selectedYear}년 ${targetName}의 분석 인사이트가 analysis_insights.csv에 없습니다. lookup_key와 지역명을 확인해 주세요.`,
    source: "not-found",
    matchedKey: "",
  };
};
