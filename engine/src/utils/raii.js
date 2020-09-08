/**
 * @file RAII is a useful concept from C++. The important idea is that things get cleaned up when they go out-of-scope
 */

/**
 * Associates objects with the code we need to run on "cleanup" of those
 * objects. We use a standard Map here instead of a WeakMap because these
 * objects must be cleaned.
 * @type {Map<!Object, Array<function():void>>}
 */
const CLEANABLES = new Map();

/**
 * This is defined if we are in a `runAndCleanOnError` call. It is an array of
 * code to call when cleaning up.
 * @type {Array<function():void>}
 */
let activeCleanupCode = null;

/**
 * Runs code that we are worried might throw an exception. If it does, then the
 * registered clean-up functions will be called (they are registered by calling
 * the `ifError` function)
 * @template T
 * @param {function():T} code
 * @returns {T} the result of calling `code()`
 */
export function runAndCleanOnError(code) {
  const parentCode = activeCleanupCode;
  const cleanUpCode = [];
  activeCleanupCode = cleanUpCode;

  let success = false;
  try {
    const result = code();
    success = true;
    return result;
  } finally {
    activeCleanupCode = parentCode;

    // using a finally block to avoid re-throwing the error (which I think, but
    // have not verified, will mess with the stack)
    if (!success) {
      cleanUpCode.forEach((onError) => {
        try {
          onError();
        } catch (error) {
          console.error(error);
        }
      });
    }
  }
}

/**
 * Runs code that will build up a list of actions to do on cleaning (by calling
 * `onClean`). The resulting object will then be associated with those actions,
 * so that you can later call `cleanUp` and have those commands run. The
 * clean-up commands will also run if the code errors.
 * @template T The return value, must be a non-null object
 * @param {function():T} code
 * @returns {T} The result of calling `code()`. This object will be linked
 * together within the RAII system with the built-up clean-up code. If the
 * object already had some connections, they will all be called on `cleanUp`.
 */
export function buildCleanable(code) {
  const parentCode = activeCleanupCode;
  const cleanUpCode = [];
  activeCleanupCode = cleanUpCode;

  let success = false;
  try {
    const result = code();

    if (result == null || typeof result !== "object") {
      throw new Error("buildCleanable given non-object result");
    }

    const prior = CLEANABLES.get(result);
    CLEANABLES.set(result, prior ? prior.concat(cleanUpCode) : cleanUpCode);

    success = true;

    return result;
  } finally {
    activeCleanupCode = parentCode;

    // using a finally block to avoid re-throwing the error (which I think, but
    // have not verified, will mess with the stack)
    if (!success) {
      cleanUpCode.forEach((onError) => {
        try {
          onError();
        } catch (error) {
          console.error(error);
        }
      });
    }
  }
}

/**
 * Cleans up the given object (the object should have been built with
 * `buildCleanable`). This will not do anything if the object is already cleaned
 * or was never associated with cleaning. All the cleaning functions will be
 * run, even if one throws an error. If one throws though, the error will be
 * thrown here as well.
 * @param {!Object} obj - The object to clean up
 */
export function cleanUpObject(obj) {
  const toRun = CLEANABLES.get(obj);
  if (!toRun) return;

  CLEANABLES.delete(obj);

  let didError = false;
  let error = null;
  toRun.forEach((code) => {
    try {
      code();
    } catch (error) {
      if (didError) {
        console.error(error);
      } else {
        didError = true;
        error = error;
      }
    }
  });

  if (didError) throw error;
}

/**
 * Calls the given function if the code within the current `runAndCleanOnError`
 * code throws an error.
 * @param {function():void} cleanup
 */
export function onCleanUp(cleanup) {
  if (activeCleanupCode) {
    activeCleanupCode.push(cleanup);
  } else {
    throw new Error("onCleanUp called outside of runAndCleanOnError call");
  }
}
