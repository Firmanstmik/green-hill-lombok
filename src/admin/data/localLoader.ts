/**
 * The development-only local store must never ship in a production build.
 * `import.meta.env.DEV` is a compile-time constant, so in production this is
 * `null` and the bundler drops the dynamic import entirely.
 */
export const loadLocalStore = import.meta.env.DEV ? () => import('./localStore') : null;
