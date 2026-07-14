import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { ZoomIn, ZoomOut, Compass, MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import type { Cafe, FilterState } from '../types/cafe';
import { createMarkerIcon, getMarkerTier, getZIndexOffset } from './MapMarker';
import MapSearch from './MapSearch';

interface MapViewProps {
  cafes: Cafe[];
  filters: FilterState;
  selectedCafe: Cafe | null;
  onCafeClick: (cafe: Cafe) => void;
}

const MapControls: React.FC<{ 
  filteredCount: number; 
  totalCount: number;
  userLocation: [number, number] | null;
  setUserLocation: (loc: [number, number] | null) => void;
}> = ({ filteredCount, totalCount, userLocation, setUserLocation }) => {
  const map = useMap();
  const [isLocating, setIsLocating] = React.useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation.');
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
        map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Tidak dapat mendeteksi lokasi. Pastikan izin lokasi aktif.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <>
      {/* Custom Map Controls — on phones sit below the search bar (which spans
          most of the width) so the two don't overlap. */}
      <div className="absolute right-4 sm:right-6 top-40 sm:top-36 flex flex-col gap-2 z-[400]">
        <button
          onClick={() => map.zoomIn()}
          title="Zoom In"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 bg-white/95 sm:bg-white/90 sm:backdrop-blur-md text-purple-600 hover:text-purple-800"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => map.zoomOut()}
          title="Zoom Out"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 bg-white/95 sm:bg-white/90 sm:backdrop-blur-md text-purple-600 hover:text-purple-800"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => map.flyTo([-7.4245, 109.2302], 14)}
          title="Reset View"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 bg-white/95 sm:bg-white/90 sm:backdrop-blur-md text-purple-600 hover:text-purple-800"
        >
          <Compass size={16} />
        </button>
        <button
          onClick={handleLocateMe}
          title="Lokasi Saya"
          disabled={isLocating}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 bg-white/95 sm:bg-white/90 sm:backdrop-blur-md ${userLocation ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'} ${isLocating ? 'animate-pulse' : ''}`}
        >
          <Navigation size={16} className={userLocation ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Cafe count badge */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold shadow-xl bg-white/95 sm:bg-white/90 sm:backdrop-blur-md z-[400]">
        <MapPin size={14} className="text-purple-600" />
        <span className="text-gray-600">
          <span className="font-bold text-gray-900">{filteredCount}</span>
          {' '}cafe di Purwokerto
        </span>
        {filteredCount < totalCount && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-600 border border-purple-200 uppercase tracking-wide">
            Difilter
          </span>
        )}
      </div>

      {/* Attribution */}
      <div className="absolute bottom-1 right-2 sm:right-6 sm:bottom-2 px-2 py-1 rounded-md pointer-events-none text-[10px] font-medium text-gray-500 z-[400] bg-white/80 sm:bg-white/60 sm:backdrop-blur-sm">
        © Peta Cafe Purwokerto • Semeja Kerja
      </div>
    </>
  );
};

// Centers the map on the cafe from the URL (deep links + marker clicks).
const FlyToCafe: React.FC<{ cafe: Cafe | null }> = ({ cafe }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!cafe) return;
    const zoom = 16;
    // On phones the detail sheet covers the lower ~50vh, so nudge the map
    // target down (center below the pin) to keep the tapped cafe in the
    // visible upper strip instead of behind the sheet.
    if (window.innerWidth < 768) {
      const pt = map.project([cafe.lat, cafe.lng], zoom);
      const target = map.unproject(pt.add([0, map.getSize().y * 0.25]), zoom);
      map.flyTo(target, zoom, { animate: true, duration: 1.2 });
    } else {
      map.flyTo([cafe.lat, cafe.lng], zoom, { animate: true, duration: 1.2 });
    }
  }, [cafe, map]);
  return null;
};

// Reports the settled viewport (moveend fires after pan, zoom and flyTo) so
// MapView can cull markers. Panning itself never re-renders React.
const ViewportWatcher: React.FC<{
  onChange: (bounds: L.LatLngBounds, zoom: number) => void;
}> = ({ onChange }) => {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds(), map.getZoom()),
  });
  React.useEffect(() => {
    onChange(map.getBounds(), map.getZoom());
  }, [map, onChange]);
  return null;
};

// One marker per cafe, memoized: re-renders only when the cafe object or the
// click handler actually changes, never from unrelated MapView state.
const CafeMarker = React.memo(function CafeMarker({
  cafe,
  onCafeClick,
}: {
  cafe: Cafe;
  onCafeClick: (cafe: Cafe) => void;
}) {
  const tier = getMarkerTier(cafe);
  return (
    <Marker
      position={[cafe.lat, cafe.lng]}
      icon={createMarkerIcon(cafe, tier)}
      zIndexOffset={getZIndexOffset(tier)}
      eventHandlers={{
        click: () => onCafeClick(cafe),
      }}
    >
      <Popup className="custom-popup" closeButton={false}>
        <div className="p-1 min-w-[200px]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-bold text-gray-900 text-sm m-0 leading-tight">{cafe.name}</h3>
            {cafe.isMitraSemejaKerja && (
              <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                Mitra SK
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mb-3 text-xs text-gray-500 font-medium">
            <span className="text-yellow-500 font-bold">★ {cafe.rating}</span>
            <span>({cafe.reviewCount})</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCafeClick(cafe);
            }}
            className="w-full py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
          >
            Lihat Detail
          </button>
        </div>
      </Popup>
    </Marker>
  );
});

// At far zoom-out every cafe sits in the viewport, so cap the basic-tier pins
// to the most popular ones (cafes arrive sorted by total_reviews). At the
// default zoom (14) and closer, nothing is capped — the map looks exactly as
// before. Special tiers and the selected cafe always render.
function maxBasicPins(zoom: number): number {
  if (zoom >= 14) return Infinity;
  if (zoom === 13) return 200;
  return 120;
}

const MapView: React.FC<MapViewProps> = ({ cafes, filters, selectedCafe, onCafeClick }) => {
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [viewport, setViewport] = React.useState<{ bounds: L.LatLngBounds; zoom: number } | null>(null);

  const handleViewportChange = React.useCallback((bounds: L.LatLngBounds, zoom: number) => {
    setViewport({ bounds, zoom });
  }, []);

  // Custom icon for user location (blue dot)
  const userIcon = useMemo(() => {
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <div class="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-ping"></div>
          <div class="absolute w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }, []);
  const filteredCafes = useMemo(() => {
    return cafes.filter(cafe => {
      if (filters.facilities.length > 0) {
        const allMatch = filters.facilities.every(
          fac => cafe.facilities[fac as keyof typeof cafe.facilities]
        );
        if (!allMatch) return false;
      }
      if (cafe.vibes > filters.vibesMin) return false;
      if (cafe.scales.area < filters.areaMin) return false;
      if (cafe.scales.motorParking < filters.motorParkingMin) return false;
      if (cafe.scales.carParking < filters.carParkingMin) return false;
      if (cafe.scales.outlets < filters.outletsMin) return false;
      if (filters.openNow && !cafe.isOpenNow) return false;
      if (filters.openNight && !cafe.isOpenNight) return false;
      if (filters.mitraSemejaKerja && !cafe.isMitraSemejaKerja) return false;
      return true;
    });
  }, [cafes, filters]);

  // Cull markers to the settled viewport (padded so pins don't pop in at the
  // edges mid-pan) and cap basic pins at far zoom-out. Before the first
  // moveend (viewport === null) only the zoom cap applies.
  const visibleCafes = useMemo(() => {
    const bounds = viewport ? viewport.bounds.pad(0.3) : null;
    const maxBasic = maxBasicPins(viewport?.zoom ?? 14);
    let basicCount = 0;
    const visible: Cafe[] = [];
    for (const cafe of filteredCafes) {
      if (getMarkerTier(cafe) !== 'basic' || cafe.id === selectedCafe?.id) {
        visible.push(cafe);
        continue;
      }
      if (bounds && !bounds.contains([cafe.lat, cafe.lng])) continue;
      if (basicCount >= maxBasic) continue;
      basicCount++;
      visible.push(cafe);
    }
    return visible;
  }, [filteredCafes, viewport, selectedCafe]);

  // Center of Purwokerto
  const position: [number, number] = [-7.4245, 109.2302];

  return (
    <div className="absolute inset-0 w-full h-full bg-[#f8f9fa] overflow-hidden z-0">
      <MapContainer
        center={position}
        zoom={14}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {visibleCafes.map(cafe => (
          <CafeMarker key={cafe.id} cafe={cafe} onCafeClick={onCafeClick} />
        ))}

        <MapSearch cafes={cafes} onCafeClick={onCafeClick} />

        <FlyToCafe cafe={selectedCafe} />

        <ViewportWatcher onChange={handleViewportChange} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={userIcon}
            zIndexOffset={1000} // Always on top
          />
        )}

        <MapControls filteredCount={filteredCafes.length} totalCount={cafes.length} userLocation={userLocation} setUserLocation={setUserLocation} />
      </MapContainer>
    </div>
  );
};

// Memoized so sidebar/modal/login state changes in App never touch the map.
export default React.memo(MapView);
