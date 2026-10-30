import { US_STATES, DEFAULT_USER_LOCATION, resolveStoredUserLocation } from './usStates.js';

/** @type {Set<import('./statePicker.js').StatePickerHandle>} */
const allPickers = new Set();

/** @type {Set<import('./statePicker.js').StatePickerHandle>} */
const openPickers = new Set();

function closeAllPickersExcept(except) {
  for (const picker of openPickers) {
    if (picker !== except) picker.closeList();
  }
}

function isEventInsideAnyPicker(target) {
  if (!target) return false;
  for (const picker of allPickers) {
    if (picker.contains(/** @type {Node} */ (target))) return true;
  }
  return false;
}

document.addEventListener(
  'pointerdown',
  (e) => {
    if (isEventInsideAnyPicker(/** @type {Node | null} */ (e.target))) return;
    closeAllPickersExcept(null);
  },
  true,
);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllPickersExcept(null);
});

/**
 * @typedef {Object} StatePickerHandle
 * @property {HTMLElement} root
 * @property {() => string} getValue
 * @property {(state: string) => void} setValue
 * @property {(fn: (state: string) => void) => () => void} onChange
 * @property {() => void} closeList
 * @property {() => boolean} isListOpen
 * @property {() => void} focus
 * @property {(node: Node | null) => boolean} contains
 */

/**
 * Custom scrollable state list (standard DOM; Chrome on Windows, macOS, and Linux).
 * Replaces native &lt;select&gt; where long lists are awkward to scroll in extension pages.
 * @param {HTMLElement} host
 * @param {{ initialValue?: string | null; triggerId?: string }} [options]
 * @returns {StatePickerHandle}
 */
export function createStatePicker(host, options = {}) {
  if (!host) {
    throw new Error('State picker host element is missing');
  }

  host.classList.add('state-picker-host');
  host.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'state-picker';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'state-picker-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const valueSpan = document.createElement('span');
  valueSpan.className = 'state-picker-value';

  const chevron = document.createElement('span');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '▾';

  trigger.append(valueSpan, chevron);

  const list = document.createElement('ul');
  list.className = 'state-picker-list hidden';
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;

  if (options.triggerId) {
    trigger.id = options.triggerId;
  }

  /** @type {string} */
  let currentValue = resolveStoredUserLocation(options.initialValue);
  /** @type {Set<(state: string) => void>} */
  const listeners = new Set();

  for (const state of US_STATES) {
    const li = document.createElement('li');
    li.className = 'state-picker-option';
    li.setAttribute('role', 'option');
    li.dataset.value = state;
    li.textContent = state;
    li.tabIndex = -1;
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      applyValue(state, true);
      closeList();
    });
    list.appendChild(li);
  }

  function clearListPosition() {
    list.style.position = '';
    list.style.top = '';
    list.style.left = '';
    list.style.width = '';
    list.style.maxHeight = '';
  }

  function mountListOverlay() {
    if (list.parentNode !== document.body) {
      document.body.appendChild(list);
    }
  }

  function mountListInRoot() {
    if (list.parentNode !== root) {
      root.appendChild(list);
    }
  }

  function listOptions() {
    return /** @type {HTMLElement[]} */ ([...list.querySelectorAll('.state-picker-option')]);
  }

  function focusOptionAtIndex(index) {
    const options = listOptions();
    if (!options.length) return;
    const i = Math.max(0, Math.min(options.length - 1, index));
    options[i].focus();
  }

  function positionList() {
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const maxH = Math.min(280, window.innerHeight - rect.bottom - gap - 8);
    list.style.position = 'fixed';
    list.style.left = `${rect.left}px`;
    list.style.width = `${rect.width}px`;
    list.style.maxHeight = `${Math.max(120, maxH)}px`;
    list.style.top = `${rect.bottom + gap}px`;
    if (maxH < 120 && rect.top > window.innerHeight / 2) {
      const aboveH = Math.min(280, rect.top - gap - 8);
      list.style.top = `${Math.max(8, rect.top - gap - aboveH)}px`;
      list.style.maxHeight = `${Math.max(120, aboveH)}px`;
    }
  }

  function renderSelected() {
    valueSpan.textContent = currentValue;
    trigger.setAttribute('aria-label', `Selected state: ${currentValue}`);
    for (const li of list.querySelectorAll('.state-picker-option')) {
      const el = /** @type {HTMLElement} */ (li);
      const selected = el.dataset.value === currentValue;
      el.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
  }

  /**
   * @param {string} state
   * @param {boolean} notify
   */
  function applyValue(state, notify) {
    const next = resolveStoredUserLocation(state);
    const changed = next !== currentValue;
    currentValue = next;
    renderSelected();
    if (notify && changed) {
      for (const fn of listeners) fn(currentValue);
    }
  }

  function openList() {
    closeAllPickersExcept(handle);
    mountListOverlay();
    positionList();
    list.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    openPickers.add(handle);
    const options = listOptions();
    const selectedIdx = options.findIndex((el) => el.dataset.value === currentValue);
    const scrollTarget = options[selectedIdx >= 0 ? selectedIdx : 0];
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ block: 'nearest' });
      scrollTarget.focus();
    } else {
      list.focus();
    }
  }

  function closeList() {
    list.classList.add('hidden');
    clearListPosition();
    mountListInRoot();
    trigger.setAttribute('aria-expanded', 'false');
    openPickers.delete(handle);
  }

  function toggleList() {
    if (list.classList.contains('hidden')) openList();
    else closeList();
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleList();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleList();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openList();
    }
  });

  list.addEventListener(
    'wheel',
    (e) => {
      e.stopPropagation();
    },
    { passive: true },
  );

  list.addEventListener('keydown', (e) => {
    const options = listOptions();
    const idx = options.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (e.key === 'Escape') {
      e.preventDefault();
      closeList();
      trigger.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusOptionAtIndex(idx < 0 ? 0 : idx + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusOptionAtIndex(idx < 0 ? options.length - 1 : idx - 1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const el = /** @type {HTMLElement | null} */ (document.activeElement);
      if (el?.classList.contains('state-picker-option') && el.dataset.value) {
        e.preventDefault();
        applyValue(el.dataset.value, true);
        closeList();
        trigger.focus();
      }
    }
  });

  function repositionIfOpen() {
    if (handle.isListOpen()) positionList();
  }

  window.addEventListener('resize', repositionIfOpen);
  window.addEventListener('scroll', repositionIfOpen, true);

  root.append(trigger, list);
  host.appendChild(root);

  /** @type {StatePickerHandle} */
  const handle = {
    root,
    getValue: () => currentValue,
    setValue: (state) => applyValue(state, false),
    onChange: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    closeList,
    isListOpen: () => !list.classList.contains('hidden'),
    focus: () => trigger.focus(),
    contains: (node) => {
      if (!node) return false;
      return root.contains(node) || list.contains(node);
    },
  };

  allPickers.add(handle);
  applyValue(currentValue, false);
  return handle;
}
