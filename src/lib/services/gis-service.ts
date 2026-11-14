import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import type { FeatureCollection } from 'geojson';
import { db } from '../firebase';
import type { GisLayer, GisLayerKey, StationVariables } from '../types';
import { compactCollection } from '../utils/gis-parse';

/** Firestore documents are capped at 1 MiB; keep a margin for the other fields. */
const MAX_BYTES = 900_000;
const VARIABLES_DOC = 'variables';

const gisCollection = (projectId: string) => collection(db, 'projects', projectId, 'gis');

const byteSize = (s: string) => new Blob([s]).size;

export const gisService = {
  async getAll(projectId: string): Promise<{ layers: Partial<Record<GisLayerKey, GisLayer>>; variables: StationVariables | null }> {
    const snap = await getDocs(gisCollection(projectId));
    const layers: Partial<Record<GisLayerKey, GisLayer>> = {};
    let variables: StationVariables | null = null;
    snap.docs.forEach(d => {
      if (d.id === VARIABLES_DOC) variables = d.data() as StationVariables;
      else layers[d.id as GisLayerKey] = { ...(d.data() as GisLayer), key: d.id as GisLayerKey };
    });
    return { layers, variables };
  },

  async saveLayer(projectId: string, key: GisLayerKey, fileName: string, fc: FeatureCollection, email: string): Promise<GisLayer> {
    const geojson = JSON.stringify(compactCollection(fc));
    const size = byteSize(geojson);
    if (size > MAX_BYTES) {
      throw new Error(
        `La capa pesa ${(size / 1024).toFixed(0)} KB y el límite es ${(MAX_BYTES / 1024).toFixed(0)} KB. ` +
        'Simplifica las geometrías (p. ej. en QGIS: Vectorial › Geometría › Simplificar) y vuelve a subirla.'
      );
    }
    const layer: GisLayer = {
      key,
      fileName,
      geojson,
      featureCount: fc.features.length,
      uploadedBy: email,
      uploadedAt: new Date().toISOString(),
    };
    await setDoc(doc(gisCollection(projectId), key), layer);
    return layer;
  },

  async deleteLayer(projectId: string, key: GisLayerKey): Promise<void> {
    await deleteDoc(doc(gisCollection(projectId), key));
  },

  async saveVariables(projectId: string, data: Omit<StationVariables, 'uploadedAt'>): Promise<StationVariables> {
    const value: StationVariables = { ...data, uploadedAt: new Date().toISOString() };
    const size = byteSize(JSON.stringify(value));
    if (size > MAX_BYTES) {
      throw new Error(`El CSV pesa ${(size / 1024).toFixed(0)} KB; el límite es ${(MAX_BYTES / 1024).toFixed(0)} KB.`);
    }
    await setDoc(doc(gisCollection(projectId), VARIABLES_DOC), value);
    return value;
  },

  async deleteVariables(projectId: string): Promise<void> {
    await deleteDoc(doc(gisCollection(projectId), VARIABLES_DOC));
  },
};
