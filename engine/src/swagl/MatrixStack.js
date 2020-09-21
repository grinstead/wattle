import { Mat4fv } from "./ProgramInput.js";
import { onRenderComplete, getProgram } from "./Program.js";
import { WebGL } from "./types.js";

// prettier-ignore
const IDENTITY = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

/** @type {Mat4fv} */
let activeInput = null;
/** @type {!Array<Float32Array>} */
const matrixStack = [IDENTITY];

/**
 *
 * @param {!Mat4fv} input - The input into the shader the matrix stack should be written to
 */
export function useMatrixStack(input) {
  if (activeInput != null) {
    throw new Error("useMatrixStack called while already being used");
  }

  // call this first so it can throw an exception if this was called outside of a render
  onRenderComplete(() => {
    // clear out all but the identity matrix
    for (let i = matrixStack.length; i > 1; --i) matrixStack.pop();
    activeInput = null;
  });

  activeInput = input;
  input.setMatrix(IDENTITY);
}

/**
 * Throws a descriptive error if there is no activeInput
 * @returns {!Mat4fv} the non-null active input
 */
function assertInputNotNull() {
  if (activeInput == null) {
    throw new Error(
      getProgram()
        ? "MatrixStack operation invoked outside of a render that called useMatrixStack"
        : "MatrixStack operation invoked outside of a render"
    );
  }

  return activeInput;
}

/**
 * Pushes this matrix onto the stack, but does not combine it with the previous
 * elements in the stack, so that things will render exactly according to this
 * matrix. Once it pops, it will return to what it was.
 * @param {!Float32Array} matrix
 */
export function applyAbsoluteMatrixOperation(matrix) {
  const input = assertInputNotNull();
  matrixStack.push(matrix);
  activeInput.setMatrix(matrix);
}

/**
 * Pushes this matrix onto the stack, so that its action will be combined with
 * what is higher in the stack.
 * @param {!Float32Array} A
 */
export function applyMatrixOperation(A) {
  const input = assertInputNotNull();
  const B = lastInStack();

  // Multiply A and B... beautiful...
  const matrix = new Float32Array([
    A[0] * B[0] + A[1] * B[4] + A[2] * B[8] + A[3] * B[12],
    A[0] * B[1] + A[1] * B[5] + A[2] * B[9] + A[3] * B[13],
    A[0] * B[2] + A[1] * B[6] + A[2] * B[10] + A[3] * B[14],
    A[0] * B[3] + A[1] * B[7] + A[2] * B[11] + A[3] * B[15],
    A[4] * B[0] + A[5] * B[4] + A[6] * B[8] + A[7] * B[12],
    A[4] * B[1] + A[5] * B[5] + A[6] * B[9] + A[7] * B[13],
    A[4] * B[2] + A[5] * B[6] + A[6] * B[10] + A[7] * B[14],
    A[4] * B[3] + A[5] * B[7] + A[6] * B[11] + A[7] * B[15],
    A[8] * B[0] + A[9] * B[4] + A[10] * B[8] + A[11] * B[12],
    A[8] * B[1] + A[9] * B[5] + A[10] * B[9] + A[11] * B[13],
    A[8] * B[2] + A[9] * B[6] + A[10] * B[10] + A[11] * B[14],
    A[8] * B[3] + A[9] * B[7] + A[10] * B[11] + A[11] * B[15],
    A[12] * B[0] + A[13] * B[4] + A[14] * B[8] + A[15] * B[12],
    A[12] * B[1] + A[13] * B[5] + A[14] * B[9] + A[15] * B[13],
    A[12] * B[2] + A[13] * B[6] + A[14] * B[10] + A[15] * B[14],
    A[12] * B[3] + A[13] * B[7] + A[14] * B[11] + A[15] * B[15],
  ]);

  matrixStack.push(matrix);
  activeInput.setMatrix(matrix);
}

/**
 * Shifts the rendered content along each of the axes
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function shiftContent(x, y, z) {
  const A = lastInStack();
  applyAbsoluteMatrixOperation(
    // prettier-ignore
    new Float32Array([
      A[0], A[1], A[2], A[3],
      A[4], A[5], A[6], A[7],
      A[8], A[9], A[10], A[11],
      x * A[0] + y * A[4] + z * A[8] + A[12],
      x * A[1] + y * A[5] + z * A[9] + A[13],
      x * A[2] + y * A[6] + z * A[10] + A[14],
      x * A[3] + y * A[7] + z * A[11] + A[15],
    ])
  );
}

/**
 * Rotates the rendered content around the y-axis
 * @param {number} angle
 */
export function rotateAboutY(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  applyMatrixOperation(
    // prettier-ignore
    new Float32Array([
       cos, 0,  sin, 0,
         0, 1,    0, 0,
      -sin, 0,  cos, 0,
         0, 0,    0, 1,
    ])
  );
}

/**
 * Rotates the rendered content around the Z axis
 * @param {number} angle
 */
export function rotateAboutZ(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  applyMatrixOperation(
    // prettier-ignore
    new Float32Array([
       cos, sin, 0, 0,
      -sin, cos, 0, 0,
        0,    0, 1, 0,
        0,    0, 0, 1,
    ])
  );
}

/**
 * Multiply each axis by the given constant. -1 will mirror an axis, 1 will keep
 * it the same.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function scaleAxes(x, y, z) {
  applyMatrixOperation(
    // prettier-ignore
    new Float32Array([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1,
    ])
  );
}

/**
 * Calls the code function (synchronously) with the active gl argument. Any
 * matrix operations pushed onto the stack by the code function will be popped.
 * @param {function(WebGL):void} code
 */
export function subrender(code) {
  const input = assertInputNotNull();
  const preRunLength = matrixStack.length;

  try {
    code(getProgram().gl);
  } finally {
    const diff = matrixStack.length - preRunLength;
    if (diff !== 0) {
      for (let i = 0; i < diff; ++i) matrixStack.pop();
      input.setMatrix(matrixStack[preRunLength - 1]);
    }
  }
}

/**
 * Calls the code function (synchronously) with the given argument and the active gl. Any
 * matrix operations pushed onto the stack by the code function will be popped.
 * @template T
 * @param {function(T,WebGL):void} code
 * @param {T} arg
 */
export function subrenderWithArg(code, arg) {
  const input = assertInputNotNull();
  const preRunLength = matrixStack.length;

  try {
    code(arg, getProgram().gl);
  } finally {
    const diff = matrixStack.length - preRunLength;
    if (diff !== 0) {
      for (let i = 0; i < diff; ++i) matrixStack.pop();
      input.setMatrix(matrixStack[preRunLength - 1]);
    }
  }
}

/**
 * Calls the code function (synchronously) with each element in the list. Any
 * matrix operations pushed onto the stack by the code function will be popped.
 * @template T
 * @param {!Array<T>} items
 * @param {function(T,WebGL):void} code
 */
export function subrenderEach(items, code) {
  items.forEach((item) => {
    subrenderWithArg(code, item);
  });
}

function lastInStack() {
  return matrixStack[matrixStack.length - 1];
}
