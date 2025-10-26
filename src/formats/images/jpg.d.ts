export class JpegImage {
  width: number;
  height: number;
  parse(data: Uint8Array): void;
  getData(imageData: ImageData): void;
}
