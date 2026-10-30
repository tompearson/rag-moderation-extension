import { clearExtensionStorage, saveSettingsPatch } from './userSettings.js';
import { revokeGrantedHostPermissions } from './permissions.js';

/**
 * Restore a clean slate: empty storage, production profile, revoke granted API host permissions.
 * Side panel UI (draft text) is unchanged; reopen side panel for location modal.
 */
export async function factoryResetExtension() {
  await clearExtensionStorage();
  await revokeGrantedHostPermissions();
  await saveSettingsPatch({ envProfileId: 'production' });
}
