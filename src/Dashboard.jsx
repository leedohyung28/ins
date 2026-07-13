import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [regionData, setRegionData] = useState({});
  const [topRegions, setTopRegions] = useState([]);
  const [nationalAvg, setNationalAvg] = useState(0);
  const [highGapCount, setHighGapCount] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState('서울');

  // 대한민국을 형상화한 직관적인 타일 그리드 맵 좌표
  const MAP_GRID = [
    { id: '서울', x: 1, y: 0 }, { id: '경기', x: 2, y: 0 }, { id: '강원', x: 3, y: 0 },
    { id: '인천', x: 0, y: 1 }, { id: '세종', x: 1, y: 1 }, { id: '충북', x: 2, y: 1 }, { id: '경북', x: 3, y: 1 },
    { id: '충남', x: 0, y: 2 }, { id: '대전', x: 1, y: 2 }, { id: '대구', x: 2, y: 2 }, { id: '울산', x: 3, y: 2 },
    { id: '전북', x: 1, y: 3 }, { id: '경남', x: 2, y: 3 }, { id: '부산', x: 3, y: 3 },
    { id: '광주', x: 1, y: 4 }, { id: '전남', x: 2, y: 4 },
    { id: '제주', x: 1, y: 6 }
  ];

  useEffect(() => {
    // public/data/2024data.csv 파일을 불러옵니다.
    fetch('/data/2024data.csv')
      .then(res => {
        if (!res.ok) throw new Error("CSV 파일을 찾을 수 없습니다.");
        return res.arrayBuffer(); // 한글 인코딩 처리를 위해 버퍼로 읽기
      })
      .then(buffer => {
        // 공공데이터 CSV는 주로 euc-kr로 되어있으므로 깨짐 방지 디코딩
        let decoder = new TextDecoder('utf-8');
        let csvText = decoder.decode(buffer);
        if (csvText.includes('')) {
          decoder = new TextDecoder('euc-kr');
          csvText = decoder.decode(buffer);
        }

        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        const dataRows = lines.slice(1);
        
        const parsed = dataRows.map(row => {
          // 따옴표 및 공백 제거 (예: "서 울" -> "서울")
          const cols = row.split(',').map(c => c.replace(/['"]/g, '').trim());
          if (cols.length < 3) return null;
          
          return {
            year: cols[0],
            region: cols[1].replace(/\s/g, ''),
            total: parseInt(cols[2], 10) || 0
          };
        }).filter(Boolean);

        if (parsed.length === 0) return;

        // 보장공백 지수 산출 (Proxy: 지역별 최대 가입건수를 100점으로 두고 역산)
        const maxEnrollment = Math.max(...parsed.map(d => d.total));
        
        let avgSum = 0;
        let highCount = 0;
        const rMap = {};
        const rArray = [];

        parsed.forEach(d => {
          const gapIndex = 100 - (d.total / maxEnrollment * 100);
          const roundedIndex = parseFloat(gapIndex.toFixed(1));
          
          // 지수에 따른 색상 부여
          let color = '#15803D'; // 0-20 매우 낮음
          if (roundedIndex >= 80) color = '#EF4444'; // 매움 높음
          else if (roundedIndex >= 60) color = '#F97316'; // 높음
          else if (roundedIndex >= 40) color = '#EAB308'; // 보통
          else if (roundedIndex >= 20) color = '#84CC16'; // 낮음

          if (roundedIndex >= 60) highCount++;

          rMap[d.region] = { ...d, gapIndex: roundedIndex, color };
          rArray.push({ name: d.region, gapIndex: roundedIndex, total: d.total, color });
          avgSum += roundedIndex;
        });

        setRegionData(rMap);
        setTopRegions(rArray.sort((a, b) => b.gapIndex - a.gapIndex).slice(0, 5));
        setNationalAvg((avgSum / rArray.length).toFixed(1));
        setHighGapCount(highCount);
      })
      .catch(err => console.error("CSV Load Error:", err));
  }, []);

  // 모의 트렌드 데이터에 2024년 전국 평균 결합
  const trendData = [
    { year: 2021, value: 52.6, x: 40, y: 76.9 },
    { year: 2022, value: 73.6, x: 100, y: 51.7 },
    { year: 2023, value: 81.0, x: 160, y: 42.8 },
    { year: 2024, value: nationalAvg || 72.7, x: 220, y: 52.8 }, 
    { year: 2025, value: 85.0, x: 280, y: 38.0 }
  ];

  // 선택된 지역의 상세 데이터 추출 (데이터 로딩 전 기본값 처리)
  const selData = regionData[selectedRegion] || { gapIndex: 0, color: '#94A3B8' };

  return (
    <div className="dashboard-layout">
      {/* 1. 사이드바 */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
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
        {/* 헤더 */}
        <header className="header">
          <div className="header-left">
            <select><option>전국 (2024 데이터 연동)</option></select>
          </div>
          <div className="header-right">
            <span>최종 업데이트 : 2024.12.31</span>
            <button className="header-btn">ⓘ 데이터 안내</button>
          </div>
        </header>

        {/* 컨텐츠 래퍼 */}
        <main className="content-wrapper">
          {/* 상단 통계 카드 */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#3B82F6'}}><i className="icon-chart">📈</i></div>
              <div className="stat-info">
                <p>전국 평균 보장공백 지수</p>
                <h2>{nationalAvg || '56.7'} <span>/100</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#EF4444', backgroundColor: '#FEF2F2'}}>⚠️</div>
              <div className="stat-info">
                <p>보장공백 심각 지역 수</p>
                <h2>{highGapCount || 0} <span>개 지역 (60점 이상)</span></h2>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{color: '#3B82F6'}}>🏢</div>
              <div className="stat-info">
                <p>분석 지역 수</p>
                <h2>{Object.keys(regionData).length || 17} <span>개 시·도</span></h2>
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
            {/* 좌측 컬럼 */}
            <div className="left-column">
              {/* 지도 영역 */}
              <div className="map-card">
                <h3>지역별 보험보장공백 지수 ⓘ <span style={{fontSize:'12px', color:'#94A3B8'}}>(클릭하여 상세 조회)</span></h3>
                
                <div className="map-legend">
                  <p style={{marginBottom: '8px', fontWeight: 'bold'}}>보장공백 지수</p>
                  <div className="legend-item"><div className="legend-color" style={{background: '#EF4444'}}></div> 80 - 100 (매우 높음)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#F97316'}}></div> 60 - 80 (높음)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#EAB308'}}></div> 40 - 60 (보통)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#84CC16'}}></div> 20 - 40 (낮음)</div>
                  <div className="legend-item"><div className="legend-color" style={{background: '#15803D'}}></div> 0 - 20 (매우 낮음)</div>
                </div>

                {/* CSV 데이터 연동된 대한민국 타일 그리드 맵 */}
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 300 450" width="100%" height="100%">
                    {MAP_GRID.map(cell => {
                      const data = regionData[cell.id];
                      const bgColor = data ? data.color : '#374151'; 
                      const gapVal = data ? data.gapIndex : '-';
                      
                      const px = 20 + cell.x * 65;
                      const py = 10 + cell.y * 60;
                      const isActive = selectedRegion === cell.id;

                      return (
                        <g 
                          key={cell.id} 
                          className={`map-grid-item ${isActive ? 'active' : ''}`} 
                          onClick={() => data && setSelectedRegion(cell.id)}
                        >
                          <rect x={px} y={py} width="55" height="50" rx="8" fill={bgColor} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                          <text x={px + 27.5} y={py + 22} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{cell.id}</text>
                          <text x={px + 27.5} y={py + 40} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11">{gapVal}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* 하단 차트 */}
              <div className="bottom-charts-row">
                <div className="chart-card">
                  <h3>재난군별 위험도 분포 (전국)</h3>
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

                <div className="chart-card">
                  <h3>보장공백 지수 TOP 5 지역</h3>
                  <div style={{ marginTop: '16px' }}>
                    {topRegions.map((region, idx) => (
                      <div className="bar-row" key={region.name}>
                        <span style={{width:'15px', fontSize:'12px', color:'#94A3B8'}}>{idx + 1}</span>
                        <span className="bar-label">{region.name}</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{width: `${region.gapIndex}%`, backgroundColor: region.color}}></div>
                        </div>
                        <span className="bar-value">{region.gapIndex}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <h3>연도별 보장공백 지수 추이</h3>
                  <svg viewBox="0 0 320 120" width="100%" height="120">
                    <line x1="40" y1="100" x2="280" y2="100" stroke="#E5E7EB" />
                    <polyline fill="none" stroke="#3B82F6" strokeWidth="2" points={trendData.map(d => `${d.x},${d.y}`).join(' ')} />
                    {trendData.map((d, i) => (
                      <g key={i}>
                        <circle cx={d.x} cy={d.y} r="4" fill="#3B82F6" />
                        <text x={d.x} y={d.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold">{d.value}</text>
                        <text x={d.x} y="115" textAnchor="middle" fontSize="10" fill="#6B7280">{d.year}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            {/* 우측 상세정보 컬럼 (지도 클릭 시 동적 변경) */}
            <div className="right-column">
              <div className="detail-card">
                <div className="detail-header">
                  <h3>선택 지역 상세 정보</h3>
                </div>
                
                <div className="region-title">
                  <h2>📍 {selectedRegion}</h2>
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
                    <p>가입건수 (24년)</p>
                    <h4 style={{fontSize: '14px'}}>{selData.total?.toLocaleString()} <span className="tag-mid">건</span></h4>
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
                  <p>선택하신 <b>{selectedRegion}</b> 지역의 2024년 총 가입건수는 {selData.total?.toLocaleString()}건이며 보장공백 지수는 {selData.gapIndex}점입니다. 해당 지역의 실데이터를 바탕으로 보험 가입률을 높이기 위한 세부 전략 수립이 필요합니다.</p>
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