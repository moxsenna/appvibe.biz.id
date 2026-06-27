import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PACKS } from '../functions/lib/packs.js';
import { PACK_PRICES, PACK_PRODUCT_KEYS, vaultPacks } from '../src/scripts/data/vault-packs.js';

test('frontend pack data derives critical checkout fields from canonical backend packs', () => {
  for (const [packId, pack] of Object.entries(PACKS)) {
    assert.deepEqual(vaultPacks[packId].appIds, pack.appIds);
    assert.equal(vaultPacks[packId].amount, pack.amount);
    assert.equal(PACK_PRICES[packId], pack.amount);
    assert.equal(PACK_PRODUCT_KEYS[packId], pack.product_key);
  }
});
