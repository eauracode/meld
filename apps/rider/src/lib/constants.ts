// Distinct name per app — see apps/ops/src/lib/constants.ts for why (cookies
// aren't port-scoped on localhost, so all 4 apps sharing one name would
// stomp on each other's sessions during dev).
export const TOKEN_COOKIE = "meld_rider_token";
