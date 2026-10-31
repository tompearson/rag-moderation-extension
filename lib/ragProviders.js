/** Matches Universal ai-providers.json order (V28.0.114 RAG, then V28 full prompt). */
export const RAG_PROVIDER_OPTIONS = [
  {
    id: 'NextDoor-prompt-production-28-rag',
    label: 'Nextdoor V28.0.114 (RAG)',
  },
  {
    id: 'NextDoor-prompt-production-28',
    label: 'Nextdoor V28.0.114 (no RAG)',
  },
];

export const DEFAULT_RAG_PROVIDER = RAG_PROVIDER_OPTIONS[0].id;

/**
 * @param {string | null | undefined} storedId
 * @returns {string}
 */
export function resolveStoredRagProviderId(storedId) {
  const id = typeof storedId === 'string' ? storedId.trim() : '';
  if (!id) return DEFAULT_RAG_PROVIDER;
  if (RAG_PROVIDER_OPTIONS.some((o) => o.id === id)) return id;
  return id;
}

/**
 * @param {HTMLSelectElement} select
 * @param {string} storedId
 */
export function fillRagProviderSelect(select, storedId) {
  const resolved = resolveStoredRagProviderId(storedId);
  const known = RAG_PROVIDER_OPTIONS.some((o) => o.id === resolved);
  select.replaceChildren();
  for (const opt of RAG_PROVIDER_OPTIONS) {
    const el = document.createElement('option');
    el.value = opt.id;
    el.textContent = opt.label;
    select.appendChild(el);
  }
  if (!known && resolved) {
    const legacy = document.createElement('option');
    legacy.value = resolved;
    legacy.textContent = `Custom (${resolved})`;
    select.appendChild(legacy);
  }
  select.value = known || resolved ? resolved : DEFAULT_RAG_PROVIDER;
}
