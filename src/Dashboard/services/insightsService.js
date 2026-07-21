import { decodeCsvBuffer, parseCsvLine } from "../utils/csv";

const DEFAULT_CANDIDATES = [
  "/data/analysis_insights.json",
  "/data/analysis_insights.csv",
  "/data/insights.json",
  "/data/insights.csv",
];

const buildDictionaryFromRows = (rows) => {
  const dictionary = {};

  rows.forEach((row) => {
    const year = row.year ?? row.연도;
    const regionLevel = row.regionLevel ?? row.지역레벨 ?? row.지역구분;
    const sido = row.sido ?? row.시도;
    const regionName = row.regionName ?? row.지역명 ?? row.시군구 ?? sido;
    const indicatorId = row.indicatorId ?? row.지표ID ?? row.지표 ?? "overall";
    const insight = row.insight ?? row.인사이트 ?? row.text ?? row.내용;

    if (!year || !regionLevel || !sido || !regionName || !insight) return;
    dictionary[`${year}|${regionLevel}|${sido}|${regionName}|${indicatorId}`] =
      insight;
  });

  return dictionary;
};

const parseInsightsCsv = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return {};

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });

  return buildDictionaryFromRows(rows);
};

const normalizeJson = (payload) => {
  if (!payload) return {};
  if (Array.isArray(payload)) return buildDictionaryFromRows(payload);
  if (payload.insights && Array.isArray(payload.insights)) {
    return buildDictionaryFromRows(payload.insights);
  }
  return typeof payload === "object" ? payload : {};
};

export const fetchAnalysisInsights = async (
  baseUrl = "",
  candidatePaths = DEFAULT_CANDIDATES,
) => {
  for (const candidatePath of candidatePaths) {
    const url = `${baseUrl}${candidatePath}`;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      if (
        contentType.includes("application/json") ||
        candidatePath.endsWith(".json")
      ) {
        const json = await response.json();
        const dictionary = normalizeJson(json);
        if (Object.keys(dictionary).length > 0) return dictionary;
        continue;
      }

      const buffer = await response.arrayBuffer();
      const dictionary = parseInsightsCsv(decodeCsvBuffer(buffer));
      if (Object.keys(dictionary).length > 0) return dictionary;
    } catch {
      // Try the next configured path. The dashboard has a local fallback text.
    }
  }

  return {};
};
