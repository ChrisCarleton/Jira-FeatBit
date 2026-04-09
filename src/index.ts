// Forge lint entry point shim — re-exports the real handler so that
// forge lint can resolve `index.handler` and perform scope validation.
// Webpack builds from src/api/src/index.ts directly; this file is not bundled.
export { handler } from './api/src/index';
