import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import {
  KOREA_MUNICIPALITY_URL,
  KOREA_PROVINCE_URL,
  NAME_MAPPING,
} from "../config";

const OUTSIDE_PROVINCE_COLOR = "#1F2937";
const NO_DATA_COLOR = "#94A3B8";

// Map boundary styles. Municipality borders need at least about 1 SVG unit
// to remain visible after the map is fitted into the dashboard card.
const NATIONAL_BORDER_COLOR = "#0F172A";
const MUNICIPALITY_BORDER_COLOR = "#000000";
const OUTSIDE_BORDER_COLOR = "rgba(255,255,255,0.08)";

const KoreaMap = ({
  mapView,
  mapCenter,
  mapZoom,
  selectedProvCode,
  processedData,
  selectedMunicipality,
  onProvinceClick,
  onMunicipalityClick,
  onRegionEnter,
  onRegionLeave,
  enableMunicipalityClick = false,
  heightClass = "",
}) => {
  const geographyUrl =
    mapView === "national" ? KOREA_PROVINCE_URL : KOREA_MUNICIPALITY_URL;

  return (
    <div className={`korea-map ${heightClass}`.trim()}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 4500 * mapZoom, center: mapCenter }}
        className="korea-map-svg"
      >
        <Geographies geography={geographyUrl}>
          {({ geographies }) =>
            geographies.map((geography) => {
              const code = String(geography.properties.code || "");
              const name =
                mapView === "national"
                  ? NAME_MAPPING[geography.properties.name] ||
                    geography.properties.name
                  : geography.properties.name;
              const isSelectedProvince =
                mapView === "national" ||
                (selectedProvCode && code.startsWith(selectedProvCode));
              const isSelectedMunicipality =
                mapView === "province" && selectedMunicipality === name;
              const row = processedData[name];
              const fill = isSelectedProvince
                ? row?.color || NO_DATA_COLOR
                : OUTSIDE_PROVINCE_COLOR;

              const isInteractive =
                mapView === "national" ||
                (isSelectedProvince && enableMunicipalityClick);

              const defaultStroke =
                mapView === "national"
                  ? NATIONAL_BORDER_COLOR
                  : isSelectedProvince
                    ? isSelectedMunicipality
                      ? "#FFFFFF"
                      : MUNICIPALITY_BORDER_COLOR
                    : OUTSIDE_BORDER_COLOR;

              const defaultStrokeWidth =
                mapView === "national"
                  ? 0.8
                  : isSelectedProvince
                    ? isSelectedMunicipality
                      ? 2.2
                      : 1.05
                    : 0.15;

              return (
                <Geography
                  key={geography.rsmKey}
                  geography={geography}
                  className="geography-path"
                  onClick={() => {
                    if (mapView === "national") onProvinceClick?.(geography);
                    if (
                      mapView === "province" &&
                      isSelectedProvince &&
                      enableMunicipalityClick
                    ) {
                      onMunicipalityClick?.(geography);
                    }
                  }}
                  onMouseEnter={() => {
                    if (isSelectedProvince) {
                      onRegionEnter?.(name, row, geography);
                    }
                  }}
                  onMouseLeave={() => onRegionLeave?.()}
                  vectorEffect="non-scaling-stroke"
                  shapeRendering="geometricPrecision"
                  style={{
                    default: {
                      fill,
                      stroke: defaultStroke,
                      strokeWidth: defaultStrokeWidth,
                      strokeLinejoin: "round",
                      strokeLinecap: "round",
                      outline: "none",
                    },
                    hover: {
                      fill: isSelectedProvince
                        ? row
                          ? "#3B82F6"
                          : "#4B5563"
                        : OUTSIDE_PROVINCE_COLOR,
                      stroke: isSelectedProvince ? "#FFFFFF" : defaultStroke,
                      strokeWidth: isSelectedProvince
                        ? mapView === "national"
                          ? 1.4
                          : 1.7
                        : defaultStrokeWidth,
                      strokeLinejoin: "round",
                      strokeLinecap: "round",
                      cursor: isInteractive ? "pointer" : "default",
                      outline: "none",
                    },
                    pressed: {
                      fill: isSelectedProvince
                        ? "#2563EB"
                        : OUTSIDE_PROVINCE_COLOR,
                      stroke: isSelectedProvince ? "#FFFFFF" : defaultStroke,
                      strokeWidth: isSelectedProvince ? 2 : defaultStrokeWidth,
                      strokeLinejoin: "round",
                      strokeLinecap: "round",
                      outline: "none",
                    },
                  }}
                  title={isSelectedProvince ? name : ""}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
};

export default KoreaMap;
