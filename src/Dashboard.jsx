import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { fetchAnalysisInsights } from './insightsService'; 
import './Dashboard.css';

// 통계청 기준 대한민국 시도 및 시군구 GeoJSON
const KOREA_PROVINCE_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json";
const KOREA_MUNI_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json";

const nameMapping = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
  '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원도': '강원', '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전라남도': '전남', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주'
};

const regionFolderMapping = {
  '서울': 'seoul', '인천': 'incheon', '부산': 'busan', '울산': 'ulsan', 
  '대구': 'dague', '광주': 'gwangju', '대전': 'dajeon', '세종': 'sejong', 
  '경기': 'kyungki', '강원': 'gangwon', '충북': 'chungbuk', '충남': 'chungnam', 
  '전북': 'jeonbuk', '전남': 'jeonnam', '경북': 'gyungbuk', '경남': 'gyungnam', '제주': 'jeju'
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
  { id: 'damage', label: '우심피해액(원)', unit: '원' }, 
  { id: 'population', label: '인구수(명)', unit: '명' },
  { id: 'sub_rate_z', label: '가입률(Z값)', unit: '' },
  { id: 'sub_rate_percent', label: '가입률(%)', unit: '%' },
  { id: 'target_housing', label: '대상가구(건)', unit: '건' },
  { id: 'sub_housing', label: '가입가구(건)', unit: '건' },
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
  if (lines.length < 2) return null;

  const headers = parseCSVLine(lines[0]);
  
  let idxTarget = headers.findIndex(h => h.includes('대상가구'));
  let idxSub = headers.findIndex(h => h.includes('가입가구'));
  let idxSubZ = headers.findIndex(h => h.includes('가입률Z값'));
  let idxSubRatePct = headers.findIndex(h => h.includes('가입률퍼센트')); 
  let idxPop = headers.findIndex(h => h.includes('인구수'));
  let idxDamage = headers.findIndex(h => h.includes('우심피해액'));

  if (idxTarget === -1) idxTarget = headers.findIndex(h => h.includes('주택') && h.includes('가입'));
  if (idxTarget === -1) idxTarget = 1;
  if (idxSub === -1) idxSub = headers.findIndex(h => h.includes('주택') && h.includes('가입'));
  if (idxSub === -1) idxSub = 1;
  if (idxSubZ === -1) idxSubZ = headers.findIndex(h => h.includes('Z값'));
  if (idxSubZ === -1) idxSubZ = 2;
  if (idxSubRatePct === -1) idxSubRatePct = 3; 
  if (idxPop === -1) idxPop = headers.findIndex(h => h.includes('인구수'));
  if (idxPop === -1) idxPop = 6;
  if (idxDamage === -1) idxDamage = headers.findIndex(h => h.includes('우심피해액'));
  if (idxDamage === -1) idxDamage = 7;

  let totals = { target_housing: null, sub_housing: null, sub_rate_z: null, sub_rate_percent: null, population: null, damage: null };
  const dataMap = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;
    
    const regionName = cols[0].replace(/\s/g, '');
    if (regionName === '0' || regionName === 'NaN' || regionName.includes('주택')) continue;

    const dataObj = {
      target_housing: parseVal(cols[idxTarget]),
      sub_housing: parseVal(cols[idxSub]),
      sub_rate_z: parseVal(cols[idxSubZ]),
      sub_rate_percent: parseVal(cols[idxSubRatePct]),
      population: parseVal(cols[idxPop]),
      damage: parseVal(cols[idxDamage]), 
    };

    if (regionName === '합계') {
      totals = dataObj;
      continue;
    }

    if (!regionName || regionName === '평균' || regionName === '표준편차') continue;

    dataMap[regionName] = dataObj;
  }

  return { totals, dataMap };
};

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

const getGradientColor = (ratio, isReverse = false) => {
  let stops = ['#15803D', '#84CC16', '#EAB308', '#F97316', '#EF4444']; 
  if (isReverse) {
    stops = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#15803D']; 
  }
  
  if (ratio <= 0) return stops[0];
  if (ratio >= 1) return stops[stops.length - 1];
  
  const scaled = ratio * (stops.length - 1); 
  const index = Math.floor(scaled);          
  const factor = scaled - index;             
  
  return interpolateColor(stops[index], stops[index + 1], factor);
};

const getBaseUrl = () => {
  return process.env.PUBLIC_URL || '';
};

const TypewriterEffect = ({ text, delay = 50 }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return <span>{currentText}</span>;
};


const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analysisMode, setAnalysisMode] = useState('compare1');

  const [availableYears, setAvailableYears] = useState([2024, 2025, 2026]);
  const [selectedYear, setSelectedYear] = useState(2026); 
  
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

  const [insightsDictionary, setInsightsDictionary] = useState({});
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState('');

  const [selectedMetricIdxA, setSelectedMetricIdxA] = useState(0);
  const [selectedMetricIdxB, setSelectedMetricIdxB] = useState(1);
  const [checkedRangesA, setCheckedRangesA] = useState([]); 
  const [checkedRangesB, setCheckedRangesB] = useState([]);

  const calcOptions = [
    { id: 'damage', label: '우심피해액(원)' },
    { id: 'population', label: '인구수(명)' },
    { id: 'target_housing', label: '대상가구(건)' },
    { id: 'sub_housing', label: '가입가구(건)' }
  ];
  const [numeratorIdx, setNumeratorIdx] = useState(0);   
  const [denominatorIdx, setDenominatorIdx] = useState(1); 
  const [hoveredRatioData, setHoveredRatioData] = useState(null); 

  const [csvLastModified] = useState('2026-07-20 23:59:59');
  const [isInfoHovered, setIsInfoHovered] = useState(false);

  useEffect(() => {
    const loadInsights = async () => {
      const baseUrl = getBaseUrl();
      const data = await fetchAnalysisInsights(baseUrl);
      setInsightsDictionary(data);
    };
    loadInsights();
  }, []);

  const fetchCSVData = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;

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
    if (selectedYear && !nationalDataCache[selectedYear]) {
      const baseUrl = getBaseUrl();
      fetchCSVData(`${baseUrl}/data/top/${selectedYear}data.csv`).then(result => {
        if (result && Object.keys(result.dataMap).length > 0) {
          setNationalDataCache(prev => ({ ...prev, [selectedYear]: result }));
        }
      });
    }
  }, [selectedYear]);

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

  const processMapData = (metricId, checkedRanges) => {
    let min = Infinity;
    let max = -Infinity;
    
    if (metricId === 'sub_rate_percent') {
      min = 0;
      max = 1;
    } else {
      Object.values(currentMapData).forEach(d => {
        const val = d[metricId];
        if (val !== null && val !== undefined) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    }

    const isReverse = metricId === 'sub_rate_z' || metricId === 'sub_rate_percent';

    const getFilterColor = (val, ratio) => {
      if (val === null || val === undefined) return '#94A3B8';
      
      if (checkedRanges.length === 0) {
        if (min === max) return '#EAB308';
        return getGradientColor(ratio, isReverse);
      }

      const rangeIndex = Math.min(9, Math.floor(ratio * 10)); 
      
      if (checkedRanges.includes(rangeIndex)) {
        let stops10 = [
          '#15803D', '#22C55E', '#84CC16', '#D9F99D', '#FEF08A', 
          '#EAB308', '#F97316', '#EA580C', '#EF4444', '#B91C1C'
        ];
        if (isReverse) {
          stops10 = [...stops10].reverse();
        }
        return stops10[rangeIndex];
      }
      return '#E2E8F0'; 
    };

    const processedData = {};
    const filteredRegions = []; 

    Object.keys(currentMapData).forEach(region => {
      const val = currentMapData[region][metricId];
      const ratio = min === max ? 0 : Math.max(0, Math.min(1, (val - min) / (max - min)));
      const color = getFilterColor(val, ratio);
      
      if (checkedRanges.length > 0 && color !== '#E2E8F0' && color !== '#94A3B8') {
        filteredRegions.push({
          name: region,
          value: val
        });
      }

      processedData[region] = {
        ...currentMapData[region],
        color,
        displayValue: val !== null && val !== undefined ? val : '-',
        ratio
      };
    });

    return { processedData, min, max, filteredRegions };
  };

  const processRatioMapData = () => {
    const numId = calcOptions[numeratorIdx].id;
    const denId = calcOptions[denominatorIdx].id;
    
    let min = Infinity;
    let max = -Infinity;
    const ratioMap = {};

    Object.keys(currentMapData).forEach(region => {
      const d = currentMapData[region];
      const numVal = d[numId];
      const denVal = d[denId];

      let calcVal = null;
      if (numVal !== null && numVal !== undefined && denVal !== null && denVal !== undefined && denVal !== 0) {
        calcVal = numVal / denVal;
        if (calcVal < min) min = calcVal;
        if (calcVal > max) max = calcVal;
      }
      ratioMap[region] = calcVal;
    });

    const processedData = {};
    Object.keys(currentMapData).forEach(region => {
      const val = ratioMap[region];
      let color = '#94A3B8';
      let ratio = 0;

      if (val !== null) {
        if (min === max) {
          color = '#EAB308';
        } else {
          ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
          color = getGradientColor(ratio);
        }
      }

      processedData[region] = {
        ...currentMapData[region],
        color,
        displayValue: val !== null ? val : '-',
        ratio
      };
    });

    return { processedData, min, max };
  };

  const { 
    processedData: dashboardMapData, 
    min: dashboardMin, 
    max: dashboardMax 
  } = processMapData(currentMetric.id, []);

  const mapDataA = processMapData(METRICS[selectedMetricIdxA].id, checkedRangesA);
  const mapDataB = processMapData(METRICS[selectedMetricIdxB].id, checkedRangesB);

  const mapDataRatio = processRatioMapData();

  let rightColData = null;
  let targetName = '';

  if (mapView === 'national') {
    const targetReg = hoveredRegion || selectedRegion;
    targetName = targetReg;
    rightColData = dashboardMapData[targetReg];
  } else {
    const targetMuni = hoveredMunicipality || selectedMunicipality;
    if (targetMuni) {
      targetName = targetMuni;
      rightColData = dashboardMapData[targetMuni];
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

  const topRegions = Object.entries(dashboardMapData)
    .filter(([_, v]) => v[currentMetric.id] !== null && v[currentMetric.id] !== undefined)
    .sort((a, b) => b[1][currentMetric.id] - a[1][currentMetric.id])
    .slice(0, 5);

  const currentInsight = useMemo(() => {
    let regionLevel = '';
    let sido = '';
    let regionName = '';

    if (mapView === 'national') {
      regionLevel = '시도';
      sido = targetName;
      regionName = targetName;
    } else {
      if (targetName === `${selectedRegion} 전체`) {
        regionLevel = '시도';
        sido = selectedRegion;
        regionName = selectedRegion;
      } else {
        regionLevel = '시군구';
        sido = selectedRegion;
        regionName = targetName;
      }
    }

    const indicatorId = currentMetric?.id || 'overall';
    const lookupKey = `${selectedYear}|${regionLevel}|${sido}|${regionName}|${indicatorId}`;
    const defaultKey = `${selectedYear}|${regionLevel}|${sido}|${regionName}|overall`;
    
    const fallbackInsight = `선택하신 ${targetName}의 ${selectedYear || '-'}년 기준 상세 지표 현황입니다. 지도 아래의 슬라이더를 통해 항목을 변경하여 직관적인 분포도를 확인할 수 있습니다.`;

    if (Object.keys(insightsDictionary).length === 0) return fallbackInsight;

    return insightsDictionary[lookupKey] || insightsDictionary[defaultKey] || fallbackInsight;
  }, [insightsDictionary, targetName, mapView, selectedRegion, selectedYear, currentMetric]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      setIsInsightLoading(true);
      const timer = setTimeout(() => {
        setIsInsightLoading(false);
        setInsightText(currentInsight);
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [currentInsight, activeTab]);

  const handleCheckboxToggle = (mapType, rangeIndex) => {
    if (mapType === 'A') {
      setCheckedRangesA(prev => prev.includes(rangeIndex) ? prev.filter(r => r !== rangeIndex) : [...prev, rangeIndex]);
    } else {
      setCheckedRangesB(prev => prev.includes(rangeIndex) ? prev.filter(r => r !== rangeIndex) : [...prev, rangeIndex]);
    }
  };

  let displaySubHousingTotal = currentTotals.sub_housing;
  let displayPopulationTotal = currentTotals.population;
  let displayDamageTotal = currentTotals.damage;

  if (mapView === 'province') {
    const parentData = nationalDataCache[selectedYear]?.dataMap[selectedRegion];
    if (parentData) {
      if (displaySubHousingTotal === null || displaySubHousingTotal === undefined || displaySubHousingTotal === '-') {
        if (parentData.sub_housing !== undefined && parentData.sub_housing !== null) {
          displaySubHousingTotal = parentData.sub_housing;
        }
      }
      if (displayPopulationTotal === null || displayPopulationTotal === undefined || displayPopulationTotal === '-') {
        if (parentData.population !== undefined && parentData.population !== null) {
          displayPopulationTotal = parentData.population;
        }
      }
      if (displayDamageTotal === null || displayDamageTotal === undefined || displayDamageTotal === '-') {
        if (parentData.damage !== undefined && parentData.damage !== null) {
          displayDamageTotal = parentData.damage;
        }
      }
    }
  }

  const renderAnalysisView = () => {

    const renderDualMap = (mapType, mapDataObj, metricIdx, setMetricIdx, checkedRanges) => {
      const metric = METRICS[metricIdx];
      
      return (
        <div className="map-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'auto', minHeight: '650px', padding: '16px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>{metric.label} 분포 분석</h3>
          
          {mapView === 'province' && (
            <button className="map-back-btn" onClick={handleResetMap} style={{ top: '16px', right: '16px' }}>
              ← 전국 지도
            </button>
          )}

          <div style={{ flex: 1, position: 'relative' }}>
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 4500, center: [127.5, 36] }} style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}>
              <ZoomableGroup center={mapCenter} zoom={mapZoom} disablePanning>
                <Geographies geography={mapView === 'national' ? KOREA_PROVINCE_URL : KOREA_MUNI_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const name = mapView === 'national' ? (nameMapping[geo.properties.name] || geo.properties.name) : geo.properties.name;
                      const isSelectedProv = mapView === 'province' ? geo.properties.code.startsWith(selectedProvCode) : true;
                      const d = mapDataObj.processedData[name];

                      let fillStr = "#1F2937";
                      if (mapView === 'national') fillStr = d ? d.color : "#94A3B8";
                      else fillStr = isSelectedProv ? (d ? d.color : "#94A3B8") : "#1F2937";

                      return (
                        <g key={geo.rsmKey}>
                          <Geography
                            geography={geo}
                            onClick={() => mapView === 'national' ? handleProvinceClick(geo) : null}
                            className="geography-path"
                            style={{
                              default: { fill: fillStr, stroke: "#1C2B44", strokeWidth: mapView === 'national' ? 0.5 : (isSelectedProv ? 0.3 : 0.1), outline: "none" },
                              hover: { fill: (mapView === 'national' || isSelectedProv) ? "#3B82F6" : "#1F2937", cursor: (mapView === 'national' || isSelectedProv) ? "pointer" : "default", outline: "none" },
                              pressed: { fill: "#2563EB", outline: "none" },
                            }}
                            title={name}
                          />
                        </g>
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div style={{ position: 'relative', width: '100%', height: '36px', backgroundColor: '#1E293B', borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{
                position: 'absolute', height: '28px', width: `${100 / METRICS.length}%`,
                backgroundColor: '#3B82F6', borderRadius: '6px',
                left: `${(metricIdx / METRICS.length) * 100}%`, transition: 'left 0.3s'
              }} />
              {METRICS.map((m, idx) => (
                <div key={m.id} onClick={() => setMetricIdx(idx)} style={{ flex: 1, textAlign: 'center', zIndex: 1, fontSize: '11px', fontWeight: metricIdx === idx ? 'bold' : 'normal', color: metricIdx === idx ? '#FFFFFF' : '#94A3B8' }}>
                  {m.label} 
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>10% 단위 분포 필터링</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '10px' }}>
              {Array.from({length: 10}).map((_, idx) => {
                const isChecked = checkedRanges.includes(idx);
                const label = `${idx*10}~${(idx+1)*10}%`;
                
                let stops10 = [
                  '#15803D', '#22C55E', '#84CC16', '#D9F99D', '#FEF08A', 
                  '#EAB308', '#F97316', '#EA580C', '#EF4444', '#B91C1C'
                ];
                if (METRICS[metricIdx].id === 'sub_rate_z' || METRICS[metricIdx].id === 'sub_rate_percent') {
                  stops10 = [...stops10].reverse();
                }
                const baseColor = stops10[idx];
                
                return (
                  <div 
                    key={idx}
                    onClick={() => handleCheckboxToggle(mapType, idx)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      border: `1px solid ${isChecked ? baseColor : '#334155'}`,
                      backgroundColor: isChecked ? baseColor : 'transparent',
                      color: isChecked ? '#FFF' : '#94A3B8',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flex: '1 1 calc(20% - 6px)',
                      textAlign: 'center'
                    }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ 
            marginTop: '12px', padding: '12px', minHeight: '60px', maxHeight: '150px', overflowY: 'auto',
            backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px',
            fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6'
          }}>
            <strong style={{ color: '#FFF', display: 'block', marginBottom: '8px' }}>필터링된 지역 결과:</strong>
            {checkedRanges.length === 0 ? (
              <span style={{ color: '#64748B' }}>10% 단위 버튼을 선택하여 지역을 확인하세요.</span>
            ) : mapDataObj.filteredRegions.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {mapDataObj.filteredRegions.map((regionData, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>{regionData.name}</span>
                    <span style={{ color: '#FFF', fontWeight: 'bold' }}>
                      {METRICS[metricIdx].id === 'sub_rate_percent' ? (regionData.value * 100).toFixed(2) + '%' : regionData.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#EF4444' }}>해당 구간에 속하는 지역이 없습니다.</span>
            )}
          </div>
        </div>
      );
    };

    const renderRatioMap = () => {
      return (
        <div style={{ display: 'flex', gap: '20px', width: '100%', height: '100%' }}>
          <div className="map-card" style={{ flex: 7, display: 'flex', flexDirection: 'column', height: 'auto', minHeight: '650px', padding: '16px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>사용자 정의 지표 비교 분석</h3>
            
            {mapView === 'province' && (
              <button className="map-back-btn" onClick={handleResetMap} style={{ top: '16px', right: '16px' }}>
                ← 전국 지도
              </button>
            )}

            <div style={{ flex: 1, position: 'relative' }}>
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 4500, center: [127.5, 36] }} style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}>
                <ZoomableGroup center={mapCenter} zoom={mapZoom} disablePanning>
                  <Geographies geography={mapView === 'national' ? KOREA_PROVINCE_URL : KOREA_MUNI_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const name = mapView === 'national' ? (nameMapping[geo.properties.name] || geo.properties.name) : geo.properties.name;
                        const isSelectedProv = mapView === 'province' ? geo.properties.code.startsWith(selectedProvCode) : true;
                        const d = mapDataRatio.processedData[name];

                        let fillStr = "#1F2937";
                        if (mapView === 'national') fillStr = d ? d.color : "#94A3B8";
                        else fillStr = isSelectedProv ? (d ? d.color : "#94A3B8") : "#1F2937";

                        return (
                          <g key={geo.rsmKey}>
                            <Geography
                              geography={geo}
                              onClick={() => mapView === 'national' ? handleProvinceClick(geo) : null}
                              onMouseEnter={() => {
                                const regionData = currentMapData[name];
                                if (d && d.displayValue !== '-' && regionData) {
                                  const numVal = regionData[calcOptions[numeratorIdx].id];
                                  const denVal = regionData[calcOptions[denominatorIdx].id];
                                  setHoveredRatioData({ 
                                    region: name, 
                                    value: d.displayValue,
                                    numVal: numVal,
                                    denVal: denVal
                                  });
                                } else {
                                  setHoveredRatioData({ region: name, value: '데이터 없음', numVal: '-', denVal: '-' });
                                }
                              }}
                              onMouseLeave={() => setHoveredRatioData(null)}
                              className="geography-path"
                              style={{
                                default: { fill: fillStr, stroke: "#1C2B44", strokeWidth: mapView === 'national' ? 0.5 : (isSelectedProv ? 0.3 : 0.1), outline: "none" },
                                hover: { fill: (mapView === 'national' || isSelectedProv) ? "#3B82F6" : "#1F2937", cursor: (mapView === 'national' || isSelectedProv) ? "pointer" : "default", outline: "none" },
                                pressed: { fill: "#2563EB", outline: "none" },
                              }}
                              title={name}
                            />
                          </g>
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>
          </div>

          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="detail-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>분석 수식 설정</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px', display: 'block', textAlign: 'center' }}>분자 (Numerator)</label>
                  <select 
                    value={numeratorIdx} 
                    onChange={e => setNumeratorIdx(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', backgroundColor: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '12px' }}
                  >
                    {calcOptions.map((opt, idx) => <option key={idx} value={idx}>{opt.label}</option>)}
                  </select>
                </div>

                <div style={{ width: '100%', height: '4px', backgroundColor: '#3B82F6', margin: '4px 0', borderRadius: '2px' }}></div>

                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px', display: 'block', textAlign: 'center' }}>분모 (Denominator)</label>
                  <select 
                    value={denominatorIdx} 
                    onChange={e => setDenominatorIdx(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', backgroundColor: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '12px' }}
                  >
                    {calcOptions.map((opt, idx) => <option key={idx} value={idx}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="detail-card" style={{ padding: '24px', flex: 1 }}>
              <h3 style={{ fontSize: '15px', marginBottom: '20px' }}>실시간 계산 결과</h3>
              <div style={{ 
                backgroundColor: '#1E293B', 
                borderRadius: '8px', 
                padding: '20px',
                height: '180px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                border: '1px solid #334155'
              }}>
                {hoveredRatioData ? (
                  <>
                    <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '12px', fontWeight: 'bold' }}>{hoveredRatioData.region}</p>
                    
                    {hoveredRatioData.value !== '데이터 없음' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: '#CBD5E1', width: '100%' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#94A3B8', marginRight: '6px' }}>{calcOptions[numeratorIdx].label} :</span> 
                          {hoveredRatioData.numVal ? hoveredRatioData.numVal.toLocaleString() : '-'}
                        </span>
                        <div style={{ width: '120px', height: '1px', backgroundColor: '#64748B', margin: '4px 0' }}></div>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#94A3B8', marginRight: '6px' }}>{calcOptions[denominatorIdx].label} :</span>
                          {hoveredRatioData.denVal ? hoveredRatioData.denVal.toLocaleString() : '-'}
                        </span>
                      </div>
                    )}

                    <h1 style={{ color: '#3B82F6', fontSize: '28px', margin: 0 }}>
                      {typeof hoveredRatioData.value === 'number' ? hoveredRatioData.value.toFixed(4) : hoveredRatioData.value}
                    </h1>
                  </>
                ) : (
                  <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center' }}>
                    지도에서 지역에 마우스를<br/>올리면 결과가 표시됩니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
        <div style={{ alignSelf: 'flex-start', display: 'flex', backgroundColor: '#1E293B', borderRadius: '8px', padding: '4px', border: '1px solid #334155' }}>
          <button 
            onClick={() => setAnalysisMode('compare1')}
            style={{
              padding: '8px 24px', fontSize: '13px', fontWeight: 'bold', border: 'none',
              backgroundColor: analysisMode === 'compare1' ? '#3B82F6' : 'transparent',
              color: analysisMode === 'compare1' ? '#FFF' : '#94A3B8',
              borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            비교 1 (듀얼 맵)
          </button>
          <button 
            onClick={() => setAnalysisMode('compare2')}
            style={{
              padding: '8px 24px', fontSize: '13px', fontWeight: 'bold', border: 'none',
              backgroundColor: analysisMode === 'compare2' ? '#3B82F6' : 'transparent',
              color: analysisMode === 'compare2' ? '#FFF' : '#94A3B8',
              borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            비교 2 (사용자 수식 맵)
          </button>
        </div>

        {analysisMode === 'compare1' ? (
          <div style={{ display: 'flex', gap: '20px', width: '100%', flex: 1 }}>
            {renderDualMap('A', mapDataA, selectedMetricIdxA, setSelectedMetricIdxA, checkedRangesA)}
            {renderDualMap('B', mapDataB, selectedMetricIdxB, setSelectedMetricIdxB, checkedRangesB)}
          </div>
        ) : (
          renderRatioMap()
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <h1>보험보장공백 대시보드</h1>
            <p>AI 기반 지역별 보험보장공백 분석</p>
          </div>
        </div>
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>대시보드</div>
          <div className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')} style={{ cursor: 'pointer' }}>보험보장공백 분석</div>
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
            <div 
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setIsInfoHovered(true)}
              onMouseLeave={() => setIsInfoHovered(false)}
            >
              <button className="header-btn" style={{ cursor: 'pointer' }}>ⓘ 데이터 안내</button>
              
              {isInfoHovered && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '10px',
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  color: '#CBD5E1',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  zIndex: 100,
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  최종 수정일 : <span style={{ color: '#FFF', fontWeight: 'bold' }}>{csvLastModified}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-wrapper" style={{ overflowY: 'auto' }}>
          
          {activeTab === 'analysis' ? (
            renderAnalysisView()
          ) : (
            <>
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                
                <div className="stat-card">
                  <div className="stat-icon" style={{color: '#8B5CF6'}}>👥</div>
                  <div className="stat-info">
                    <p>{mapView === 'national' ? '전국' : selectedRegion} 전체 인구수</p>
                    <h2>{displayPopulationTotal !== null && displayPopulationTotal !== undefined ? displayPopulationTotal.toLocaleString() : '-'} <span>명</span></h2>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{color: '#EF4444'}}>🚨</div>
                  <div className="stat-info">
                    <p>{mapView === 'national' ? '전국' : selectedRegion} 전체 우심피해액</p>
                    <h2>{displayDamageTotal !== null && displayDamageTotal !== undefined ? displayDamageTotal.toLocaleString() : '-'} <span>원</span></h2>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon" style={{color: '#3B82F6'}}>🏠</div>
                  <div className="stat-info">
                    <p>{mapView === 'national' ? '전국' : selectedRegion} 전체 가입가구</p>
                    <h2>{displaySubHousingTotal !== null && displaySubHousingTotal !== undefined ? displaySubHousingTotal.toLocaleString() : '-'} <span>건</span></h2>
                  </div>
                </div>
              </div>

              <div className="main-content-grid">
                <div className="left-column">
                  <div className="map-card" style={{ overflow: 'hidden', height: 'auto', minHeight: '500px' }}>
                    <h3>
                      {selectedYear || '-'}년 지역별 지표 현황
                      <span style={{fontSize:'12px', color:'#94A3B8', marginLeft:'8px'}}>
                        {mapView === 'national' ? '(시/도를 클릭하여 줌인하세요)' : '(시/군/구를 클릭하여 상세 조회하세요)'}
                      </span>
                    </h3>
                    
                    {mapView === 'province' && (
                      <button className="map-back-btn" onClick={handleResetMap}>
                        ← 전국 지도로 돌아가기
                      </button>
                    )}

                    {/* ✨ [수정] 범례(Legend) 가로 폭 강제 확장 */}
                    <div className="map-legend" style={{ width: '280px' }}>
                      <p style={{marginBottom: '8px', fontWeight: 'bold'}}>{currentMetric.label} 분포</p>
                      
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                        {currentMetric.id === 'sub_rate_percent' ? (
                          <>
                            <span>0%</span>
                            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>50%</span>
                            <span>100%</span>
                          </>
                        ) : (
                          <>
                            <span>낮음</span>
                            <span>높음</span>
                          </>
                        )}
                      </div>
                      
                      <div style={{
                        height: '12px',
                        background: (currentMetric.id === 'sub_rate_z' || currentMetric.id === 'sub_rate_percent')
                          ? 'linear-gradient(to right, #EF4444, #F97316, #EAB308, #84CC16, #15803D)'
                          : 'linear-gradient(to right, #15803D, #84CC16, #EAB308, #F97316, #EF4444)',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}></div>
                      
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
                                  const d = dashboardMapData[shortName];
                                  return (
                                    <g key={geo.rsmKey}>
                                      <Geography
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
                                    </g>
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
                                  const d = dashboardMapData[geo.properties.name]; 

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
                      
                      <div style={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '40px', 
                        backgroundColor: '#1E293B', 
                        borderRadius: '8px', 
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{
                          position: 'absolute',
                          height: '32px',
                          width: `${100 / METRICS.length}%`,
                          backgroundColor: '#3B82F6',
                          borderRadius: '6px',
                          left: `${(selectedMetricIdx / METRICS.length) * 100}%`,
                          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />

                        {METRICS.map((m, idx) => (
                          <div 
                            key={m.id} 
                            onClick={() => setSelectedMetricIdx(idx)} 
                            style={{ 
                              flex: 1, 
                              textAlign: 'center', 
                              zIndex: 1, 
                              fontSize: '12px', 
                              fontWeight: selectedMetricIdx === idx ? 'bold' : 'normal',
                              color: selectedMetricIdx === idx ? '#FFFFFF' : '#94A3B8',
                              transition: 'color 0.3s ease',
                              padding: '0 8px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={m.label} 
                          >
                            {m.label}
                          </div>
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
                          const barWidth = dashboardMax > dashboardMin ? ((val - dashboardMin) / (dashboardMax - dashboardMin)) * 100 : 50;
                          return (
                            <div className="bar-row" key={region[0]}>
                              <span style={{width:'15px', fontSize:'12px', color:'#94A3B8'}}>{idx + 1}</span>
                              <span className="bar-label">{region[0]}</span>
                              <div className="bar-track" style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: '6px', height: '12px', overflow: 'hidden' }}>
                                <div className="bar-fill" style={{width: `${Math.max(barWidth, 5)}%`, backgroundColor: region[1].color, height: '100%', borderRadius: '6px'}}></div>
                              </div>
                              <span className="bar-value" style={{ width: '80px', textAlign: 'right' }}>
                                {currentMetric.id === 'sub_rate_percent' ? (val * 100).toFixed(2) + '%' : val.toLocaleString()}
                              </span>
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
                      <div className="index-score" style={{ textAlign: 'left', width: '100%' }}>
                        <p style={{ textAlign: 'left', margin: '0 0 8px 0' }}>선택된 지표 ({currentMetric.label})</p>
                        <h1 style={{ color: displayData.color, justifyContent: 'flex-start' }}>
                          {displayData.displayValue !== '-' 
                            ? (currentMetric.id === 'sub_rate_percent' ? (displayData.displayValue * 100).toFixed(2) : displayData.displayValue.toLocaleString()) 
                            : '-'}
                          <span style={{fontSize: '16px', marginLeft: '4px'}}>{currentMetric.unit}</span>
                        </h1>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                      
                      <div className="metric-box" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>대상가구</p>
                        <h4 style={{fontSize: '16px', margin: 0}}>
                          {displayData.target_housing !== null && displayData.target_housing !== undefined ? displayData.target_housing.toLocaleString() : '-'}
                          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#94A3B8', marginLeft: '4px' }}>건</span>
                        </h4>
                      </div>
                      
                      <div className="metric-box" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>가입가구</p>
                        <h4 style={{fontSize: '16px', margin: 0}}>
                          {displayData.sub_housing !== null && displayData.sub_housing !== undefined ? displayData.sub_housing.toLocaleString() : '-'}
                          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#94A3B8', marginLeft: '4px' }}>건</span>
                        </h4>
                      </div>

                      <div className="metric-box" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>가입률(%)</p>
                        <h4 style={{fontSize: '16px', margin: 0}}>
                          {displayData.sub_rate_percent !== null && displayData.sub_rate_percent !== undefined ? (displayData.sub_rate_percent * 100).toFixed(2) : '-'}
                          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#94A3B8', marginLeft: '4px' }}>%</span>
                        </h4>
                      </div>

                      <div className="metric-box" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>가입률(Z값)</p>
                        <h4 style={{fontSize: '16px', margin: 0}}>
                          {displayData.sub_rate_z !== null && displayData.sub_rate_z !== undefined ? displayData.sub_rate_z.toLocaleString() : '-'}
                        </h4>
                      </div>

                      <div className="metric-box" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>우심피해액</p>
                        <h4 style={{fontSize: '16px', margin: 0}}>
                          {displayData.damage !== null && displayData.damage !== undefined ? displayData.damage.toLocaleString() : '-'}
                          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#94A3B8', marginLeft: '4px' }}>원</span>
                        </h4>
                      </div>

                      <div className="metric-box" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>인구수</p>
                        <h4 style={{fontSize: '16px', margin: 0}}>
                          {displayData.population !== null && displayData.population !== undefined ? displayData.population.toLocaleString() : '-'}
                          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#94A3B8', marginLeft: '4px' }}>명</span>
                        </h4>
                      </div>

                    </div>

                    <div className="ai-insight" style={{ minHeight: '120px' }}>
                      <h4>✨ 분석 인사이트</h4>
                      {isInsightLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60px' }}>
                          <div style={{
                            width: '24px', height: '24px', 
                            border: '3px solid #E2E8F0', borderTop: '3px solid #3B82F6', 
                            borderRadius: '50%', animation: 'spin 1s linear infinite'
                          }}></div>
                        </div>
                      ) : (
                        <p style={{ minHeight: '60px', margin: 0, lineHeight: '1.6', color: '#000000' }}>
                          <TypewriterEffect text={insightText} delay={30} />
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;