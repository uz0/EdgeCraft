import { CliffTypesData } from '../../formats/slk/CliffTypesData';

const CASC_BASE_URL = 'https://www.hiveworkshop.com/casc-contents?path=';

export class CliffTypesLoader {
  private static instance: CliffTypesLoader | null = null;
  private cliffTypesData: CliffTypesData | null = null;
  private loadPromise: Promise<CliffTypesData> | null = null;

  private constructor() {}

  static getInstance(): CliffTypesLoader {
    if (!CliffTypesLoader.instance) {
      CliffTypesLoader.instance = new CliffTypesLoader();
    }
    return CliffTypesLoader.instance;
  }

  async load(): Promise<CliffTypesData> {
    if (this.cliffTypesData) {
      return this.cliffTypesData;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.fetchAndParse();
    this.cliffTypesData = await this.loadPromise;
    return this.cliffTypesData;
  }

  private async fetchAndParse(): Promise<CliffTypesData> {
    const cascPath = 'terrainart\\clifftypes.slk';
    const url = `${CASC_BASE_URL}${cascPath}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CliffTypes.slk: ${response.statusText}`);
    }

    const slkText = await response.text();
    const data = new CliffTypesData();
    data.load(slkText);

    return data;
  }

  getCliffTypesData(): CliffTypesData | null {
    return this.cliffTypesData;
  }
}
