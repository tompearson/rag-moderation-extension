/** Same 50-state list as Moderation-Tool-Universal src/App.jsx */
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

export const DEFAULT_USER_LOCATION = 'Oregon';

/**
 * @param {string | null | undefined} raw
 * @returns {string | null} Canonical state name, or null if not a known state.
 */
export function canonicalUsState(raw) {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const found = US_STATES.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  return found ?? null;
}

/**
 * Value for `<select>`: known states use canonical casing; empty/legacy unknown → default Oregon.
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function resolveStoredUserLocation(raw) {
  return canonicalUsState(raw) ?? DEFAULT_USER_LOCATION;
}

/**
 * @param {HTMLSelectElement} selectEl
 * @param {string} selectedValue
 */
export function populateStateSelect(selectEl, selectedValue) {
  selectEl.size = 1;
  selectEl.multiple = false;
  const selected = resolveStoredUserLocation(selectedValue);
  if (!selectEl.options.length) {
    for (const state of US_STATES) {
      const opt = document.createElement('option');
      opt.value = state;
      opt.textContent = state;
      selectEl.appendChild(opt);
    }
  }
  selectEl.value = US_STATES.includes(selected) ? selected : DEFAULT_USER_LOCATION;
}
