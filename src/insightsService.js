/**
 * CSV의 한 줄을 배열로 파싱하는 함수입니다. 
 * 따옴표로 감싸진 필드 안의 쉼표를 무시하고 정상적으로 분리합니다.
 */
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes; 
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim()); 
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  // 값을 감싸고 있는 겉 따옴표 제거
  return result.map(v => {
    if (v.startsWith('"') && v.endsWith('"')) {
      return v.slice(1, -1);
    }
    return v;
  });
};

let cachedInsights = null;

export const fetchAnalysisInsights = async (baseUrl) => {
  if (cachedInsights) return cachedInsights;

  try {
    // public/data 경로에 있는 지역별_분석_인사이트.csv 파일을 가져옵니다.
    const res = await fetch(`${baseUrl}/data/지역별_분석_인사이트.csv`);
    if (!res.ok) {
      console.warn("지역별_분석_인사이트.csv 파일을 찾을 수 없습니다.");
      return {};
    }
    
    const buffer = await res.arrayBuffer();
    let decoder = new TextDecoder('utf-8');
    let csvText = decoder.decode(buffer);
    
    // 인코딩이 깨질 경우 EUC-KR로 재시도
    if (csvText.includes('\uFFFD')) {
      decoder = new TextDecoder('euc-kr');
      csvText = decoder.decode(buffer);
    }

    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return {};

    const headers = parseCSVLine(lines[0]);
    const keyIdx = headers.indexOf('lookup_key');
    const insightIdx = headers.indexOf('분석인사이트');

    if (keyIdx === -1 || insightIdx === -1) {
      console.warn("CSV 파일에 필요한 열(lookup_key, 분석인사이트)이 없습니다.");
      return {};
    }

    const insights = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length > Math.max(keyIdx, insightIdx)) {
        const key = cols[keyIdx];
        const text = cols[insightIdx];
        if (text && text !== 'NaN' && text !== '') {
          insights[key] = text;
        }
      }
    }

    cachedInsights = insights;
    return insights;
  } catch (error) {
    console.error("인사이트 CSV 파싱 오류:", error);
    return {};
  }
};