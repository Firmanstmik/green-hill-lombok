/** Section 05 — Trust / Why Lombok content keys (copy lives in i18n). */

export const PLACE_KEYS = ['south', 'access', 'lifestyle', 'perspective'] as const;

export const BUYING_KEYS = ['ownership', 'dueDiligence', 'zoning', 'process'] as const;

export type PlaceKey = (typeof PLACE_KEYS)[number];
export type BuyingKey = (typeof BUYING_KEYS)[number];
