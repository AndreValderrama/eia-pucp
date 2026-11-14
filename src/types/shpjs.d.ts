declare module 'shpjs' {
  import type { FeatureCollection } from 'geojson';

  type Binary = ArrayBuffer | ArrayBufferView;
  interface ShapefileParts {
    shp: Binary;
    dbf?: Binary;
    prj?: string;
    cpg?: string;
  }
  type Result = (FeatureCollection & { fileName?: string }) | (FeatureCollection & { fileName?: string })[];

  export default function shp(input: string | Binary | ShapefileParts): Promise<Result>;
}
