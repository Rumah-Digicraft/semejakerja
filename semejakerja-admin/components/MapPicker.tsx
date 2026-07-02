'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapPickerProps {
  center: [number, number]
  zoom?: number
  onLocationChange: (lat: number, lng: number) => void
}

function LocationMarker({ position, onChange }: { position: L.LatLngExpression, onChange: (pos: L.LatLng) => void }) {
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker != null) {
        onChange(marker.getLatLng())
      }
    },
  }

  useMapEvents({
    click(e) {
      onChange(e.latlng)
    },
  })

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  )
}

export default function MapPicker({ center, zoom = 14, onLocationChange }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLngExpression>(center)

  useEffect(() => {
    setPosition(center)
  }, [center[0], center[1]])

  const handleChange = (pos: L.LatLng) => {
    setPosition(pos)
    onLocationChange(pos.lat, pos.lng)
  }

  return (
    <div className="h-[250px] w-full rounded-xl overflow-hidden border border-slate-200 z-0 relative">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <LocationMarker position={position} onChange={handleChange} />
      </MapContainer>
    </div>
  )
}
