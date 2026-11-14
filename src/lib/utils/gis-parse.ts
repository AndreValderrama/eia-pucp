import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import type { GisLayerKey } from '../types';

export const LAYER_INFO: Record<GisLayerKey, { label: string; short: string; color: string; geometry: 'polygon' | 'point' }> = {
  area_proyecto: { label: 'Área del proyecto', short: 'Proyecto', color: '#dc2626', geometry: 'polygon' },
  aid: { label: 'Área de influencia directa (AID)', short: 'AID', color: '#ea580c', geometry: 'polygon' },
  aii: { label: 'Área de influencia indirecta (AII)', short: 'AII', color: '#ca8a04', geometry: 'polygon' },
  estaciones: { label: 'Estaciones de monitoreo', short: 'Estaciones', color: '#2563eb', geometry: 'point' },
};

export const LAYER_ORDER: GisLayerKey[] = ['aii', 'aid', 'area_proyecto', 'estaciones'];

const POLYGON_TYPES = new Set(['Polygon', 'MultiPolygon']);
const POINT_TYPES = new Set(['Point', 'MultiPoint']);

/**
 * Reads a spatial upload into WGS84 GeoJSON.
 * Accepts a zipped shapefile, loose .shp/.dbf/.prj/.cpg files, or a .geojson/.json file.
 * Shapefiles with a .prj are reprojected to lat/lon (e.g. UTM 18S → WGS84).
 */
export async function parseSpatialFiles(files: File[]): Promise<FeatureCollection> {
  if (!files.length) throw new Error('Selecciona un archivo');
  const byExt = (ext: string) => files.find(f => f.name.toLowerCase().endsWith(ext));

  const geojsonFile = byExt('.geojson') || byExt('.json');
  if (geojsonFile) return normalize(JSON.parse(await geojsonFile.text()));

  const { default: shp } = await import('shpjs');
  const zip = byExt('.zip');
  if (zip) return normalize(await shp(await zip.arrayBuffer()));

  const shpFile = byExt('.shp');
  if (shpFile) {
    const dbf = byExt('.dbf');
    const prj = byExt('.prj');
    const cpg = byExt('.cpg');
    if (!prj) console.warn('Shapefile without .prj: assuming WGS84 coordinates');
    return normalize(await shp({
      shp: await shpFile.arrayBuffer(),
      ...(dbf && { dbf: await dbf.arrayBuffer() }),
      ...(prj && { prj: await prj.text() }),
      ...(cpg && { cpg: await cpg.text() }),
    }));
  }

  throw new Error('Formato no soportado. Sube un .zip del shapefile, los archivos .shp/.dbf/.prj, o un .geojson');
}

/** Merges multi-layer results and drops features without geometry. */
function normalize(data: unknown): FeatureCollection {
  const collections = (Array.isArray(data) ? data : [data]) as (FeatureCollection | Feature)[];
  const features: Feature[] = collections.flatMap(c =>
    c && (c as FeatureCollection).type === 'FeatureCollection' ? (c as FeatureCollection).features
      : c && (c as Feature).type === 'Feature' ? [c as Feature] : []
  );
  const valid = features.filter(f => f.geometry);
  if (!valid.length) throw new Error('El archivo no tiene geometrías');
  return { type: 'FeatureCollection', features: valid };
}

/** Throws when the geometry type doesn't match the layer (polygons for areas, points for stations). */
export function assertGeometryFor(key: GisLayerKey, fc: FeatureCollection) {
  const expected = LAYER_INFO[key].geometry;
  const allowed = expected === 'polygon' ? POLYGON_TYPES : POINT_TYPES;
  const wrong = fc.features.filter(f => !allowed.has(f.geometry.type));
  if (wrong.length) {
    throw new Error(
      `${LAYER_INFO[key].label} necesita ${expected === 'polygon' ? 'polígonos' : 'puntos'}; ` +
      `el archivo tiene ${wrong[0].geometry.type}.`
    );
  }
  const outOfRange = fc.features.some(f => !inLatLonRange(f.geometry));
  if (outOfRange) {
    throw new Error('Las coordenadas no están en grados (WGS84). Incluye el archivo .prj del shapefile para reproyectarlo.');
  }
}

const round = (p: Position): Position => p.map(n => Math.round(n * 1e6) / 1e6);

const mapCoords = (g: Geometry, fn: (p: Position) => Position): Geometry => {
  switch (g.type) {
    case 'Point': return { ...g, coordinates: fn(g.coordinates) };
    case 'MultiPoint':
    case 'LineString': return { ...g, coordinates: g.coordinates.map(fn) };
    case 'MultiLineString':
    case 'Polygon': return { ...g, coordinates: g.coordinates.map(r => r.map(fn)) };
    case 'MultiPolygon': return { ...g, coordinates: g.coordinates.map(p => p.map(r => r.map(fn))) };
    case 'GeometryCollection': return { ...g, geometries: g.geometries.map(x => mapCoords(x, fn)) };
  }
};

const firstPositions = (g: Geometry): Position[] => {
  const out: Position[] = [];
  mapCoords(g, p => { if (out.length < 50) out.push(p); return p; });
  return out;
};

const inLatLonRange = (g: Geometry) =>
  firstPositions(g).every(([lon, lat]) => Math.abs(lon) <= 180 && Math.abs(lat) <= 90);

/** Rounds coordinates to ~10 cm (6 decimals) to keep stored layers small. */
export const compactCollection = (fc: FeatureCollection): FeatureCollection => ({
  type: 'FeatureCollection',
  features: fc.features.map(f => ({ type: 'Feature', properties: f.properties ?? {}, geometry: mapCoords(f.geometry, round) })),
});

/* ---------- CSV ---------- */

export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
}

export async function parseCsv(file: File): Promise<ParsedCsv> {
  const Papa = (await import('papaparse')).default;
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: h => h.trim(),
    transform: v => (typeof v === 'string' ? v.trim() : v),
  });
  const columns = (result.meta.fields || []).filter(Boolean);
  if (!columns.length || !result.data.length) throw new Error('El CSV está vacío o no tiene encabezados');
  return { columns, rows: result.data };
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Column names that usually hold the station code. */
const STATION_HINTS = ['estacion', 'codigo', 'cod', 'id', 'punto', 'station', 'nombre', 'name'];

export const guessStationColumn = (columns: string[]) =>
  STATION_HINTS.map(h => columns.find(c => norm(c) === h || norm(c).startsWith(h))).find(Boolean) || columns[0];

/** Station-layer property whose values best match the CSV join column. */
export function guessStationField(fc: FeatureCollection | null, csvValues: string[]): string {
  const props = fc?.features[0]?.properties ? Object.keys(fc.features[0].properties) : [];
  const wanted = new Set(csvValues.map(norm));
  let best = props[0] || '';
  let bestHits = -1;
  props.forEach(p => {
    const hits = fc!.features.filter(f => wanted.has(norm(String(f.properties?.[p] ?? '')))).length;
    if (hits > bestHits) { best = p; bestHits = hits; }
  });
  return best;
}

export const sameStation = (a: unknown, b: unknown) => norm(String(a ?? '')) === norm(String(b ?? ''));

/** Numeric value of a CSV cell, accepting decimal commas ("12,5"). */
export const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/* ---------- Stations from CSV coordinates ---------- */

const LAT = ['lat', 'latitud', 'latitude'];
const LON = ['lon', 'lng', 'long', 'longitud', 'longitude'];
const EAST = ['este', 'easting', 'x', 'utm_este', 'utm este', 'e'];
const NORTH = ['norte', 'northing', 'y', 'utm_norte', 'utm norte', 'n'];

const findCol = (columns: string[], names: string[]) => columns.find(c => names.includes(norm(c)));

export type CoordinateColumns =
  | { kind: 'latlon'; lat: string; lon: string }
  | { kind: 'utm'; east: string; north: string };

export function detectCoordinateColumns(columns: string[]): CoordinateColumns | null {
  const lat = findCol(columns, LAT);
  const lon = findCol(columns, LON);
  if (lat && lon) return { kind: 'latlon', lat, lon };
  const east = findCol(columns, EAST);
  const north = findCol(columns, NORTH);
  if (east && north) return { kind: 'utm', east, north };
  return null;
}

export const UTM_ZONES = ['17S', '18S', '19S'] as const;
export type UtmZone = typeof UTM_ZONES[number];

/** Builds a WGS84 point layer from CSV rows with lat/lon or UTM (WGS84, southern hemisphere) columns. */
export async function stationsFromCsv(
  csv: ParsedCsv,
  coords: CoordinateColumns,
  zone: UtmZone
): Promise<FeatureCollection> {
  const proj4 = coords.kind === 'utm' ? (await import('proj4')).default : null;
  const utm = `+proj=utm +zone=${parseInt(zone, 10)} +south +datum=WGS84 +units=m +no_defs`;

  const features: Feature[] = [];
  csv.rows.forEach(row => {
    let lonLat: Position | null = null;
    if (coords.kind === 'latlon') {
      const lat = toNumber(row[coords.lat]);
      const lon = toNumber(row[coords.lon]);
      if (lat !== null && lon !== null) lonLat = [lon, lat];
    } else {
      const e = toNumber(row[coords.east]);
      const n = toNumber(row[coords.north]);
      if (e !== null && n !== null) lonLat = proj4!(utm, 'EPSG:4326', [e, n]);
    }
    if (lonLat) features.push({ type: 'Feature', properties: { ...row }, geometry: { type: 'Point', coordinates: lonLat } });
  });
  if (!features.length) throw new Error('Ninguna fila tiene coordenadas válidas');
  return { type: 'FeatureCollection', features };
}
