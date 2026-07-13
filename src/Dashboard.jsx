import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import './Dashboard.css';

// 통계청 기준 대한민국 시도 및 시군구 GeoJSON (외부 오픈소스 활용)
const KOREA_PROVINCE_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json";
const KOREA_MUNI_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json";

// GeoJSON의 정식 명칭을 CSV의 축약 명칭과 매핑
const nameMapping = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
  '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원도': '강원', '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전라남도': '전남', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주'
};

// 줌인을 위한 각 시도의 중심 좌표와 확대(Zoom) 배율 설정
const PROVINCE_MAP_CONFIG = {
  '서울': { code: '11', center: [126.9780, 37.5665], zoom: 18 },
  '부산': { code: '21', center: [129.0756, 35.1795], zoom: 15 },
  '대구': { code: '22', center: [128.6014, 35.8714], zoom: 15 },
  '인천': { code: '23', center: [126.45, 37.4562], zoom: 12 }, // 섬 포함
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

const Dashboard = () => {
  const [allYearsData, setAllYearsData] = useState({});
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [selectedMunicipality, setSelectedMunicipality] = useState(null); // 시군구 선택 상태

  // 지도 인터랙션 상태
  const [mapView, setMapView] = useState('national'); // 'national' | 'province'
  const [mapCenter, setMapCenter] = useState([127.5, 36]);
  const [mapZoom, setMapZoom] = useState(1.5);
  const [selectedProvCode, setSelectedProvCode] = useState(null);

  useEffect(() => {
    const years = [2019, 2020, 2021, 2022, 2023, 2024];
    
    Promise.all(
      years.map(year => 
        fetch(`/data/${year}data.csv`)
          .then(res => {
            if (!res.ok) throw new Error(`CSV 파일 없음: ${year}`);
            return res.arrayBuffer();
          })
          .then(buffer => ({ year, buffer }))
          .catch(() => ({ year, buffer: null }))
      )
    ).then(results => {
      const dataMap = {};

      results.forEach(({ year, buffer }) => {
        if (!buffer) return;

        let decoder = new TextDecoder('utf-8');
        let csvText = decoder.decode(buffer);
        if (csvText.includes('')) {
          decoder = new TextDecoder('euc-kr');
          csvText = decoder.decode(buffer);
        }

        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        const dataRows = lines.slice(1);
        
        const parsed = dataRows.map(row => {
          const cols = row.split(',').map(c => c.replace(/['"]/g, '').trim());
          if (cols.length < 3) return null;
          return { region: cols[1].replace(/\s/g, ''), total: parseInt(cols[2], 10) || 0 };
        }).filter(Boolean);

        if (parsed.length > 0) {
          const maxEnrollment = Math.max(...parsed.map(d => d.total));
          const yearData = {};
          
          parsed.forEach(d => {
            const gapIndex = 100 - (d.total / maxEnrollment * 100);
            const roundedIndex = parseFloat(gapIndex.toFixed(1));
            
            let color = '#15803D'; 
            if (roundedIndex >= 80) color = '#EF4444'; 
            else if (roundedIndex >= 60) color = '#F97316'; 
            else if (roundedIndex >= 40) color = '#EAB308'; 
            else if (roundedIndex >= 20) color = '#84CC16'; 

            yearData[d.region] = { ...d, gapIndex: roundedIndex, color };
          });
          dataMap[year] = yearData;
        }
      });
      setAllYearsData(dataMap);
    });
  }, []);

  // 맵 클릭 이벤트 핸들러 (전국 단위 -> 시도 클릭 시 줌인)
  const handleProvinceClick = (geo) => {
    const provNameFull = geo.properties.name;
    const shortName = nameMapping[provNameFull] || provNameFull;
    const config = PROVINCE_MAP_CONFIG[shortName];

    setSelectedRegion(shortName);
    setSelectedMunicipality(null);

    if (config) {
      setMapCenter(config.center);
      setMapZoom(config.zoom);
      setSelectedProvCode(config.code);
      setMapView('province');
    }
  };

  // 맵 클릭 이벤트 핸들러 (시군구 단위 클릭 시 정보 업데이트)
  const handleMunicipalityClick = (geo) => {
    // 클릭한 시군구가 현재 포커스된 시도 소속인 경우에만 선택
    if (geo.properties.code.startsWith(selectedProvCode)) {
      setSelectedMunicipality(geo.properties.name);
    }
  };

  // 맵 리셋 핸들러 (전체 보기)
  const handleResetMap = () => {
    setMapCenter([127.5, 36]);
    setMapZoom(1.5);
    setSelectedProvCode(null);
    setMapView('national');
    setSelectedMunicipality(null);
  };


  const currentYearDataMap = allYearsData[selectedYear] || {};
  const currentYearRegions = Object.values(currentYearDataMap);
  const topRegions = [...currentYearRegions].sort((a, b) => b.gapIndex - a.gapIndex).slice(0, 5);
  
  let nationalAvg = 0, highGapCount = 0;
  if (currentYearRegions.length > 0) {
    nationalAvg = (currentYearRegions.reduce((acc, cur) => acc + cur.gapIndex, 0) / currentYearRegions.length).toFixed(1);
    highGapCount = currentYearRegions.filter(d => d.gapIndex >= 60).length;
  }

  const selData = currentYearDataMap[selectedRegion] || { gapIndex: 0, color: '#94A3B8', total: 0 };
  const trendYears = [2019, 2020, 2021, 2022, 2023, 2024];
  const trendData = trendYears.map((year, idx) => {
    const yData = Object.values(allYearsData[year] || {});
    let avg = yData.length > 0 ? parseFloat((yData.reduce((acc, cur) => acc + cur.gapIndex, 0) / yData.length).toFixed(1)) : 0;
    return { year, value: avg, x: 40 + idx * 48, y: avg > 0 ? 110 - (avg * 0.8) : 100 };
  });

  return (
    <div className="dashboard-layout">
      {/* 1. 사이드바 */}
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
          <div className="nav-item">지도 보기</div>
          <div className="nav-item">지역 분석</div>
          <div className="nav-item">재난 위험 분석</div>
          <div className="nav-item">데이터 다운로드</div>
        </nav>
        <div className="protection-gap-info">
          <h4>보험보장공백(Protection Gap)</h4>
          <p>재난위험이 높고 취약성이 크지만 보험 가입·보장 수준이 낮은 지역을 의미합니다.</p>
        </div>
      </aside>

      {/* 2. 메인 영역 */}
      <div className="main-area">
        <header className="header">
          <div className="header-left">
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ fontWeight: 'bold' }}>
              {trendYears.slice().reverse().map(y => <option key={y} value={y}>{y}년 전국 데이터</option>)}
            </select>
          </div>
          <div className="header-right">
            <span>데이터 연동 완료 (2019-2024)</span>
            <button className="header-btn">ⓘ 데이터 안내</button>
          </div>
        </header>

        <main className="content-wrapper">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#3B82F6'}}><i className="icon-chart">📈</i></div>
              <div className="stat-info">
                <p>전국 평균 보장공백 지수 ({selectedYear}년)</p>
                <h2>{nationalAvg || '-'} <span>/100</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#EF4444', backgroundColor: '#FEF2F2'}}>⚠️</div>
              <div className="stat-info">
                <p>보장공백 심각 지역 수</p>
                <h2>{highGapCount || 0} <span>개 지역</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#3B82F6'}}>🏢</div>
              <div className="stat-info">
                <p>분석 지역 수</p>
                <h2>{currentYearRegions.length || 0} <span>개 시·도</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#10B981', backgroundColor: '#ECFDF5'}}>🗄️</div>
              <div className="stat-info">
                <p>데이터 수집 항목</p>
                <h2>28 <span>개 항목</span></h2>
              </div>
            </div>
          </div>

          <div className="main-content-grid">
            <div className="left-column">
              
              {/* 지도 렌더링 영역 (React-Simple-Maps 적용) */}
              <div className="map-card" style={{ overflow: 'hidden' }}>
                <h3>
                  {selectedYear}년 지역별 보험보장공백 지수 ⓘ 
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
                  <p style={{marginBottom: '8px', fontWeight: 'bold'}}>보장공백 지수</p>
                  <div className="legend-item"><div className="legend-color" style={{background: '#EF4444'}}></div> 80 - 100 (매우 높음)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#F97316'}}></div> 60 - 80 (높음)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#EAB308'}}></div> 40 - 60 (보통)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#84CC16'}}></div> 20 - 40 (낮음)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#15803D'}}></div> 0 - 20 (매우 낮음)</div>
                </div>

                <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
                  <ComposableMap 
                    projection="geoMercator" 
                    projectionConfig={{ scale: 4500, center: [127.5, 36] }}
                    style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                  >
                    <ZoomableGroup center={mapCenter} zoom={mapZoom} disablePanning>
                      
                      {/* 전국 단위 시도 렌더링 */}
                      {mapView === 'national' && (
                        <Geographies geography={KOREA_PROVINCE_URL}>
                          {({ geographies }) =>
                            geographies.map((geo) => {
                              const shortName = nameMapping[geo.properties.name] || geo.properties.name;
                              const d = currentYearDataMap[shortName];
                              return (
                                <Geography
                                  key={geo.rsmKey}
                                  geography={geo}
                                  onClick={() => handleProvinceClick(geo)}
                                  className="geography-path"
                                  style={{
                                    default: { fill: d ? d.color : "#374151", stroke: "#1C2B44", strokeWidth: 0.5, outline: "none" },
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

                      {/* 시군구 단위 렌더링 (줌인 상태) */}
                      {mapView === 'province' && (
                        <Geographies geography={KOREA_MUNI_URL}>
                          {({ geographies }) =>
                            geographies.map((geo) => {
                              const isSelectedProv = geo.properties.code.startsWith(selectedProvCode);
                              const isClickedMuni = selectedMunicipality === geo.properties.name;
                              const d = currentYearDataMap[selectedRegion]; // 시군구 데이터 부재로 상위 시도 데이터 상속

                              return (
                                <Geography
                                  key={geo.rsmKey}
                                  geography={geo}
                                  onClick={() => handleMunicipalityClick(geo)}
                                  className="geography-path"
                                  style={{
                                    default: {
                                      fill: isSelectedProv ? (d ? d.color : "#4B5563") : "#1F2937",
                                      stroke: isSelectedProv ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)",
                                      strokeWidth: isSelectedProv ? (isClickedMuni ? 2 : 0.3) : 0.1,
                                      outline: "none"
                                    },
                                    hover: { 
                                      fill: isSelectedProv ? "#3B82F6" : "#1F2937", 
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
              </div>

              {/* 하단 차트 */}
              <div className="bottom-charts-row">
                {/* 재난군별 위험도 분포 (생략 유지) */}
                <div className="chart-card">
                  <h3>재난군별 위험도 분포 ({selectedYear}년)</h3>
                  <div className="donut-charts-wrap">
                    {[{name:'수재해', v:64.8, c:'#3B82F6'}, {name:'풍재해', v:52.3, c:'#14B8A6'}, {name:'산림·토사', v:34.7, c:'#10B981'}, {name:'기후재해', v:57.9, c:'#F97316'}].map(item => (
                      <div className="donut-item" key={item.name}>
                        <p>{item.name}</p>
                        <svg viewBox="0 0 100 100" width="55" height="55">
                          <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                          <circle cx="50" cy="50" r="40" stroke={item.c} strokeWidth="12" fill="none" strokeDasharray={`${(item.v/100)*251.2} 251.2`} transform="rotate(-90 50 50)" />
                          <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold">{item.v}</text>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TOP 5 차트 (생략 유지) */}
                <div className="chart-card">
                  <h3>보장공백 지수 TOP 5 ({selectedYear}년)</h3>
                  <div style={{ marginTop: '16px' }}>
                    {topRegions.map((region, idx) => (
                      <div className="bar-row" key={region.name}>
                        <span style={{width:'15px', fontSize:'12px', color:'#94A3B8'}}>{idx + 1}</span>
                        <span className="bar-label">{region.region}</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{width: `${region.gapIndex}%`, backgroundColor: region.color}}></div>
                        </div>
                        <span className="bar-value">{region.gapIndex}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 트렌드 차트 (생략 유지) */}
                <div className="chart-card">
                  <h3>연도별 보장공백 지수 추이</h3>
                  <svg viewBox="0 0 320 120" width="100%" height="120">
                    <line x1="40" y1="100" x2="280" y2="100" stroke="#E5E7EB" />
                    <polyline fill="none" stroke="#3B82F6" strokeWidth="2" points={trendData.filter(d=>d.value>0).map(d => `${d.x},${d.y}`).join(' ')} />
                    {trendData.map((d, i) => d.value > 0 && (
                      <g key={i}>
                        <circle cx={d.x} cy={d.y} r={selectedYear === d.year ? "6" : "4"} fill={selectedYear === d.year ? "#EF4444" : "#3B82F6"} />
                        <text x={d.x} y={d.y - 12} textAnchor="middle" fontSize="10" fontWeight={selectedYear === d.year ? "bold" : "normal"} fill={selectedYear === d.year ? "#EF4444" : "#1F2937"}>{d.value}</text>
                        <text x={d.x} y="115" textAnchor="middle" fontSize="10" fill={selectedYear === d.year ? "#1F2937" : "#6B7280"}>{d.year}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            {/* 우측 상세정보 컬럼 */}
            <div className="right-column">
              <div className="detail-card">
                <div className="detail-header">
                  <h3>선택 지역 상세 정보</h3>
                </div>
                
                <div className="region-title">
                  <h2>📍 {selectedRegion} {selectedMunicipality && ` ${selectedMunicipality}`}</h2>
                  {selData.gapIndex >= 80 && <span className="badge-red">위험 지역</span>}
                </div>

                <div className="radar-section">
                  <div className="index-score">
                    <p>보험보장공백 지수</p>
                    <h1 style={{ color: selData.color }}>
                      {selData.gapIndex} <span>/100</span>
                    </h1>
                  </div>
                  {/* 방사형 차트 Placeholder */}
                  <div style={{ width: '150px', height: '150px' }}>
                     <svg viewBox="0 0 200 200" width="100%" height="100%">
                        <polygon points="100,20 170,60 170,140 100,180 30,140 30,60" fill="none" stroke="#E5E7EB" />
                        <polygon points="100,60 135,80 135,120 100,140 65,120 65,80" fill="none" stroke="#E5E7EB" />
                        <line x1="100" y1="20" x2="100" y2="180" stroke="#E5E7EB" />
                        <line x1="30" y1="60" x2="170" y2="140" stroke="#E5E7EB" />
                        <line x1="30" y1="140" x2="170" y2="60" stroke="#E5E7EB" />
                        <polygon points="100,30 150,70 160,130 100,160 50,110 70,70" fill={selData.color} fillOpacity="0.2" stroke={selData.color} strokeWidth="2" />
                        <text x="100" y="15" textAnchor="middle" fontSize="10">수재해</text>
                        <text x="180" y="60" fontSize="10">풍재해</text>
                        <text x="100" y="195" textAnchor="middle" fontSize="10">기후재해</text>
                     </svg>
                  </div>
                </div>

                <div className="metrics-grid">
                  <div className="metric-box">
                    <p>상세 가입건수</p>
                    <h4 style={{fontSize: '14px'}}>{selData.total?.toLocaleString() || 0} <span className="tag-mid">건</span></h4>
                  </div>
                  <div className="metric-box">
                    <p>취약성 지수</p>
                    <h4>72.6 <span className="tag-high">높음</span></h4>
                  </div>
                  <div className="metric-box">
                    <p>노출도 지수</p>
                    <h4>63.4 <span className="tag-mid">보통</span></h4>
                  </div>
                  <div className="metric-box">
                    <p>보장 수준</p>
                    <h4>31.2 <span className="tag-low">낮음</span></h4>
                  </div>
                </div>

                <div className="ai-insight">
                  <h4>✨ AI 인사이트</h4>
                  <p>
                    선택하신 <b>{selectedRegion}{selectedMunicipality ? ` ${selectedMunicipality}` : ''}</b>의 {selectedYear}년 통계입니다. 
                    {selectedMunicipality && 
                      <span style={{color: '#EA580C', display: 'block', marginTop: '6px'}}>
                        * {selectedMunicipality}의 자체 데이터가 제공되지 않아, 상위 행정구역인 {selectedRegion} 전체 데이터가 출력됩니다.
                      </span>
                    }
                  </p>
                </div>

                <div>
                  <p style={{fontSize:'12px', fontWeight:'bold', marginBottom:'12px'}}>추천 전략</p>
                  <div className="strategy-tags">
                    <span>풍수해보험 가입 확대</span>
                    <span>취약계층 대상 보험 홍보</span>
                    <span>지역 맞춤형 상품 개발</span>
                  </div>
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