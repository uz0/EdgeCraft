declare module '*/vendor/mdx-m3-viewer/src/parsers/dds/image' {
  export class DdsImage {
    width: number;
    height: number;
    format: number;
    mipmapWidths: number[];
    mipmapHeights: number[];
    mipmapDatas: Uint8Array[];

    load(buffer: ArrayBuffer | Uint8Array): void;
    mipmaps(): number;
    getMipmap(level: number, raw?: boolean): { width: number; height: number; data: Uint8Array };
  }

  export const DDS_MAGIC: number;
  export const FOURCC_DXT1: number;
  export const FOURCC_DXT3: number;
  export const FOURCC_DXT5: number;
  export const FOURCC_ATI2: number;
}

declare module '*/vendor/mdx-m3-viewer/src/parsers/mdlx/model' {
  interface Geoset {
    vertices: Float32Array;
    normals: Float32Array;
    uvSets: Float32Array[];
    faces: Uint16Array;
  }

  export default class Model {
    geosets: Geoset[];
    load(buffer: ArrayBuffer | Uint8Array): void;
  }
}

declare module '*/vendor/mdx-m3-viewer/src/utils/mappeddata' {
  export interface MappedDataRow {
    string(name: string): string;
  }

  export class MappedData {
    constructor(buffer: ArrayBuffer | string, ext: string);
    load(buffer: ArrayBuffer | string): void;
    getRow(id: string): MappedDataRow | undefined;
  }
}

declare module '*/vendor/mdx-m3-viewer/src' {
  export namespace viewer {
    namespace handlers {
      namespace w3x {
        const Viewer: unknown;
      }
    }
  }
}

declare module '*/vendor/mdx-m3-viewer/clients/shared/camera' {
  export function setupCamera(camera: unknown, map: unknown): void;
}
