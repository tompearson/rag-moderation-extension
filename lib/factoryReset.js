import { clearExtensionStorage, saveSettingsPatch } from './userSettings.js';
import { revokeGrantedHostPermissions } from './permissions.js';

/**
 * Restore a clean slate: empty storage, production profile, revoke granted API host permissions.
 * Open side panel picks up storage changes (location modal, pick mode reset, badges).
 */
export async function factoryResetExtension() {
  await clearExtensionStorage();
  await revokeGrantedHostPermissions();
  await saveSettingsPatch({ envProfileId: 'production' });
}
