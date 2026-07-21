import { REGION_FOLDER_MAPPING } from "../config";
import { decodeCsvBuffer, parseCsv } from "../utils/csv";

export const getBaseUrl = () => process.env.PUBLIC_URL || "";

export const getNationalDataUrl = (year, baseUrl = getBaseUrl()) =>
  `${baseUrl}/data/top/${year}data.csv`;

export const getMunicipalDataUrl = (region, year, baseUrl = getBaseUrl()) => {
  const folder = REGION_FOLDER_MAPPING[region];
  return folder ? `${baseUrl}/data/${folder}/${year}data.csv` : null;
};

const isHtmlResponse = (response, text = "") => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/html") || text.trim().startsWith("<");
};

export const fetchCsvData = async (url, signal) => {
  if (!url) return null;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const csvText = decodeCsvBuffer(arrayBuffer);
    if (isHtmlResponse(response, csvText)) return null;

    return parseCsv(csvText);
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(`CSV load failed: ${url}`, error);
    }
    return null;
  }
};

export const downloadCsvFile = async ({
  url,
  fileName,
  missingMessage = "해당 년도의 데이터가 존재하지 않습니다.",
}) => {
  if (!url) throw new Error(missingMessage);

  const response = await fetch(url);
  if (!response.ok) throw new Error(missingMessage);

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) throw new Error(missingMessage);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
