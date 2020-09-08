import { WebGL } from "./types.js";
import { getProgram, onRenderComplete } from "./Program.js";

const INPUT_MATRIX_4 = new Float32Array(16);

/**
 * A ProgramInput represents a "uniform" value (a webgl concept) which can be
 * passed to the shaders. There are many builders provided within this module,
 * each representing the different types of values you can use.
 */
export class ProgramInput {
  /**
   * @param {string} shaderIdentifier - The name of the declaration within the shader
   */
  constructor(shaderIdentifier) {
    /**
     * @type {WebGL}
     * @private
     */
    this.maybeGL = null;
    /**
     * This will be defined whenever maybeGL is non-null
     * @type {WebGLUniformLocation}
     * @private
     */
    this.maybeLoc = null;
    /** @const {string} shaderIdentifier The name of the declaration within the shader */
    this.shaderIdentifier = shaderIdentifier;
  }

  /**
   * Looks up the active Program and checks that this input is in that Program,
   * then loads the gl location.
   * @private
   */
  loadGL() {
    let gl = this.maybeGL;
    if (gl) return;

    const program = getProgram();

    // check that the active program has this as an input
    if (!program) {
      throw new Error("ProgramInput.set called without any program rendering");
    }
    if (!program.inputSet.has(this)) {
      throw new Error("ProgramInput.set called during a different program");
    }

    gl = program.gl;

    const loc = gl.getUniformLocation(program.glProgram, this.shaderIdentifier);
    if (loc == null) {
      throw new Error(
        `No Uniform Variable ${this.shaderIdentifier} within ${program.name}`
      );
    }

    this.maybeGL = gl;
    this.maybeLoc = loc;

    // make the system reset after the render, so that we re-check the next time around
    onRenderComplete(() => {
      this.maybeGL = null;
      this.maybeLoc = null;
    });
  }
}

export class Mat4fv extends ProgramInput {
  /**
   * Sets the matrix to the given args
   * @param {number} x1
   * @param {number} y1
   * @param {number} z1
   * @param {number} w1
   * @param {number} x2
   * @param {number} y2
   * @param {number} z2
   * @param {number} w2
   * @param {number} x3
   * @param {number} y3
   * @param {number} z3
   * @param {number} w3
   * @param {number} x4
   * @param {number} y4
   * @param {number} z4
   * @param {number} w4
   */
  set(x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3, x4, y4, z4, w4) {
    // TODO
    INPUT_MATRIX_4[0] = x1;
    INPUT_MATRIX_4[1] = y1;
    INPUT_MATRIX_4[2] = z1;
    INPUT_MATRIX_4[3] = w1;
    INPUT_MATRIX_4[4] = x2;
    INPUT_MATRIX_4[5] = y2;
    INPUT_MATRIX_4[6] = z2;
    INPUT_MATRIX_4[7] = w2;
    INPUT_MATRIX_4[8] = x3;
    INPUT_MATRIX_4[9] = y3;
    INPUT_MATRIX_4[10] = z3;
    INPUT_MATRIX_4[11] = w3;
    INPUT_MATRIX_4[12] = x4;
    INPUT_MATRIX_4[13] = y4;
    INPUT_MATRIX_4[14] = z4;
    INPUT_MATRIX_4[15] = w4;
    this.setMatrix(INPUT_MATRIX_4);
  }

  /**
   * Sets the value to the given matrix input
   * @param {Float32Array} matrix A 4x4 matrix (meaning an array of 16 elements)
   */
  setMatrix(matrix) {
    this.loadGL();
    this.maybeGL.uniformMatrix4fv(this.maybeLoc, false, matrix);
  }
}

/**
 * Returns the active gl, or throws an error if there is no active program or
 * the active program does not have this input.
 * @param {ProgramInput} input
 * @returns {!WebGL}
 */
function getGLAndCheckProgram(input) {
  const program = getProgram();

  if (!program) {
    throw new Error("ProgramInput.set called without any program rendering");
  }

  if (!program.inputSet.has(input)) {
    throw new Error("ProgramInput.set called during a different program");
  }

  return program.gl;
}
