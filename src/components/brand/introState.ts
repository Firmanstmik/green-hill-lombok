/**
 * Shared between the cold-load intro and the route loader: the first page is
 * "ready" when its lazily loaded code has arrived and the route loader leaves.
 */
let resolveReady: () => void = () => undefined;

export const introState = {
  /** True while the branded intro covers the page (the route loader then stays blank). */
  active: false,
  pageReady: new Promise<void>((resolve) => {
    resolveReady = resolve;
  }),
  markPageReady() {
    resolveReady();
  },
};
