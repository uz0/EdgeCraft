import * as BABYLON from '@babylonjs/core';
import { DdsImage } from '../../vendor/mdx-m3-viewer/src/parsers/dds/image';

export class DDSTextureLoader {
  static async loadDDSTexture(
    url: string,
    scene: BABYLON.Scene
  ): Promise<BABYLON.InternalTexture | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const image = new DdsImage();
      image.load(arrayBuffer);

      const engine = scene.getEngine();
      const gl = (engine as unknown as { _gl: WebGLRenderingContext })._gl;

      const ext = gl.getExtension('WEBGL_compressed_texture_s3tc');

      const FOURCC_DXT1 = 0x31545844;
      const FOURCC_DXT3 = 0x33545844;
      const FOURCC_DXT5 = 0x35545844;
      const FOURCC_ATI2 = 0x32495441;

      const format = image.format;
      let internalFormat = 0;

      if (ext) {
        if (format === FOURCC_DXT1) {
          internalFormat = ext.COMPRESSED_RGB_S3TC_DXT1_EXT;
        } else if (format === FOURCC_DXT3) {
          internalFormat = ext.COMPRESSED_RGBA_S3TC_DXT3_EXT;
        } else if (format === FOURCC_DXT5) {
          internalFormat = ext.COMPRESSED_RGBA_S3TC_DXT5_EXT;
        }
      }

      const webglTexture = gl.createTexture();
      if (webglTexture === null) {
        return null;
      }

      gl.bindTexture(gl.TEXTURE_2D, webglTexture);

      const mipmaps = image.mipmaps();

      if (format === FOURCC_DXT1 || format === FOURCC_ATI2) {
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
      }

      for (let i = 0; i < mipmaps; i++) {
        const { width, height, data } = image.getMipmap(i, internalFormat !== 0);

        if (internalFormat) {
          gl.compressedTexImage2D(gl.TEXTURE_2D, i, internalFormat, width, height, 0, data);
        } else if (format === FOURCC_DXT1) {
          gl.texImage2D(
            gl.TEXTURE_2D,
            i,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
          );
        } else if (format === FOURCC_DXT3) {
          gl.texImage2D(
            gl.TEXTURE_2D,
            i,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
          );
        } else if (format === FOURCC_DXT5) {
          gl.texImage2D(
            gl.TEXTURE_2D,
            i,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
          );
        }
      }

      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (mipmaps > 1) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindTexture(gl.TEXTURE_2D, null);

      const internalTexture = new BABYLON.InternalTexture(
        engine,
        BABYLON.InternalTextureSource.Unknown
      );
      (internalTexture as unknown as { _webGLTexture: WebGLTexture })._webGLTexture = webglTexture;
      internalTexture.width = image.width;
      internalTexture.height = image.height;
      internalTexture.isReady = true;
      internalTexture.type = BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE;
      internalTexture.format = BABYLON.Constants.TEXTUREFORMAT_RGBA;
      internalTexture.samplingMode = BABYLON.Texture.BILINEAR_SAMPLINGMODE;
      internalTexture.generateMipMaps = mipmaps > 1;

      return internalTexture;
    } catch {
      return null;
    }
  }
}
