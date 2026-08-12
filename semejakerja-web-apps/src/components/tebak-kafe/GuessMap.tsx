import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export interface LatLng {
  lat: number;
  lng: number;
}

interface GuessMapProps {
  guess: LatLng | null;
  actual: LatLng | null;
  locked: boolean;
  onGuess: (latlng: LatLng) => void;
}

// Purwokerto center, matching MapView's default view.
const CENTER: [number, number] = [-7.4245, 109.2302];
const BOUNDS = L.latLngBounds([-7.51, 109.14], [-7.34, 109.32]);

function guessPinSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">` +
    `<path d="M15 37 Q2 22 2 14 A13 13 0 1 1 28 14 Q28 22 15 37Z" fill="#9333ea" stroke="#6d28d9" stroke-width="1.5"/>` +
    `<circle cx="15" cy="14" r="5.5" fill="white"/>` +
    `</svg>`
  );
}

function actualPinSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">` +
    `<circle cx="13" cy="13" r="10" fill="none" stroke="#1f2937" stroke-width="2.5"/>` +
    `<circle cx="13" cy="13" r="3" fill="#1f2937"/>` +
    `</svg>`
  );
}

const guessIcon = L.icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(guessPinSvg()),
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

const actualIcon = L.icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(actualPinSvg()),
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const ClickCatcher: React.FC<{ locked: boolean; onGuess: (latlng: LatLng) => void }> = ({ locked, onGuess }) => {
  useMapEvents({
    click: e => {
      if (locked) return;
      onGuess({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// Frames both pins once the guess is locked in, so the reveal is always visible.
const RevealFrame: React.FC<{ guess: LatLng | null; actual: LatLng | null; locked: boolean }> = ({ guess, actual, locked }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!locked || !guess || !actual) return;
    const bounds = L.latLngBounds([guess.lat, guess.lng], [actual.lat, actual.lng]);
    map.flyToBounds(bounds.pad(0.6), { animate: true, duration: 0.8, maxZoom: 16 });
  }, [locked, guess, actual, map]);
  return null;
};

const GuessMap: React.FC<GuessMapProps> = ({ guess, actual, locked, onGuess }) => {
  const line = useMemo(() => {
    if (!locked || !guess || !actual) return null;
    return [[guess.lat, guess.lng], [actual.lat, actual.lng]] as [number, number][];
  }, [locked, guess, actual]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#f8f9fa] overflow-hidden z-0">
      <MapContainer
        center={CENTER}
        zoom={13}
        minZoom={12}
        maxBounds={BOUNDS.pad(0.15)}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ cursor: locked ? 'default' : 'crosshair' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        <ClickCatcher locked={locked} onGuess={onGuess} />
        <RevealFrame guess={guess} actual={actual} locked={locked} />

        {guess && <Marker position={[guess.lat, guess.lng]} icon={guessIcon} />}
        {locked && actual && <Marker position={[actual.lat, actual.lng]} icon={actualIcon} />}
        {line && <Polyline positions={line} pathOptions={{ color: '#6b7280', weight: 2, dashArray: '5 6' }} />}
      </MapContainer>
    </div>
  );
};

export default React.memo(GuessMap);
