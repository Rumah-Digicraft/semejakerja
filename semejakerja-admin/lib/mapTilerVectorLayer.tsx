'use client'

// MapTiler vector-tile layer for MapPicker.tsx — mirrors
// semejakerja-web-apps/src/lib/mapTilerVectorLayer.tsx so both apps' cafe
// location pickers look and behave the same.
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY
const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`

// maplibre-gl resolves its render worker via `new URL('./maplibre-gl-worker.mjs',
// import.meta.url)`, which the bundler doesn't statically detect in production —
// the file never makes it into the build output, so the map hangs forever
// waiting on a worker that never loaded. Point it at a copy served as a plain
// static file instead (public/maplibre/, copied verbatim by Next.js).
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

// MapTiler's POI layers are named by category (see the streets-v2 style.json).
// Food/Shopping overlap with our own cafe pins and carry stale OSM data (shops
// that closed years ago still show up), so they're hidden outright rather than
// left for admins to mistake for a real cafe listing.
const HIDDEN_POI_LAYERS = new Set(['Food', 'Shopping'])

// MapTiler's default POI/landmark label size (10-14px across zoom levels)
// reads too small at a glance — bump it up ~35-40% so landmarks are legible
// without zooming in.
function customizeMapTilerStyle(style: StyleSpecification): StyleSpecification {
  for (const layer of style.layers) {
    if (layer.type === 'symbol' && layer['source-layer'] === 'poi' && layer.layout?.['text-size']) {
      if (HIDDEN_POI_LAYERS.has(layer.id)) {
        layer.layout.visibility = 'none'
        continue
      }
      layer.layout['text-size'] = ['interpolate', ['linear'], ['zoom'], 12, 13, 16, 16, 22, 20]
    }
  }
  // Unlike glyphs/source URLs, style.json's `sprite` field comes back without
  // the API key attached, so every POI/landmark icon 401s and silently fails
  // to render (MapTiler's own JS SDK patches this in for you; the raw
  // style.json doesn't).
  if (style.sprite && typeof style.sprite === 'string' && !style.sprite.includes('key=')) {
    style.sprite = `${style.sprite}?key=${MAPTILER_KEY}`
  }
  return style
}

// react-leaflet has no built-in vector tile layer, so this bridges MapLibre
// GL (which renders MapTiler's vector tiles, letting us restyle labels) into
// the existing Leaflet map via the maplibre-gl-leaflet plugin. Drop this in
// place of a <TileLayer> inside any <MapContainer> (which must set maxZoom —
// maplibre-gl-leaflet reads it to configure its internal MapLibre instance).
export function MapTilerVectorLayer() {
  const map = useMap()

  useEffect(() => {
    let cancelled = false
    let glLayer: L.Layer | undefined

    fetch(MAPTILER_STYLE_URL)
      .then(res => res.json())
      .then((style: StyleSpecification) => {
        if (cancelled) return
        glLayer = L.maplibreGL({ style: customizeMapTilerStyle(style) }).addTo(map)
      })
      .catch(err => console.error('MapTilerVectorLayer failed to load:', err))

    return () => {
      cancelled = true
      if (glLayer) map.removeLayer(glLayer)
    }
  }, [map])

  return null
}
