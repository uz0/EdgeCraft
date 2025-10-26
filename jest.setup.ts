/**
 * Jest Setup File
 *
 * Configures global test environment with:
 * - Node.js polyfills (TextEncoder, crypto, etc.)
 * - WebGL/Canvas mocks for Babylon.js
 * - Visual regression testing (jest-image-snapshot)
 * - DOM testing matchers (@testing-library/jest-dom)
 */

import '@testing-library/jest-dom';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

// Extend Jest matchers with image snapshot functionality
expect.extend({ toMatchImageSnapshot });

// Configure global image snapshot types
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

// ============================================================================
// GLOBAL POLYFILLS & ENVIRONMENT SETUP
// ============================================================================

// Set global flag for CI environment (used to skip WebGL-dependent tests)
(global as any).IS_CI_ENVIRONMENT = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Add TextEncoder/TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Polyfill Blob.arrayBuffer() for jsdom (not available in older versions)
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

// Add crypto.subtle for hash computations
const { webcrypto } = require('crypto');
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// ============================================================================
// WEBGL & CANVAS MOCKS FOR BABYLON.JS
// ============================================================================

// Mock WebGL2RenderingContext and WebGLRenderingContext for Babylon.js
(global as any).WebGLRenderingContext = class WebGLRenderingContext {};
(global as any).WebGL2RenderingContext = class WebGL2RenderingContext {};

// Helper to create a mock function with bind support
const createMockFn = () => {
  const fn = jest.fn();
  (fn as any).bind = function() { return fn; };
  return fn;
};

// Mock HTMLCanvasElement for both 2D and WebGL contexts
HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
  // Mock 2D context for canvas image generation
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

  // Mock WebGL context for Babylon.js
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    const ctx = {
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getParameter: createMockFn().mockImplementation((param: number) => {
        // Return appropriate values for different parameters
        if (param === 7938) return 'WebGL 1.0';  // VERSION
        if (param === 7937) return 'WebGL Vendor';  // RENDERER
        if (param === 3379) return 16384;  // MAX_TEXTURE_SIZE
        if (param === 35661) return 32;  // MAX_VERTEX_ATTRIBS
        if (param === 3386) return [0, 0, 800, 600];  // VIEWPORT
        return null;
      }),
      getExtension: createMockFn().mockImplementation((name: string) => {
        // Return mock objects for all extensions
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

    // Wrap in Proxy to provide fallback for any unmocked methods
    return new Proxy(ctx, {
      get(target: any, prop: string | symbol) {
        if (prop in target) {
          return target[prop];
        }
        // For any undefined property, return a mock function with bind
        const mockFn = createMockFn();
        target[prop] = mockFn;
        return mockFn;
      }
    }) as any;
  }
  return null;
}) as any;

// Mock HTMLCanvasElement.prototype.toDataURL for image generation
HTMLCanvasElement.prototype.toDataURL = jest.fn(function(type?: string) {
  // Generate a minimal valid data URL for testing
  // This is a 1x1 transparent PNG
  const minimalPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return `data:${type || 'image/png'};base64,${minimalPNG}`;
}) as any;
