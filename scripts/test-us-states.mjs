import {
  US_STATES,
  DEFAULT_USER_LOCATION,
  canonicalUsState,
  resolveStoredUserLocation,
} from '../lib/usStates.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(US_STATES.length === 50, `expected 50 states, got ${US_STATES.length}`);
assert(DEFAULT_USER_LOCATION === 'Oregon', `default location is Oregon`);

assert(canonicalUsState('oregon') === 'Oregon', 'case-insensitive oregon');
assert(canonicalUsState('Texas') === 'Texas', 'Texas exact');
assert(canonicalUsState('') === null, 'empty string');
assert(canonicalUsState(null) === null, 'null');
assert(canonicalUsState('Flroida') === null, 'typo is not canonical');
assert(canonicalUsState('not-a-state') === null, 'unknown string');

assert(resolveStoredUserLocation('') === DEFAULT_USER_LOCATION, 'empty resolves to default');
assert(resolveStoredUserLocation('oregon') === 'Oregon', 'oregon resolves to Oregon');
assert(resolveStoredUserLocation('Flroida') === DEFAULT_USER_LOCATION, 'legacy typo resolves to default for select');

if (failed) {
  process.exit(1);
}
console.log(`OK: ${US_STATES.length} states, resolver checks passed`);
