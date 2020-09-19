/**
 * @file Wrapper for inputs
 */

/**
 * Keeps track of the IO events to that element, specifically keyboard and mouse events.
 * @property {Map<number, Object>} _presses - Maps key-codes to a bunch of info
 */
export class InputManager {
  /**
   * Creates an InputManager and immediately starts tracking inputs to the given dom element
   * @param {Element} domElement - The dom element to track
   */
  constructor(domElement) {
    this._domElement = domElement;
    this._inFocus = document.activeElement === domElement;
    this._presses = new Map();
    this._actionToKeys = new Map();
    this._keyToAction = new Map();

    domElement.addEventListener("keydown", (e) => {
      keyChanged(this, e, true);
    });
    domElement.addEventListener("keyup", (e) => {
      keyChanged(this, e, false);
    });
    domElement.onblur = () => {
      this._presses.clear();
      this._inFocus = false;
    };
    domElement.onfocus = () => {
      this._presses.clear();
      this._inFocus = true;
    };
  }

  /**
   *
   * @param {string} action
   * @param {?Array<string>} keys
   */
  setKeysForAction(action, keys) {
    const actionToKeys = this._actionToKeys;
    const prevKeys = actionToKeys.get(action);

    const keyToAction = this._keyToAction;
    if (prevKeys) {
      prevKeys.forEach((key) => {
        keyToAction.delete(key);
      });
    }

    if (keys != null) {
      actionToKeys.set(action, keys);
      keys.forEach((key) => {
        keyToAction.set(key, action);
      });
    } else {
      actionToKeys.delete(action);
    }
  }

  /**
   * Returns whether the action is currently triggered
   * @param {string} action
   * @returns {boolean} whether the action is actively pressed
   */
  isPressed(action) {
    const keys = this._actionToKeys.get(action);
    const presses = this._presses;
    return (
      !!keys &&
      !!keys.some((key) => {
        const obj = presses.get(key);
        if (obj) {
          obj.danglingCount = 0;
          return obj.heldSince != null;
        } else {
          return false;
        }
      })
    );
  }

  numPresses(action) {
    const keys = this._actionToKeys.get(action);
    if (keys) {
      const presses = this._presses;
      return keys.reduce((count, key) => {
        const obj = presses.get(key);
        if (obj) {
          const newCount = count + obj.danglingCount;
          obj.danglingCount = 0;
          return newCount;
        } else {
          return count;
        }
      }, 0);
    } else {
      return 0;
    }
  }

  /**
   * An easy way to test if the user wants to go left or right
   * @param {string} negAction - If this is held down, returns -1
   * @param {string} posAction - If this is held down, returns 1
   * @returns -1 if negAction is pressed, 1 if posAction is pressed, 0 if neither or both is pressed
   */
  getSignOfAction(negAction, posAction) {
    const neg = this.isPressed(negAction) ? 1 : 0;
    const pos = this.isPressed(posAction) ? 1 : 0;
    return pos - neg;
  }
}

/**
 *
 * @param {InputManager} manager
 * @param {Event} event
 * @param {boolean} isPressed
 */
function keyChanged(manager, event, isPressed) {
  const key = event.key;
  if (manager._keyToAction.has(key)) {
    event.preventDefault();
    event.stopPropagation();
  }

  const presses = manager._presses;
  const object = presses.get(key);
  if (isPressed) {
    if (object == null) {
      presses.set(key, {
        heldSince: Date.now(),
        danglingCount: 1,
      });
    } else {
      if (object.heldSince == null) {
        object.heldSince = Date.now();
      }
      object.danglingCount++;
    }
  } else {
    if (object != null) {
      object.heldSince = null;
    }
  }
}
