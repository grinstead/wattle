import { WebGL } from "./types.js";

/**
 * Wraps a WebGL texture.
 * @property {string} name - A name for debugging
 * @property {WebGL} gl - The context this texture is attached to
 * @property {number} w - the width of the texture (in pixels)
 * @property {number} h - the height of the texture (in pixels)
 */
export class Texture {
  constructor(gl, name, width, height, createTexture) {
    this.gl = gl;
    this.name = name;
    this.w = width;
    this.h = height;
    this._glTex = createTexture(gl);
  }

  bindTexture() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this._glTex);
  }

  passSize(anchor) {
    this.gl.uniform2f(anchor, this.w, this.h);
  }

  rawTexture() {
    return this._glTex;
  }
}

/**
 * Loads a texture from the internet
 * @param {Object} options
 * @param {string} options.src - The url of the image (must be on the same domain)
 * @param {string} options.name - The name of the resultant Texture (for debugging)
 * @param {WebGL} options.gl
 * @returns {Promise<Texture>} The loaded texture
 */
export function loadTextureFromImgUrl(options) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => void resolve(image);
    image.onerror = () => {
      reject(new Error(`failed to load ${options.src}`));
    };
    image.mode = "no-cors";
    image.src = options.src;
  }).then((img) => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    return new Texture(
      options.gl,
      options.name,
      width,
      height,
      createStandardTexture((gl) => {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );
      })
    );
  });
}

/**
 *
 * @param {Object} options
 * @param {Uint8Array} options.bmp
 * @param {string} options.name
 * @param {number} options.width
 * @param {number} options.height
 * @param {WebGL} options.gl
 * @returns {Texture}
 */
export function loadTextureFromRawBitmap(options) {
  const { width, height } = options;
  return new Texture(
    options.gl,
    options.name,
    width,
    height,
    createStandardTexture((gl) => {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        options.bmp,
        0
      );
    })
  );
}

/**
 *
 * @param {Object} options
 * @param {WebGLTexture} options.tex
 * @param {string} options.name
 * @param {number} options.width
 * @param {number} options.height
 * @param {WebGL} options.gl
 * @returns {Texture}
 */
export function wrapPremadeTexture(options) {
  return new Texture(
    options.gl,
    options.name,
    options.width,
    options.height,
    () => options.tex
  );
}

function createStandardTexture(loader) {
  return (gl) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    loader(gl);
    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  };
}

/**
 * Creates a 1x1 texture of the given color
 * @param {WebGL} gl
 * @param {number} r - red channel 0-255
 * @param {number} g - green channel 0-255
 * @param {number} b - blue channel 0-255
 * @param {number} a - alpha channel 0-255
 * @returns {Texture}
 */
export function makeSolidTexture(gl, r, g, b, a) {
  return loadTextureFromRawBitmap({
    name: "solid",
    width: 1,
    height: 1,
    gl,
    bmp: new Uint8Array([r, g, b, a]),
  });
}
