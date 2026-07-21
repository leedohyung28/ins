// Dashboard configuration kept in one place so data paths and map behavior
// can be changed without editing presentation components.

export const KOREA_PROVINCE_URL =
  "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json";

export const KOREA_MUNICIPALITY_URL =
  "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json";

export const NAME_MAPPING = {
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
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

// The original project uses "dague" for Daegu. Change only this value to
// "daegu" when the public/data folder follows the conventional spelling.
export const REGION_FOLDER_MAPPING = {
  서울: "seoul",
  인천: "incheon",
  부산: "busan",
  울산: "ulsan",
  대구: "dague",
  광주: "gwangju",
  대전: "dajeon",
  세종: "sejong",
  경기: "kyungki",
  강원: "gangwon",
  충북: "chungbuk",
  충남: "chungnam",
  전북: "jeonbuk",
  전남: "jeonnam",
  경북: "gyungbuk",
  경남: "gyungnam",
  제주: "jeju",
};

export const PROVINCE_MAP_CONFIG = {
  서울: { code: "11", center: [126.978, 37.5665], zoom: 18 },
  부산: { code: "21", center: [129.0756, 35.1795], zoom: 15 },
  대구: { code: "22", center: [128.6014, 35.8714], zoom: 15 },
  인천: { code: "23", center: [126.45, 37.4562], zoom: 12 },
  광주: { code: "24", center: [126.8526, 35.1595], zoom: 18 },
  대전: { code: "25", center: [127.3845, 36.3504], zoom: 18 },
  울산: { code: "26", center: [129.3113, 35.5383], zoom: 16 },
  세종: { code: "29", center: [127.289, 36.48], zoom: 20 },
  경기: { code: "31", center: [127.2693, 37.5], zoom: 6.5 },
  강원: { code: "32", center: [128.2093, 37.8228], zoom: 5 },
  충북: { code: "33", center: [127.9259, 36.6358], zoom: 7 },
  충남: { code: "34", center: [126.8, 36.5184], zoom: 7 },
  전북: { code: "35", center: [127.153, 35.7175], zoom: 7 },
  전남: { code: "36", center: [126.991, 34.816], zoom: 6 },
  경북: { code: "37", center: [128.8889, 36.4919], zoom: 5 },
  경남: { code: "38", center: [128.25, 35.2382], zoom: 6 },
  제주: { code: "39", center: [126.5311, 33.3996], zoom: 10 },
};

export const DEFAULT_MAP = {
  center: [127.5, 36],
  zoom: 1.5,
};

export const METRICS = [
  { id: "damage", label: "우심피해액(원)", unit: "원" },
  { id: "population", label: "인구수(명)", unit: "명" },
  { id: "sub_rate_z", label: "가입률(Z값)", unit: "" },
  { id: "sub_rate_percent", label: "가입률(%)", unit: "%" },
  { id: "target_housing", label: "대상가구(건)", unit: "건" },
  { id: "sub_housing", label: "가입가구(건)", unit: "건" },
];

export const CALCULATION_OPTIONS = [
  { id: "damage", label: "우심피해액(원)" },
  { id: "population", label: "인구수(명)" },
  { id: "target_housing", label: "대상가구(건)" },
  { id: "sub_housing", label: "가입가구(건)" },
];

export const YEARS_TO_PROBE = [2022, 2023, 2024, 2025, 2026, 2027, 2028];

export const CSV_LAST_MODIFIED = "2026-07-20 23:59:59";

export const EMPTY_TOTALS = {
  target_housing: null,
  sub_housing: null,
  sub_rate_z: null,
  sub_rate_percent: null,
  population: null,
  damage: null,
};

export const EMPTY_DATASET = {
  totals: EMPTY_TOTALS,
  dataMap: {},
};
