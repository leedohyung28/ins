import React, { useMemo, useState } from "react";
import { CALCULATION_OPTIONS } from "../config";
import { formatNumber } from "../utils/formatters";
import { processRatioMapData } from "../utils/mapData";
import KoreaMap from "./KoreaMap";

const RatioMapView = ({
  currentMapData,
  mapView,
  mapCenter,
  mapZoom,
  selectedProvCode,
  onProvinceClick,
  onResetMap,
}) => {
  const [numeratorIndex, setNumeratorIndex] = useState(0);
  const [denominatorIndex, setDenominatorIndex] = useState(1);
  const [hoveredResult, setHoveredResult] = useState(null);

  const numerator = CALCULATION_OPTIONS[numeratorIndex];
  const denominator = CALCULATION_OPTIONS[denominatorIndex];

  const ratioData = useMemo(
    () => processRatioMapData(currentMapData, numerator.id, denominator.id),
    [currentMapData, denominator.id, numerator.id],
  );

  const handleRegionEnter = (regionName, processedRow) => {
    const sourceRow = currentMapData[regionName];
    if (!processedRow || processedRow.displayValue === "-" || !sourceRow) {
      setHoveredResult({
        region: regionName,
        value: null,
        numeratorValue: null,
        denominatorValue: null,
      });
      return;
    }

    setHoveredResult({
      region: regionName,
      value: processedRow.displayValue,
      numeratorValue: sourceRow[numerator.id],
      denominatorValue: sourceRow[denominator.id],
    });
  };

  return (
    <div className="ratio-analysis-layout">
      <section className="map-card ratio-map-card">
        <h3>사용자 정의 지표 비교 분석</h3>
        {mapView === "province" && (
          <button type="button" className="map-back-btn" onClick={onResetMap}>
            ← 전국 지도
          </button>
        )}
        <KoreaMap
          mapView={mapView}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          selectedProvCode={selectedProvCode}
          processedData={ratioData.processedData}
          onProvinceClick={onProvinceClick}
          onRegionEnter={handleRegionEnter}
          onRegionLeave={() => setHoveredResult(null)}
          heightClass="ratio-map-canvas"
        />
      </section>

      <aside className="ratio-side-panel">
        <section className="detail-card formula-card">
          <h3>분석 수식 설정</h3>
          <label>
            <span>분자 (Numerator)</span>
            <select
              value={numeratorIndex}
              onChange={(event) =>
                setNumeratorIndex(Number(event.target.value))
              }
            >
              {CALCULATION_OPTIONS.map((option, index) => (
                <option key={option.id} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="formula-divider" />
          <label>
            <span>분모 (Denominator)</span>
            <select
              value={denominatorIndex}
              onChange={(event) =>
                setDenominatorIndex(Number(event.target.value))
              }
            >
              {CALCULATION_OPTIONS.map((option, index) => (
                <option key={option.id} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="detail-card realtime-result-card">
          <h3>실시간 계산 결과</h3>
          <div className="realtime-result-box">
            {hoveredResult ? (
              <>
                <p className="ratio-region-name">{hoveredResult.region}</p>
                {hoveredResult.value !== null ? (
                  <>
                    <div className="ratio-operands">
                      <span>
                        <em>{numerator.label}</em>
                        {formatNumber(hoveredResult.numeratorValue)}
                      </span>
                      <hr />
                      <span>
                        <em>{denominator.label}</em>
                        {formatNumber(hoveredResult.denominatorValue)}
                      </span>
                    </div>
                    <strong className="ratio-value">
                      {Number(hoveredResult.value).toFixed(4)}
                    </strong>
                  </>
                ) : (
                  <strong className="ratio-value no-data">데이터 없음</strong>
                )}
              </>
            ) : (
              <p className="ratio-empty-message">
                지도에서 지역에 마우스를 올리면 결과가 표시됩니다.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
};

export default RatioMapView;
