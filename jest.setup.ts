import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';

expect.extend({ toMatchImageSnapshot });

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(options?: {
        failureThreshold?: number;
        failureThresholdType?: 'pixel' | 'percent';
        customDiffDir?: string;
        customSnapshotsDir?: string;
        customSnapshotIdentifier?: string;
      }): R;
    }
  }
}

globalThis.IS_CI_ENVIRONMENT = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function () {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

globalThis.WebGLRenderingContext = class WebGLRenderingContext {};
globalThis.WebGL2RenderingContext = class WebGL2RenderingContext {};

const createMockFn = () => {
  const fn = jest.fn();
  (fn as any).bind = function() { return fn; };
  return fn;
};

HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
  if (contextType === '2d') {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn((x: number, y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn((w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      })),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
    } as any;
  }

  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    const WEBGL_VERSION = 7938;
    const WEBGL_RENDERER = 7937;
    const MAX_TEXTURE_SIZE = 3379;
    const MAX_VERTEX_ATTRIBS = 35661;
    const VIEWPORT = 3386;

    const ctx = {
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getParameter: createMockFn().mockImplementation((param: number) => {
        if (param === WEBGL_VERSION) return 'WebGL 1.0';
        if (param === WEBGL_RENDERER) return 'WebGL Vendor';
        if (param === MAX_TEXTURE_SIZE) return 16384;
        if (param === MAX_VERTEX_ATTRIBS) return 32;
        if (param === VIEWPORT) return [0, 0, 800, 600];
        return null;
      }),
      getExtension: createMockFn().mockImplementation((name: string) => {
        if (name === 'WEBGL_draw_buffers') {
          return { drawBuffersWEBGL: jest.fn() };
        }
        if (name === 'WEBGL_depth_texture') {
          return {};
        }
        if (name === 'EXT_texture_filter_anisotropic' || name === 'WEBKIT_EXT_texture_filter_anisotropic') {
          return { TEXTURE_MAX_ANISOTROPY_EXT: 34046 };
        }
        if (name === 'OES_element_index_uint') {
          return {};
        }
        if (name === 'OES_standard_derivatives') {
          return {};
        }
        if (name === 'OES_texture_float') {
          return {};
        }
        if (name === 'WEBGL_compressed_texture_s3tc') {
          return {};
        }
        return {};
      }),
      createProgram: createMockFn(),
      createShader: createMockFn(),
      shaderSource: createMockFn(),
      compileShader: createMockFn(),
      attachShader: createMockFn(),
      linkProgram: createMockFn(),
      useProgram: createMockFn(),
      createBuffer: createMockFn(),
      bindBuffer: createMockFn(),
      bufferData: createMockFn(),
      createTexture: createMockFn(),
      bindTexture: createMockFn(),
      texImage2D: createMockFn(),
      texParameteri: createMockFn(),
      enable: createMockFn(),
      disable: createMockFn(),
      blendFunc: createMockFn(),
      clear: createMockFn(),
      clearColor: createMockFn(),
      clearDepth: createMockFn(),
      viewport: createMockFn(),
      drawArrays: createMockFn(),
      drawElements: createMockFn(),
      pixelStorei: createMockFn(),
      getShaderParameter: createMockFn().mockReturnValue(true),
      getProgramParameter: createMockFn().mockReturnValue(true),
      getShaderInfoLog: createMockFn().mockReturnValue(''),
      getProgramInfoLog: createMockFn().mockReturnValue(''),
      createFramebuffer: createMockFn(),
      bindFramebuffer: createMockFn(),
      framebufferTexture2D: createMockFn(),
      checkFramebufferStatus: createMockFn().mockReturnValue(36053), // FRAMEBUFFER_COMPLETE
      deleteFramebuffer: createMockFn(),
      deleteTexture: createMockFn(),
      deleteBuffer: createMockFn(),
      deleteProgram: createMockFn(),
      deleteShader: createMockFn(),
      drawBuffersWEBGL: createMockFn(),
      activeTexture: createMockFn(),
      getAttribLocation: createMockFn().mockReturnValue(0),
      getUniformLocation: createMockFn().mockReturnValue({}),
      uniformMatrix4fv: createMockFn(),
      uniform1i: createMockFn(),
      uniform1f: createMockFn(),
      uniform2f: createMockFn(),
      uniform3f: createMockFn(),
      uniform4f: createMockFn(),
      vertexAttribPointer: createMockFn(),
      enableVertexAttribArray: createMockFn(),
      disableVertexAttribArray: createMockFn(),
      depthFunc: createMockFn(),
      depthMask: createMockFn(),
      cullFace: createMockFn(),
      frontFace: createMockFn(),
      readPixels: createMockFn(),
      finish: createMockFn(),
      flush: createMockFn(),
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      ARRAY_BUFFER: 34962,
      ELEMENT_ARRAY_BUFFER: 34963,
      STATIC_DRAW: 35044,
      DYNAMIC_DRAW: 35048,
      COLOR_BUFFER_BIT: 16384,
      DEPTH_BUFFER_BIT: 256,
      STENCIL_BUFFER_BIT: 1024,
      FRAMEBUFFER: 36160,
      FRAMEBUFFER_COMPLETE: 36053,
      COLOR_ATTACHMENT0: 36064,
      DEPTH_ATTACHMENT: 36096,
      STENCIL_ATTACHMENT: 36128,
    };

    return new Proxy(ctx, {
      get(target: any, prop: string | symbol) {
        if (prop in target) {
          return target[prop];
        }
        const mockFn = createMockFn();
        target[prop] = mockFn;
        return mockFn;
      }
    }) as any;
  }
  return null;
}) as any;

const MINIMAL_TRANSPARENT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

HTMLCanvasElement.prototype.toDataURL = jest.fn(function(type?: string) {
  return `data:${type || 'image/png'};base64,${MINIMAL_TRANSPARENT_PNG}`;
}) as any;
