import assert from 'node:assert/strict';
import { SIDE_PANEL_PORT_NAME } from '../lib/sidePanelOptionsCompanion.js';

assert.equal(SIDE_PANEL_PORT_NAME, 'rag-side-panel');

console.log('OK — side panel options companion tests passed');