// Jest setup file to configure globals for test environment

// Add TextEncoder/TextDecoder for CopyrightValidator tests
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add crypto.subtle for hash computations
const { webcrypto } = require('crypto');
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// Mock HTMLCanvasElement for Babylon.js tests
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
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
}));

// Mock WebGL context
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    return {
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getParameter: jest.fn((param) => {
        // Return appropriate values for different parameters
        if (param === 7938) return 'WebGL 1.0';  // VERSION
        if (param === 7937) return 'WebGL Vendor';  // RENDERER
        if (param === 3379) return 16384;  // MAX_TEXTURE_SIZE
        if (param === 35661) return 32;  // MAX_VERTEX_ATTRIBS
        if (param === 3386) return [0, 0, 800, 600];  // VIEWPORT
        return null;
      }),
      getExtension: jest.fn((name) => {
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
      createProgram: jest.fn(),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      createTexture: jest.fn(),
      bindTexture: jest.fn(),
      texImage2D: jest.fn(),
      texParameteri: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      blendFunc: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      clearDepth: jest.fn(),
      viewport: jest.fn(),
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
      pixelStorei: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      getProgramParameter: jest.fn(() => true),
      getShaderInfoLog: jest.fn(() => ''),
      getProgramInfoLog: jest.fn(() => ''),
      createFramebuffer: jest.fn(),
      bindFramebuffer: jest.fn(),
      framebufferTexture2D: jest.fn(),
      checkFramebufferStatus: jest.fn(() => 36053), // FRAMEBUFFER_COMPLETE
      deleteFramebuffer: jest.fn(),
      deleteTexture: jest.fn(),
      deleteBuffer: jest.fn(),
      deleteProgram: jest.fn(),
      deleteShader: jest.fn(),
      drawBuffersWEBGL: jest.fn(),
      activeTexture: jest.fn(),
      getAttribLocation: jest.fn(() => 0),
      getUniformLocation: jest.fn(() => ({})),
      uniformMatrix4fv: jest.fn(),
      uniform1i: jest.fn(),
      uniform1f: jest.fn(),
      uniform2f: jest.fn(),
      uniform3f: jest.fn(),
      uniform4f: jest.fn(),
      vertexAttribPointer: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      disableVertexAttribArray: jest.fn(),
      depthFunc: jest.fn(),
      depthMask: jest.fn(),
      cullFace: jest.fn(),
      frontFace: jest.fn(),
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
  }
  return null;
});
