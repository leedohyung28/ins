import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import './Dashboard.css';

// 통계청 기준 대한민국 시도 및 시군구 GeoJSON
const KOREA_PROVINCE_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json";
const KOREA_MUNI_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json";

// GeoJSON의 정식 명칭을 축약 명칭과 매핑
const nameMapping = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
  '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원도': '강원', '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전라남도': '전남', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주'
};

// 폴더 경로명 매핑
const regionFolderMapping = {
  '서울': 'seoul', '인천': 'incheon', '부산': 'busan', '울산': 'ulsan', 
  '대구': 'dague', '광주': 'gwangju', '대전': 'dajeon', '세종': 'sejong', 
  '경기': 'kyungki', '강원': 'kangwon', '충북': 'chungbuk', '충남': 'chungnam', 
  '전북': 'jeonbuk', '전남': 'jeonnam', '경북': 'kyungbuk', '경남': 'kyungnam', '제주': 'jeju'
};

const PROVINCE_MAP_CONFIG = {
  '서울': { code: '11', center: [126.9780, 37.5665], zoom: 18 },
  '부산': { code: '21', center: [129.0756, 35.1795], zoom: 15 },
  '대구': { code: '22', center: [128.6014, 35.8714], zoom: 15 },
  '인천': { code: '23', center: [126.45, 37.4562], zoom: 12 },
  '광주': { code: '24', center: [126.8526, 35.1595], zoom: 18 },
  '대전': { code: '25', center: [127.3845, 36.3504], zoom: 18 },
  '울산': { code: '26', center: [129.3113, 35.5383], zoom: 16 },
  '세종': { code: '29', center: [127.2890, 36.4800], zoom: 20 },
  '경기': { code: '31', center: [127.2693, 37.5], zoom: 6.5 },
  '강원': { code: '32', center: [128.2093, 37.8228], zoom: 5 },
  '충북': { code: '33', center: [127.9259, 36.6358], zoom: 7 },
  '충남': { code: '34', center: [126.8000, 36.5184], zoom: 7 },
  '전북': { code: '35', center: [127.1530, 35.7175], zoom: 7 },
  '전남': { code: '36', center: [126.9910, 34.8160], zoom: 6 },
  '경북': { code: '37', center: [128.8889, 36.4919], zoom: 5 },
  '경남': { code: '38', center: [128.2500, 35.2382], zoom: 6 },
  '제주': { code: '39', center: [126.5311, 33.3996], zoom: 10 }
};

const METRICS = [
  { id: 'housing', label: '주택(건)', unit: '건' },
  { id: 'housingZ', label: '주택(Z값)', unit: '' },
  { id: 'greenhouse', label: '온실(m²)', unit: 'm²' },
  { id: 'greenhouseZ', label: '온실(Z값)', unit: '' },
  { id: 'smallbiz', label: '소상공인(건)', unit: '건' },
  { id: 'population', label: '인구수(건)', unit: '명' },
];

const parseVal = (val) => {
  if (!val || val === '' || val === 'NaN' || val === '-') return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
};

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
  return result.map(v => v.replace(/,/g, ''));
};

const parseCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  const totalCols = parseCSVLine(lines[1]);
  const totals = {
    housing: parseVal(totalCols[1]),
    housingZ: parseVal(totalCols[2]),
    greenhouse: parseVal(totalCols[3]),
    greenhouseZ: parseVal(totalCols[4]),
    smallbiz: parseVal(totalCols[5]),
    population: parseVal(totalCols[6]),
  };

  const dataMap = {};
  for (let i = 2; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 7) continue;
    
    const regionName = cols[0].replace(/\s/g, '');
    if (!regionName || regionName === '평균' || regionName === '표준편차' || regionName === 'NaN') {
      break; 
    }
    
    dataMap[regionName] = {
      housing: parseVal(cols[1]),
      housingZ: parseVal(cols[2]),
      greenhouse: parseVal(cols[3]),
      greenhouseZ: parseVal(cols[4]),
      smallbiz: parseVal(cols[5]),
      population: parseVal(cols[6]),
    };
  }

  return { totals, dataMap };
};

// 두 헥스(Hex) 색상 간의 혼합을 계산하는 함수
const interpolateColor = (color1, color2, factor) => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
};

// 0~1 사이의 비율에 따라 다중 그라데이션 색상을 반환하는 함수
const getGradientColor = (ratio) => {
  // 매우 낮음(다크그린) -> 매우 높음(레드)
  const stops = ['#15803D', '#84CC16', '#EAB308', '#F97316', '#EF4444']; 
  if (ratio <= 0) return stops[0];
  if (ratio >= 1) return stops[stops.length - 1];
  
  const scaled = ratio * (stops.length - 1); // 0 ~ 4
  const index = Math.floor(scaled);          // 0, 1, 2, 3
  const factor = scaled - index;             // 소수점 (혼합 비율)
  
  return interpolateColor(stops[index], stops[index + 1], factor);
};

// 환경에 따른 안전한 베이스 URL 추출
const getBaseUrl = () => {
  return process.env.PUBLIC_URL || '';
};

const Dashboard = () => {
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(''); 
  
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [selectedMunicipality, setSelectedMunicipality] = useState(null); 

  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [hoveredMunicipality, setHoveredMunicipality] = useState(null);

  const [mapView, setMapView] = useState('national'); 
  const [mapCenter, setMapCenter] = useState([127.5, 36]);
  const [mapZoom, setMapZoom] = useState(1.5);
  const [selectedProvCode, setSelectedProvCode] = useState(null);

  const [nationalDataCache, setNationalDataCache] = useState({});
  const [municipalDataCache, setMunicipalDataCache] = useState({});

  const [selectedMetricIdx, setSelectedMetricIdx] = useState(0);
  const currentMetric = METRICS[selectedMetricIdx];

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchCSVData = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`파일을 찾을 수 없습니다 (상태코드 ${res.status}): ${url}`);
        return null;
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) return null;

      const buffer = await res.arrayBuffer();
      
      let decoder = new TextDecoder('utf-8');
      let csvText = decoder.decode(buffer);
      
      if (csvText.includes('\uFFFD')) {
        decoder = new TextDecoder('euc-kr');
        csvText = decoder.decode(buffer);
      }

      if (csvText.trim().startsWith('<')) return null;

      return parseCSV(csvText);
    } catch (e) {
      console.error(`데이터 페칭 에러 (${url}):`, e);
      return null;
    }
  };

  useEffect(() => {
    const probeAndLoadYears = async () => {
      setIsLoading(true);
      setHasError(false);

      const yearsToTry = [2022, 2023, 2024, 2025, 2026, 2027, 2028]; 
      const valid = [];
      const cacheUpdate = {};
      const baseUrl = getBaseUrl();

      for (const y of yearsToTry) {
        const result = await fetchCSVData(`${baseUrl}/data/top/${y}data.csv`);

        console.log(`[${y}년] 현재 요청 경로:`, result);

        if (result && Object.keys(result.dataMap).length > 0) {
          valid.push(y);
          cacheUpdate[y] = result;
        }
      }

      if (valid.length > 0) {
        setNationalDataCache(prev => ({ ...prev, ...cacheUpdate }));
        setAvailableYears(valid);
        setSelectedYear(valid[valid.length - 1]); 
      } else {
        setHasError(true);
        setAvailableYears([]);
      }
      setIsLoading(false);
    };
    probeAndLoadYears();
  }, []);

  useEffect(() => {
    if (mapView === 'province' && selectedRegion && selectedYear) {
      const engName = regionFolderMapping[selectedRegion];
      const cacheKey = `${engName}_${selectedYear}`;
      
      if (engName && !municipalDataCache[cacheKey]) {
        const baseUrl = getBaseUrl();
        fetchCSVData(`${baseUrl}/data/${engName}/${selectedYear}data.csv`).then(result => {
          setMunicipalDataCache(prev => ({ 
            ...prev, 
            [cacheKey]: result || { totals: {}, dataMap: {} } 
          }));
        });
      }
    }
  }, [mapView, selectedRegion, selectedYear, municipalDataCache]);

  const handleDownload = async () => {
    if (!selectedYear) {
      alert("선택된 년도 데이터가 없습니다.");
      return;
    }

    const baseUrl = getBaseUrl();
    let downloadUrl = '';
    let fileName = '';

    if (mapView === 'national') {
      downloadUrl = `${baseUrl}/data/top/${selectedYear}data.csv`;
      fileName = `전국_${selectedYear}년_데이터.csv`;
    } else {
      const engName = regionFolderMapping[selectedRegion];
      downloadUrl = `${baseUrl}/data/${engName}/${selectedYear}data.csv`;
      fileName = `${selectedRegion}_${selectedYear}년_데이터.csv`;
    }

    try {
      const res = await fetch(downloadUrl, { method: 'HEAD' });
      const contentType = res.headers.get('content-type');
      if (!res.ok || (contentType && contentType.includes('text/html'))) {
        alert("해당 년도의 지역 데이터가 존재하지 않습니다.");
        return;
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("다운로드 에러:", error);
      alert("다운로드 중 오류가 발생했습니다. 데이터가 존재하지 않을 수 있습니다.");
    }
  };

  const handleProvinceClick = (geo) => {
    const provNameFull = geo.properties.name;
    const shortName = nameMapping[provNameFull] || provNameFull;
    const config = PROVINCE_MAP_CONFIG[shortName];

    setSelectedRegion(shortName);
    setSelectedMunicipality(null);
    setHoveredRegion(null); 

    if (config) {
      setMapCenter(config.center);
      setMapZoom(config.zoom);
      setSelectedProvCode(config.code);
      setMapView('province');
    }
  };

  const handleMunicipalityClick = (geo) => {
    if (geo.properties.code.startsWith(selectedProvCode)) {
      setSelectedMunicipality(geo.properties.name);
    }
  };

  const handleResetMap = () => {
    setMapCenter([127.5, 36]);
    setMapZoom(1.5);
    setSelectedProvCode(null);
    setMapView('national');
    setSelectedMunicipality(null);
    setHoveredMunicipality(null); 
  };

  const currentNational = nationalDataCache[selectedYear] || { totals: {}, dataMap: {} };
  let currentMapData = {};
  let currentTotals = {};

  if (mapView === 'national') {
    currentMapData = currentNational.dataMap;
    currentTotals = currentNational.totals;
  } else {
    const engName = regionFolderMapping[selectedRegion];
    const cacheKey = `${engName}_${selectedYear}`;
    const muniData = municipalDataCache[cacheKey] || { totals: {}, dataMap: {} };
    currentMapData = muniData.dataMap;
    currentTotals = muniData.totals;
  }

  let metricMin = Infinity;
  let metricMax = -Infinity;
  Object.values(currentMapData).forEach(d => {
    const val = d[currentMetric.id];
    if (val !== null && val !== undefined) {
      if (val < metricMin) metricMin = val;
      if (val > metricMax) metricMax = val;
    }
  });

  const getColor = (val) => {
    if (val === null || val === undefined) return '#94A3B8'; // 데이터 없음
    if (metricMin === metricMax) return '#EAB308';           // 값이 모두 같을 때
    
    // 0 ~ 1 사이의 비율 계산 후 그라데이션 색상 가져오기
    const ratio = Math.max(0, Math.min(1, (val - metricMin) / (metricMax - metricMin)));
    return getGradientColor(ratio);
  };

  const coloredMapData = {};
  Object.keys(currentMapData).forEach(region => {
    const val = currentMapData[region][currentMetric.id];
    coloredMapData[region] = {
      ...currentMapData[region],
      color: getColor(val),
      displayValue: val !== null && val !== undefined ? val : '-'
    };
  });

  let rightColData = null;
  let targetName = '';

  if (mapView === 'national') {
    const targetReg = hoveredRegion || selectedRegion;
    targetName = targetReg;
    rightColData = coloredMapData[targetReg];
  } else {
    const targetMuni = hoveredMunicipality || selectedMunicipality;
    if (targetMuni) {
      targetName = targetMuni;
      rightColData = coloredMapData[targetMuni];
    } else {
      targetName = `${selectedRegion} 전체`;
      const parentData = currentNational.dataMap[selectedRegion];
      if (parentData) {
        rightColData = { 
          ...parentData, 
          displayValue: parentData[currentMetric.id] !== null && parentData[currentMetric.id] !== undefined ? parentData[currentMetric.id] : '-',
          color: '#94A3B8'
        };
      }
    }
  }

  const displayData = rightColData || { color: '#94A3B8', displayValue: '-' };

  const topRegions = Object.entries(coloredMapData)
    .filter(([_, v]) => v[currentMetric.id] !== null && v[currentMetric.id] !== undefined)
    .sort((a, b) => b[1][currentMetric.id] - a[1][currentMetric.id])
    .slice(0, 5);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <h1>보험보장공백 대시보드</h1>
            <p>AI 기반 지역별 보험보장공백 분석</p>
          </div>
        </div>
        <nav className="nav-menu">
          <div className="nav-item active">대시보드</div>
          <div className="nav-item" onClick={handleDownload} style={{ cursor: 'pointer' }}>데이터 다운로드</div>
        </nav>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="header-left">
            {isLoading ? (
              <span style={{ fontWeight: 'bold', color: '#94A3B8' }}>데이터 로딩중...</span>
            ) : hasError ? (
              <span style={{ fontWeight: 'bold', color: '#EF4444' }}>데이터를 불러올 수 없습니다. 경로를 확인해주세요.</span>
            ) : availableYears.length > 0 ? (
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))} 
                style={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#1C2B44',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableYears.slice().reverse().map(y => (
                  <option 
                    key={y} 
                    value={y} 
                    style={{ color: '#1F2937', backgroundColor: '#FFFFFF' }}
                  >
                    {y}년 데이터
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="header-right">
            <span>데이터 연동 완료</span>
            <button className="header-btn">ⓘ 데이터 안내</button>
          </div>
        </header>

        <main className="content-wrapper">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#3B82F6'}}>🏠</div>
              <div className="stat-info">
                <p>{mapView === 'national' ? '전국' : selectedRegion} 전체 주택건수</p>
                <h2>{currentTotals.housing !== null && currentTotals.housing !== undefined ? currentTotals.housing.toLocaleString() : '-'} <span>건</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#10B981'}}>🌱</div>
              <div className="stat-info">
                <p>{mapView === 'national' ? '전국' : selectedRegion} 전체 온실 면적</p>
                <h2>{currentTotals.greenhouse !== null && currentTotals.greenhouse !== undefined ? currentTotals.greenhouse.toLocaleString() : '-'} <span>m²</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#F97316'}}>🏪</div>
              <div className="stat-info">
                <p>{mapView === 'national' ? '전국' : selectedRegion} 전체 소상공인</p>
                <h2>{currentTotals.smallbiz !== null && currentTotals.smallbiz !== undefined ? currentTotals.smallbiz.toLocaleString() : '-'} <span>건</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#8B5CF6'}}>👥</div>
              <div className="stat-info">
                <p>{mapView === 'national' ? '전국' : selectedRegion} 전체 인구수</p>
                <h2>{currentTotals.population !== null && currentTotals.population !== undefined ? currentTotals.population.toLocaleString() : '-'} <span>명</span></h2>
              </div>
            </div>
          </div>

          <div className="main-content-grid">
            <div className="left-column">
              <div className="map-card" style={{ overflow: 'hidden', height: 'auto', minHeight: '500px' }}>
                <h3>
                  {selectedYear || '-'}년 지역별 지표 현황 ⓘ 
                  <span style={{fontSize:'12px', color:'#94A3B8', marginLeft:'8px'}}>
                    {mapView === 'national' ? '(시/도를 클릭하여 줌인하세요)' : '(시/군/구를 클릭하여 상세 조회하세요)'}
                  </span>
                </h3>
                
                {mapView === 'province' && (
                  <button className="map-back-btn" onClick={handleResetMap}>
                    ← 전국 지도로 돌아가기
                  </button>
                )}

                <div className="map-legend">
                  <p style={{marginBottom: '8px', fontWeight: 'bold'}}>{currentMetric.label} 분포</p>
                  
                  {/* 그라데이션 라벨 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                    <span>낮음</span>
                    <span>높음</span>
                  </div>
                  
                  {/* 연속된 색상 바 */}
                  <div style={{
                    height: '12px',
                    background: 'linear-gradient(to right, #15803D, #84CC16, #EAB308, #F97316, #EF4444)',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}></div>
                  
                  {/* 데이터 없음 항목은 별도 표시 */}
                  <div className="legend-item" style={{ marginTop: '12px' }}>
                    <div className="legend-color" style={{background: '#94A3B8'}}></div> 데이터 없음
                  </div>
                </div>

                <div style={{ width: '100%', height: '400px' }}>
                  <ComposableMap 
                    projection="geoMercator" 
                    projectionConfig={{ scale: 4500, center: [127.5, 36] }}
                    style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                  >
                    <ZoomableGroup center={mapCenter} zoom={mapZoom} disablePanning>
                      
                      {mapView === 'national' && (
                        <Geographies geography={KOREA_PROVINCE_URL}>
                          {({ geographies }) =>
                            geographies.map((geo) => {
                              const shortName = nameMapping[geo.properties.name] || geo.properties.name;
                              const d = coloredMapData[shortName];
                              return (
                                <Geography
                                  key={geo.rsmKey}
                                  geography={geo}
                                  onClick={() => handleProvinceClick(geo)}
                                  onMouseEnter={() => setHoveredRegion(shortName)}
                                  onMouseLeave={() => setHoveredRegion(null)}
                                  className="geography-path"
                                  style={{
                                    default: { fill: d ? d.color : "#94A3B8", stroke: "#1C2B44", strokeWidth: 0.5, outline: "none" },
                                    hover: { fill: "#3B82F6", stroke: "#FFF", strokeWidth: 1, cursor: "pointer", outline: "none" },
                                    pressed: { fill: "#2563EB", outline: "none" },
                                  }}
                                  title={`${geo.properties.name} (클릭하여 줌인)`}
                                />
                              );
                            })
                          }
                        </Geographies>
                      )}

                      {mapView === 'province' && (
                        <Geographies geography={KOREA_MUNI_URL}>
                          {({ geographies }) =>
                            geographies.map((geo) => {
                              const isSelectedProv = geo.properties.code.startsWith(selectedProvCode);
                              const isClickedMuni = selectedMunicipality === geo.properties.name;
                              const d = coloredMapData[geo.properties.name]; 

                              return (
                                <Geography
                                  key={geo.rsmKey}
                                  geography={geo}
                                  onClick={() => handleMunicipalityClick(geo)}
                                  onMouseEnter={() => {
                                    if (isSelectedProv) setHoveredMunicipality(geo.properties.name);
                                  }}
                                  onMouseLeave={() => setHoveredMunicipality(null)}
                                  className="geography-path"
                                  style={{
                                    default: {
                                      fill: isSelectedProv ? (d ? d.color : "#94A3B8") : "#1F2937",
                                      stroke: isSelectedProv ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)",
                                      strokeWidth: isSelectedProv ? (isClickedMuni ? 2 : 0.3) : 0.1,
                                      outline: "none"
                                    },
                                    hover: { 
                                      fill: isSelectedProv ? (d ? "#3B82F6" : "#4B5563") : "#1F2937", 
                                      cursor: isSelectedProv ? "pointer" : "default",
                                      outline: "none" 
                                    },
                                    pressed: { fill: "#2563EB", outline: "none" },
                                  }}
                                  title={isSelectedProv ? geo.properties.name : ""}
                                />
                              );
                            })
                          }
                        </Geographies>
                      )}
                    </ZoomableGroup>
                  </ComposableMap>
                </div>

                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <p style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 'bold' }}>지도 표시 지표 선택 : <span style={{color: '#3B82F6'}}>{currentMetric.label}</span></p>
                  <input 
                    type="range" 
                    min="0" 
                    max={METRICS.length - 1} 
                    value={selectedMetricIdx} 
                    onChange={(e) => setSelectedMetricIdx(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#94A3B8' }}>
                    {METRICS.map((m, idx) => (
                      <span key={m.id} onClick={() => setSelectedMetricIdx(idx)} style={{ cursor: 'pointer', color: selectedMetricIdx === idx ? '#FFF' : 'inherit', fontWeight: selectedMetricIdx === idx ? 'bold' : 'normal' }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bottom-charts-row" style={{ display: 'block', width: '100%', marginTop: '20px' }}>
                <div className="chart-card" style={{ width: '100%' }}>
                  <h3>{currentMetric.label} TOP 5 ({selectedYear || '-'}년)</h3>
                  <div style={{ marginTop: '16px' }}>
                    {topRegions.length > 0 ? topRegions.map((region, idx) => {
                      const val = region[1][currentMetric.id];
                      const barWidth = metricMax > metricMin ? ((val - metricMin) / (metricMax - metricMin)) * 100 : 50;
                      return (
                        <div className="bar-row" key={region[0]}>
                          <span style={{width:'15px', fontSize:'12px', color:'#94A3B8'}}>{idx + 1}</span>
                          <span className="bar-label">{region[0]}</span>
                          <div className="bar-track" style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: '6px', height: '12px', overflow: 'hidden' }}>
                            <div className="bar-fill" style={{width: `${Math.max(barWidth, 5)}%`, backgroundColor: region[1].color, height: '100%', borderRadius: '6px'}}></div>
                          </div>
                          <span className="bar-value" style={{ width: '60px', textAlign: 'right' }}>{val.toLocaleString()}</span>
                        </div>
                      )
                    }) : (
                      <div style={{ textAlign: 'center', color: '#94A3B8', marginTop: '20px' }}>데이터가 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="right-column">
              <div className="detail-card">
                <div className="detail-header">
                  <h3>선택 지역 상세 정보</h3>
                </div>
                
                <div className="region-title">
                  <h2>📍 {targetName}</h2>
                </div>

                <div className="radar-section">
                  <div className="index-score">
                    <p>선택된 지표 ({currentMetric.label})</p>
                    <h1 style={{ color: displayData.color }}>
                      {displayData.displayValue !== '-' ? displayData.displayValue.toLocaleString() : '-'}
                      <span style={{fontSize: '16px', marginLeft: '4px'}}>{currentMetric.unit}</span>
                    </h1>
                  </div>
                </div>

                <div className="metrics-grid">
                  <div className="metric-box">
                    <p>주택(건)</p>
                    <h4 style={{fontSize: '14px'}}>
                      {displayData.housing !== null && displayData.housing !== undefined ? displayData.housing.toLocaleString() : '-'} 
                    </h4>
                  </div>
                  <div className="metric-box">
                    <p>온실(m²)</p>
                    <h4 style={{fontSize: '14px'}}>
                      {displayData.greenhouse !== null && displayData.greenhouse !== undefined ? displayData.greenhouse.toLocaleString() : '-'} 
                    </h4>
                  </div>
                  <div className="metric-box">
                    <p>소상공인(건)</p>
                    <h4 style={{fontSize: '14px'}}>
                      {displayData.smallbiz !== null && displayData.smallbiz !== undefined ? displayData.smallbiz.toLocaleString() : '-'} 
                    </h4>
                  </div>
                  <div className="metric-box">
                    <p>인구수(명)</p>
                    <h4 style={{fontSize: '14px'}}>
                      {displayData.population !== null && displayData.population !== undefined ? displayData.population.toLocaleString() : '-'} 
                    </h4>
                  </div>
                </div>

                <div className="ai-insight">
                  <h4>✨ 분석 인사이트</h4>
                  <p>
                    선택하신 <b>{targetName}</b>의 {selectedYear || '-'}년 기준 상세 지표 현황입니다.
                    지도 아래의 슬라이더를 통해 주택, 온실, 소상공인, 인구수 관련 항목을 변경하여 직관적인 분포도를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;