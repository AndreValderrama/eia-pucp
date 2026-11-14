'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import type { GisLayerKey, StationVariables } from '@/lib/types';
import { LAYER_INFO, LAYER_ORDER, sameStation, toNumber } from '@/lib/utils/gis-parse';
import { rampColor, variableRange } from './gis-colors';

export interface GisMapProps {
  collections: Partial<Record<GisLayerKey, FeatureCollection>>;
  visible: Record<GisLayerKey, boolean>;
  variables: StationVariables | null;
  selectedVariable: string | null;
}

const PERU_CENTER: L.LatLngTuple = [-9.19, -75.02];

const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const propertiesTable = (props: Record<string, unknown>, title: string) => {
  const rows = Object.entries(props)
    .slice(0, 25)
    .map(([k, v]) => `<tr><th style="text-align:left;padding-right:8px;font-weight:600">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('');
  return `<div style="max-height:220px;overflow:auto;font-size:12px"><strong>${escapeHtml(title)}</strong><table>${rows}</table></div>`;
};

/**
 * Leaflet map driven imperatively: the map is created once per mount and removed on unmount,
 * which stays correct when React mounts effects twice in development.
 */
export default function GisMap({ collections, visible, variables, selectedVariable }: GisMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.FeatureGroup | null>(null);
  const range = useMemo(() => variableRange(variables, selectedVariable), [variables, selectedVariable]);

  // Create / destroy the map.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { center: PERU_CENTER, zoom: 5, scrollWheelZoom: true });
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
    ).addTo(map);
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    });
    L.control.layers({ 'Satélite (Esri)': satellite, 'Calles (OpenStreetMap)': streets }, undefined, { position: 'topright' }).addTo(map);
    L.control.scale({ imperial: false }).addTo(map);
    overlayRef.current = L.featureGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Redraw overlays when data, visibility or the selected variable change.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.clearLayers();

    const rowFor = (f: Feature) =>
      variables ? variables.rows.find(r => sameStation(r[variables.joinColumn], f.properties?.[variables.stationField])) : undefined;

    LAYER_ORDER.forEach(key => {
      const fc = collections[key];
      if (!fc || !visible[key]) return;
      const info = LAYER_INFO[key];

      if (info.geometry === 'point') {
        L.geoJSON(fc, {
          pointToLayer: (feature, latlng) => {
            const row = rowFor(feature);
            const value = selectedVariable && row ? toNumber(row[selectedVariable]) : null;
            return L.circleMarker(latlng, {
              radius: 8,
              color: '#ffffff',
              weight: 2,
              fillColor: selectedVariable ? rampColor(value, range) : info.color,
              fillOpacity: 0.95,
            });
          },
          onEachFeature: (feature, layer) => {
            const row = rowFor(feature);
            const label = variables ? feature.properties?.[variables.stationField] : undefined;
            layer.bindPopup(propertiesTable({ ...(feature.properties || {}), ...(row || {}) }, `Estación ${label ?? ''}`));
            if (label !== undefined && label !== null) layer.bindTooltip(String(label), { direction: 'top', offset: [0, -6] });
          },
        }).addTo(overlay);
        return;
      }

      L.geoJSON(fc, {
        style: {
          color: info.color,
          weight: key === 'area_proyecto' ? 3 : 2,
          fillColor: info.color,
          fillOpacity: key === 'area_proyecto' ? 0.25 : 0.1,
          dashArray: key === 'aii' ? '6 6' : undefined,
        },
        onEachFeature: (feature, layer) => layer.bindPopup(propertiesTable(feature.properties || {}, info.label)),
      }).addTo(overlay);
    });
  }, [collections, visible, variables, selectedVariable, range]);

  // Zoom to the data when layers are added or replaced (not when toggling visibility).
  const signature = LAYER_ORDER.map(k => `${k}:${collections[k]?.features.length ?? 0}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const all = L.featureGroup(LAYER_ORDER.flatMap(k => (collections[k] ? [L.geoJSON(collections[k] as FeatureCollection)] : [])));
    const bounds = all.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={containerRef} className="h-full w-full rounded-xl z-0" />;
}
