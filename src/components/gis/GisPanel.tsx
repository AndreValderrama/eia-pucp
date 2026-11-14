'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection } from 'geojson';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Upload, Trash2, FileSpreadsheet, MapPin, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { gisService } from '@/lib/services/gis-service';
import type { GisLayer, GisLayerKey, StationVariables } from '@/lib/types';
import {
  LAYER_INFO, LAYER_ORDER, assertGeometryFor, detectCoordinateColumns, guessStationColumn, guessStationField,
  parseCsv, parseSpatialFiles, sameStation, stationsFromCsv, toNumber, UTM_ZONES, UtmZone, ParsedCsv,
} from '@/lib/utils/gis-parse';
import { RAMP_COLORS, variableRange } from './gis-colors';

const GisMap = dynamic(() => import('./GisMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">Cargando mapa…</div>,
});

const SPATIAL_ACCEPT = '.zip,.shp,.dbf,.prj,.cpg,.geojson,.json';
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error');

interface Props {
  projectId: string;
  userEmail: string;
}

type CsvDraft = {
  fileName: string;
  csv: ParsedCsv;
  joinColumn: string;
  stationField: string;
  createStations: boolean;
  zone: UtmZone;
};

export default function GisPanel({ projectId, userEmail }: Props) {
  const { toast } = useToast();
  const [layers, setLayers] = useState<Partial<Record<GisLayerKey, GisLayer>>>({});
  const [variables, setVariables] = useState<StationVariables | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<GisLayerKey, boolean>>({ area_proyecto: true, aid: true, aii: true, estaciones: true });
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<GisLayerKey | 'variables' | null>(null);
  const [csvDraft, setCsvDraft] = useState<CsvDraft | null>(null);
  const fileInputs = useRef<Partial<Record<GisLayerKey, HTMLInputElement | null>>>({});
  const csvInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    gisService.getAll(projectId)
      .then(({ layers, variables }) => { setLayers(layers); setVariables(variables); })
      .catch(err => toast({ title: 'No se pudieron cargar las capas', description: errorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [projectId, toast]);

  const collections = useMemo(() => {
    const out: Partial<Record<GisLayerKey, FeatureCollection>> = {};
    LAYER_ORDER.forEach(k => { if (layers[k]) out[k] = JSON.parse(layers[k]!.geojson); });
    return out;
  }, [layers]);

  const stations = collections.estaciones || null;

  /** Numeric CSV columns that can colour the stations. */
  const numericColumns = useMemo(() => {
    if (!variables) return [];
    return variables.columns.filter(c => {
      if (c === variables.joinColumn) return false;
      const filled = variables.rows.filter(r => r[c] !== '' && r[c] !== undefined);
      return filled.length > 0 && filled.filter(r => toNumber(r[c]) !== null).length / filled.length >= 0.8;
    });
  }, [variables]);

  useEffect(() => {
    if (selectedVariable && !numericColumns.includes(selectedVariable)) setSelectedVariable(null);
  }, [numericColumns, selectedVariable]);

  const range = variableRange(variables, selectedVariable);
  const matched = variables && stations
    ? variables.rows.filter(r => stations.features.some(f => sameStation(r[variables.joinColumn], f.properties?.[variables.stationField]))).length
    : 0;

  /* ---------- Layers ---------- */

  const handleLayerUpload = async (key: GisLayerKey, fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(key);
    try {
      const fc = await parseSpatialFiles(files);
      assertGeometryFor(key, fc);
      const name = files.find(f => /\.(zip|shp|geojson|json)$/i.test(f.name))?.name || files[0].name;
      const layer = await gisService.saveLayer(projectId, key, name, fc, userEmail);
      setLayers(prev => ({ ...prev, [key]: layer }));
      setVisible(prev => ({ ...prev, [key]: true }));
      toast({ title: `${LAYER_INFO[key].label} cargada`, description: `${fc.features.length} elemento(s)` });
    } catch (err) {
      toast({ title: 'No se pudo cargar la capa', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(null);
      const input = fileInputs.current[key];
      if (input) input.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      if (toDelete === 'variables') {
        await gisService.deleteVariables(projectId);
        setVariables(null);
      } else {
        await gisService.deleteLayer(projectId, toDelete);
        setLayers(prev => { const next = { ...prev }; delete next[toDelete]; return next; });
      }
      toast({ title: 'Eliminado' });
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setToDelete(null);
    }
  };

  /* ---------- CSV ---------- */

  const handleCsvSelected = async (file: File | undefined) => {
    if (!file) return;
    try {
      const csv = await parseCsv(file);
      const joinColumn = guessStationColumn(csv.columns);
      const coords = detectCoordinateColumns(csv.columns);
      setCsvDraft({
        fileName: file.name,
        csv,
        joinColumn,
        stationField: guessStationField(stations, csv.rows.map(r => r[joinColumn])),
        createStations: !stations && !!coords,
        zone: '18S',
      });
    } catch (err) {
      toast({ title: 'No se pudo leer el CSV', description: errorMessage(err), variant: 'destructive' });
    } finally {
      if (csvInput.current) csvInput.current.value = '';
    }
  };

  const draftCoords = csvDraft ? detectCoordinateColumns(csvDraft.csv.columns) : null;
  const draftMatches = csvDraft && stations && !csvDraft.createStations
    ? csvDraft.csv.rows.filter(r => stations.features.some(f => sameStation(r[csvDraft.joinColumn], f.properties?.[csvDraft.stationField]))).length
    : null;

  const saveCsv = async () => {
    if (!csvDraft) return;
    setBusy('csv');
    try {
      let stationField = csvDraft.stationField;
      if (csvDraft.createStations && draftCoords) {
        const fc = await stationsFromCsv(csvDraft.csv, draftCoords, csvDraft.zone);
        const layer = await gisService.saveLayer(projectId, 'estaciones', csvDraft.fileName, fc, userEmail);
        setLayers(prev => ({ ...prev, estaciones: layer }));
        stationField = csvDraft.joinColumn; // the new points carry the CSV columns as properties
      }
      const saved = await gisService.saveVariables(projectId, {
        fileName: csvDraft.fileName,
        columns: csvDraft.csv.columns,
        rows: csvDraft.csv.rows,
        joinColumn: csvDraft.joinColumn,
        stationField,
        uploadedBy: userEmail,
      });
      setVariables(saved);
      setCsvDraft(null);
      toast({ title: 'Variables cargadas', description: `${saved.rows.length} filas, ${saved.columns.length} columnas` });
    } catch (err) {
      toast({ title: 'No se pudo guardar el CSV', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const stationProps = stations?.features[0]?.properties ? Object.keys(stations.features[0].properties) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-3">
        <div className="relative h-[520px] rounded-xl border overflow-hidden">
          <GisMap collections={collections} visible={visible} variables={variables} selectedVariable={selectedVariable} />
          {selectedVariable && range && (
            <div className="absolute bottom-3 left-3 z-[400] rounded-lg bg-background/90 backdrop-blur p-2 text-xs shadow">
              <div className="font-semibold mb-1">{selectedVariable}</div>
              <div className="flex items-center gap-1">
                <span className="font-mono">{range.min}</span>
                <div className="flex">{RAMP_COLORS.map(c => <span key={c} className="w-5 h-3" style={{ background: c }} />)}</div>
                <span className="font-mono">{range.max}</span>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Sube el shapefile comprimido (.zip con .shp, .dbf y .prj) o los archivos sueltos, o un .geojson. Se reproyecta a WGS84 automáticamente.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />Capas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['area_proyecto', 'aid', 'aii', 'estaciones'] as GisLayerKey[]).map(key => {
              const info = LAYER_INFO[key];
              const layer = layers[key];
              return (
                <div key={key} className="rounded-lg border p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`vis-${key}`}
                      checked={visible[key]}
                      disabled={!layer}
                      onCheckedChange={v => setVisible(prev => ({ ...prev, [key]: !!v }))}
                      aria-label={`Mostrar ${info.label}`}
                    />
                    <span
                      className={`inline-block w-3.5 h-3.5 ${info.geometry === 'point' ? 'rounded-full' : 'rounded-sm'}`}
                      style={{ background: info.color }}
                    />
                    <Label htmlFor={`vis-${key}`} className="flex-1 text-sm">{info.label}</Label>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="flex-1 text-xs text-muted-foreground truncate" title={layer?.fileName}>
                      {layer ? `${layer.fileName} · ${layer.featureCount} elem.` : 'Sin capa'}
                    </span>
                    <input
                      ref={el => { fileInputs.current[key] = el; }}
                      type="file" multiple accept={SPATIAL_ACCEPT} className="hidden"
                      onChange={e => handleLayerUpload(key, e.target.files)}
                    />
                    <Button size="sm" variant="outline" className="h-7" disabled={busy !== null} onClick={() => fileInputs.current[key]?.click()}>
                      {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      <span className="ml-1">{layer ? 'Reemplazar' : 'Subir'}</span>
                    </Button>
                    {layer && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={`Eliminar ${info.label}`} onClick={() => setToDelete(key)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Variables (CSV)</CardTitle>
            <CardDescription className="text-xs">
              Una fila por estación con su código y las variables medidas. Si aún no hay capa de estaciones, el CSV puede crearla con columnas lat/lon o este/norte (UTM).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleCsvSelected(e.target.files?.[0])} />
            {variables ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{variables.fileName} · {variables.rows.length} filas · {matched} unidas a estaciones</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Eliminar variables" onClick={() => setToDelete('variables')}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aún no hay variables.</p>
            )}
            <Button size="sm" variant="outline" className="w-full" disabled={busy !== null} onClick={() => csvInput.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" />{variables ? 'Reemplazar CSV' : 'Subir CSV'}
            </Button>
            {numericColumns.length > 0 && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Colorear estaciones por</Label>
                <Select value={selectedVariable ?? 'none'} onValueChange={v => setSelectedVariable(v === 'none' ? null : v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin variable</SelectItem>
                    {numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {variables && (
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Datos por estación</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  {variables.columns.map(c => (
                    <TableHead key={c} className={c === selectedVariable ? 'text-primary' : ''}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {variables.rows.map((r, i) => {
                  const joined = stations?.features.some(f => sameStation(r[variables.joinColumn], f.properties?.[variables.stationField]));
                  return (
                    <TableRow key={i}>
                      <TableCell title={joined ? 'Unida a una estación del mapa' : 'Sin estación en el mapa'}>
                        <span className={`inline-block w-2 h-2 rounded-full ${joined ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                      </TableCell>
                      {variables.columns.map(c => <TableCell key={c} className="whitespace-nowrap text-xs">{r[c]}</TableCell>)}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CSV import options */}
      <Dialog open={!!csvDraft} onOpenChange={open => !open && setCsvDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar variables</DialogTitle>
            <DialogDescription>
              {csvDraft?.fileName} · {csvDraft?.csv.rows.length} filas · {csvDraft?.csv.columns.length} columnas
            </DialogDescription>
          </DialogHeader>
          {csvDraft && (
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label>Columna con el código de estación</Label>
                <Select
                  value={csvDraft.joinColumn}
                  onValueChange={v => setCsvDraft({ ...csvDraft, joinColumn: v, stationField: guessStationField(stations, csvDraft.csv.rows.map(r => r[v])) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{csvDraft.csv.columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {draftCoords && (
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <Checkbox
                    id="create-stations"
                    checked={csvDraft.createStations}
                    onCheckedChange={v => setCsvDraft({ ...csvDraft, createStations: !!v })}
                  />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="create-stations" className="text-sm">
                      {stations ? 'Reemplazar la capa de estaciones' : 'Crear la capa de estaciones'} con las coordenadas del CSV
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Columnas detectadas: {draftCoords.kind === 'latlon' ? `${draftCoords.lat} / ${draftCoords.lon} (grados)` : `${draftCoords.east} / ${draftCoords.north} (UTM WGS84)`}
                    </p>
                    {draftCoords.kind === 'utm' && csvDraft.createStations && (
                      <Select value={csvDraft.zone} onValueChange={v => setCsvDraft({ ...csvDraft, zone: v as UtmZone })}>
                        <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{UTM_ZONES.map(z => <SelectItem key={z} value={z}>Zona {z}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}

              {stations && !csvDraft.createStations && (
                <div className="grid gap-1.5">
                  <Label>Atributo de la capa de estaciones que coincide</Label>
                  <Select value={csvDraft.stationField} onValueChange={v => setCsvDraft({ ...csvDraft, stationField: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{stationProps.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className={`text-xs ${draftMatches ? 'text-muted-foreground' : 'text-amber-600'}`}>
                    {draftMatches} de {csvDraft.csv.rows.length} filas coinciden con una estación del mapa.
                  </p>
                </div>
              )}

              {!stations && !csvDraft.createStations && (
                <p className="text-xs text-amber-600">
                  No hay capa de estaciones: las variables se guardarán, pero no se verán en el mapa hasta que subas las estaciones.
                </p>
              )}

              <div className="text-xs text-muted-foreground">
                Vista previa: {csvDraft.csv.columns.slice(0, 6).join(', ')}{csvDraft.csv.columns.length > 6 ? '…' : ''}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDraft(null)}>Cancelar</Button>
            <Button onClick={saveCsv} disabled={busy === 'csv'}>
              {busy === 'csv' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={open => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {toDelete === 'variables' ? 'las variables del CSV' : toDelete ? `la capa “${LAYER_INFO[toDelete].label}”` : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer; tendrás que volver a subir el archivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
