import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import {
  KOREA_MUNICIPALITY_URL,
  KOREA_PROVINCE_URL,
  NAME_MAPPING,
} from "../config";

const OUTSIDE_PROVINCE_COLOR = "#1F2937";
const NO_DATA_COLOR = "#94A3B8";

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
                  style={{
                    default: {
                      fill,
                      stroke:
                        mapView === "national"
                          ? "#1C2B44"
                          : isSelectedProvince
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.05)",
                      strokeWidth:
                        mapView === "national"
                          ? 0.5
                          : isSelectedMunicipality
                            ? 2
                            : isSelectedProvince
                              ? 0.3
                              : 0.1,
                      outline: "none",
                    },
                    hover: {
                      fill: isSelectedProvince
                        ? row
                          ? "#3B82F6"
                          : "#4B5563"
                        : OUTSIDE_PROVINCE_COLOR,
                      stroke: mapView === "national" ? "#FFFFFF" : undefined,
                      strokeWidth: mapView === "national" ? 1 : undefined,
                      cursor: isInteractive ? "pointer" : "default",
                      outline: "none",
                    },
                    pressed: {
                      fill: isSelectedProvince
                        ? "#2563EB"
                        : OUTSIDE_PROVINCE_COLOR,
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
