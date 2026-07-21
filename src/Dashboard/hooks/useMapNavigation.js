import { useState } from "react";
import { DEFAULT_MAP, NAME_MAPPING, PROVINCE_MAP_CONFIG } from "../config";

export const useMapNavigation = () => {
  const [selectedRegion, setSelectedRegion] = useState("서울");
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [hoveredMunicipality, setHoveredMunicipality] = useState(null);
  const [mapView, setMapView] = useState("national");
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP.center);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP.zoom);
  const [selectedProvCode, setSelectedProvCode] = useState(null);

  const handleProvinceClick = (geography) => {
    const fullName = geography.properties.name;
    const shortName = NAME_MAPPING[fullName] || fullName;
    const mapConfig = PROVINCE_MAP_CONFIG[shortName];

    setSelectedRegion(shortName);
    setSelectedMunicipality(null);
    setHoveredRegion(null);
    setHoveredMunicipality(null);

    if (!mapConfig) return;
    setMapCenter(mapConfig.center);
    setMapZoom(mapConfig.zoom);
    setSelectedProvCode(mapConfig.code);
    setMapView("province");
  };

  const handleMunicipalityClick = (geography) => {
    const code = String(geography.properties.code || "");
    if (selectedProvCode && code.startsWith(selectedProvCode)) {
      setSelectedMunicipality(geography.properties.name);
    }
  };

  const handleResetMap = () => {
    setMapCenter(DEFAULT_MAP.center);
    setMapZoom(DEFAULT_MAP.zoom);
    setSelectedProvCode(null);
    setMapView("national");
    setSelectedMunicipality(null);
    setHoveredMunicipality(null);
  };

  return {
    selectedRegion,
    selectedMunicipality,
    hoveredRegion,
    setHoveredRegion,
    hoveredMunicipality,
    setHoveredMunicipality,
    mapView,
    mapCenter,
    mapZoom,
    selectedProvCode,
    handleProvinceClick,
    handleMunicipalityClick,
    handleResetMap,
  };
};
