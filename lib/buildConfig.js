/** @typedef {'development' | 'store'} ExtensionTarget */

/** @type {ExtensionTarget} */
export const EXTENSION_TARGET = 'development';

/** @returns {boolean} */
export function isStoreBuild() {
  return EXTENSION_TARGET === 'store';
}
