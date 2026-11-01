/** @typedef {'development' | 'store'} ExtensionTarget */

/** @type {ExtensionTarget} */
export const EXTENSION_TARGET = 'store';

/** @returns {boolean} */
export function isStoreBuild() {
  return EXTENSION_TARGET === 'store';
}
