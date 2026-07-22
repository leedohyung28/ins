import { decodeCsvBuffer } from "../utils/csv";
import {
  normalizeInsightsJson,
  parseInsightsCsv,
} from "../utils/insights";

// The user-provided analysis_insights.csv is the primary source.
const DEFAULT_CANDIDATES = [
  "/data/analysis_insights.csv",
  "/data/analysis_insights.json",
  "/data/insights.csv",
  "/data/insights.json",
];

const joinBaseUrl = (baseUrl, candidatePath) => {
  const normalizedBase = String(baseUrl || "").replace(/\/$/, "");
  const normalizedPath = String(candidatePath || "").startsWith("/")
    ? candidatePath
    : `/${candidatePath}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const fetchAnalysisInsights = async (
  baseUrl = "",
  candidatePaths = DEFAULT_CANDIDATES,
) => {
  for (const candidatePath of candidatePaths) {
    const url = joinBaseUrl(baseUrl, candidatePath);

    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) continue;

      if (
        contentType.includes("application/json") ||
        candidatePath.toLowerCase().endsWith(".json")
      ) {
        const dictionary = normalizeInsightsJson(await response.json());
        if (Object.keys(dictionary).length > 0) return dictionary;
        continue;
      }

      const buffer = await response.arrayBuffer();
      const dictionary = parseInsightsCsv(decodeCsvBuffer(buffer));
      if (Object.keys(dictionary).length > 0) return dictionary;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[insights] Failed to load ${url}`, error);
      }
    }
  }

  return {};
};
