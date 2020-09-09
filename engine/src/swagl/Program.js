import { onCleanUp, buildCleanable } from "../utils/raii.js";
import { WebGL } from "./types.js";
import { ProgramInput } from "./ProgramInput.js";

/**
 * @file This code wraps the notion of a WebGL Program. Programs have fixed
 * shader values and you draw to specific programs to have things which are
 * drawn according to different shaders.
 */

/**
 * A string that will get compiled into a vertex shader.
 * @typedef {{name: string, code: string}} VertexShader
 */
export let VertexShader;

/**
 * A string that will get compiled into a fragment shader.
 * @typedef {{name: string, code: string}} FragmentShader
 */
export let FragmentShader;

/** @typedef {{vertex: VertexShader, fragment: FragmentShader}} Shaders */
export let Shaders;

/**
 * The currently rendering program
 * @type {Program}
 */
let activeProgram = null;
/**
 * Code to run when the active program is completed
 * @type {Array<function(boolean):void>}
 */
let codeOnRenderEnd = null;

/**
 * Wraps a WebGL Program, which is basically a fixed set of shaders. If you want
 * to draw things with different shaders, you will have two use different
 * programs that are attached to the same WebGL context.
 * @template Inputs - All the `ProgramInput`, should be type `!Object<string, ProgramInput>`
 * objects that this Program supports
 */
export class Program {
  /**
   * Use makeAndLinkProgram instead of constructing directly
   * @private
   */
  constructor(name, gl, glProgram, inputs) {
    /** @const @type {string} */
    this.name = name;
    /** @const @type {!WebGL} */
    this.gl = gl;
    /** @const @type {Inputs} */
    this.inputs = inputs;
    /** @package @const @type {!Set<!ProgramInput>} */
    this.inputSet = new Set(Object.values(inputs));
    /** @const @type {!WebGLProgram} */
    this.glProgram = glProgram;
    /** @private @const @type {!Map<string, number>} */
    this.attributes = new Map();
    /** @private @const @type {!Map<string, !WebGLUniformLocation>} */
    this.uniforms = new Map();
  }

  /**
   * Returns the WebGL identifier for the attribute of a given name. This will
   * throw if no such attribute exists.
   * @param {string} name
   * @returns number
   */
  attr(name) {
    const cached = this.attributes.get(name);
    if (cached != null) return cached;

    const attr = this.gl.getAttribLocation(this.glProgram, name);
    if (attr === -1) throw new Error(`Unknown attribute "${name}"`);

    this.attributes.set(name, attr);
    return attr;
  }

  /**
   * Returns the reference location for the given uniform value. This will throw
   * an error if no such value exists.
   * @param {string} name
   * @returns !WebGLUniformLocation
   */
  uniform(name) {
    const cached = this.uniforms.get(name);
    if (cached) return cached;

    const uniform = this.gl.getUniformLocation(this.glProgram, name);
    if (uniform == null) throw new Error(`Unknown uniform value "${name}"`);

    this.uniforms.set(name, uniform);
    return uniform;
  }
}

/**
 * Returns the active Program object, or null if there is none
 * @returns {Program}
 */
export function getProgram() {
  return activeProgram;
}

/**
 * Runs the code (synchronously) in the program's context
 * @template T - The result type of code
 * @param {Program} program - The program
 * @param {function(WebGL):T} code - The rendering code
 * @returns {T} The result of `code()`
 */
export function renderInProgram(program, code) {
  if (activeProgram) {
    throw new Error("renderInProgram called during another renderInProgram");
  }

  const gl = program.gl;
  gl.useProgram(program.glProgram);

  activeProgram = program;
  let didError = true;
  try {
    code(gl);
    didError = false;
  } finally {
    // call any pending code. Do not set `activeProgram` to null until after they are all called
    if (codeOnRenderEnd) {
      const toCall = codeOnRenderEnd;
      codeOnRenderEnd = null;
      toCall.forEach((onEnd) => {
        try {
          onEnd(didError);
        } catch (error) {
          console.error(error);
        }
      });
    }

    activeProgram = null;
  }
}

/**
 * Provides a way to do clean-up code when the render completes. It is passed a
 * boolean for whether or not the render code threw an exception (true for
 * threw, false if render completed normally)
 * @param {function(boolean):void} code
 */
export function onRenderComplete(code) {
  if (!activeProgram) {
    throw new Error("onRenderComplete called outside of renderInProgram");
  }

  if (codeOnRenderEnd) {
    codeOnRenderEnd.push(code);
  } else {
    codeOnRenderEnd = [code];
  }
}

/**
 * Builds out and "links" (a WebGL concept) a new program to the given context.
 * If you wish to clean-up the Program's resources later, you can call
 * `cleanUpObject(program)`
 * @template Inputs - All the `ProgramInput`s, should be type `!Object<string, ProgramInput>`
 * that the Program should support
 * @param {Object} options
 * @param {string} options.name - The name of the program, mostly used for
 * debugging
 * @param {!WebGL} options.gl
 * @param {T} options.inputs
 * @param {Shaders} options.shaders
 * @returns {!Program<Inputs>} A program that has been linked
 */
export function makeAndLinkProgram(options) {
  return buildCleanable(() => {
    const { gl, shaders } = options;

    const vertexShader = buildShader(
      gl,
      gl.createShader(gl.VERTEX_SHADER),
      shaders.vertex
    );
    const fragmentShader = buildShader(
      gl,
      gl.createShader(gl.FRAGMENT_SHADER),
      shaders.fragment
    );

    const glProgram = gl.createProgram();
    onCleanUp(() => void gl.deleteProgram(glProgram));

    gl.attachShader(glProgram, vertexShader);
    gl.attachShader(glProgram, fragmentShader);
    gl.linkProgram(glProgram);

    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(glProgram);
      throw new Error(`Failed to link ${options.name} program: ${info}`);
    }

    return new Program(options.name, gl, glProgram, options.inputs);
  });
}

/**
 *
 * @param {WebGL} gl
 * @param {WebGLShader} glShader
 * @param {VertexShader|FragmentShader} shader
 * @return {WebGLShader} The glShader that we were given
 */
function buildShader(gl, glShader, shader) {
  gl.shaderSource(glShader, shader.code);
  onCleanUp(() => void gl.deleteShader(glShader));

  gl.compileShader(glShader);

  const compiled = gl.getShaderParameter(glShader, gl.COMPILE_STATUS);
  if (!compiled) {
    const error = gl.getShaderInfoLog(glShader);
    throw new Error(`Failed to compile ${shader.name}: ${error}`);
  }

  return glShader;
}
