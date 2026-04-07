// CJS shim for the uuid package — used by Jest because uuid v9+ is ESM-only.
// Uses Node's built-in crypto.randomUUID() which produces a valid v4 UUID.
const { randomUUID } = require('crypto');

module.exports = {
  v4: () => randomUUID(),
  v7: () => randomUUID(),
};
