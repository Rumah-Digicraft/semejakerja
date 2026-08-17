// Pin picker buat form "Usulkan Cafe Baru" — port dari
// semejakerja-admin/components/MapPicker.tsx (klik atau geser pin buat
// nentuin lokasi). CSS Leaflet sudah di-import global di src/index.css,
// jadi tidak perlu import ulang di sini.
import { useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// react-leaflet's default Marker pakai path icon yang rusak di bundle
// Vite/Webpack (sama seperti kasusnya di admin) — MapView.tsx utama
// menghindar ini dengan custom icon (MapMarker.tsx), tapi picker sederhana
// ini pakai marker default Leaflet, jadi perlu fix yang sama seperti admin.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  center: [number, number];
  zoom?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

function LocationMarker({ position, onChange }: { position: L.LatLngExpression; onChange: (pos: L.LatLng) => void }) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) onChange(marker.getLatLng());
    },
  };

  useMapEvents({
    click(e) {
      onChange(e.latlng);
    },
  });

  return <Marker draggable eventHandlers={eventHandlers} position={position} ref={markerRef} />;
}

export default function LocationPicker({ center, zoom = 14, onLocationChange }: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLngExpression>(center);
  // Sinkron posisi pin dari `center` (mis. setelah "Ambil Lokasi" resolve
  // sukses) tanpa efek terpisah — pola "adjusting state during render" dari
  // dokumentasi React, dijalankan langsung di body render, bukan di effect.
  const [prevCenter, setPrevCenter] = useState(center);
  if (center[0] !== prevCenter[0] || center[1] !== prevCenter[1]) {
    setPrevCenter(center);
    setPosition(center);
  }

  const handleChange = (pos: L.LatLng) => {
    setPosition(pos);
    onLocationChange(pos.lat, pos.lng);
  };

  return (
    <div className="h-[220px] rounded-xl overflow-hidden border border-gray-200">
      <MapContainer center={position} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        {/* Samain dengan MapPicker.tsx admin (CartoDB Voyager) biar dua
            picker lokasi ini konsisten tampilannya. */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationMarker position={position} onChange={handleChange} />
      </MapContainer>
    </div>
  );
}
