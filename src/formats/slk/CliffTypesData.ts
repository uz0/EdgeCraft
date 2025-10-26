import { MappedData, type MappedDataRow } from '../../vendor/mdx-m3-viewer/src/utils/mappeddata';

export interface CliffTypeRow {
  cliffID: string;
  cliffModelDir: string;
  texDir: string;
  texFile: string;
  groundTile: string;
}

export class CliffTypesData {
  private data: MappedData;

  constructor() {
    this.data = new MappedData();
  }

  load(slkText: string): void {
    this.data.load(slkText);
  }

  getRow(cliffID: string): CliffTypeRow | undefined {
    const row = this.data.getRow(cliffID);
    if (!row) {
      return undefined;
    }

    return {
      cliffID,
      cliffModelDir: row.string('cliffModelDir') ?? '',
      texDir: row.string('texDir') ?? '',
      texFile: row.string('texFile') ?? '',
      groundTile: row.string('groundTile') ?? '',
    };
  }

  getRawRow(cliffID: string): MappedDataRow | undefined {
    return this.data.getRow(cliffID);
  }
}
