// Distinct name per app — on localhost, cookies aren't port-scoped, so all 4
// apps sharing one name would stomp on each other's sessions during dev. In
// production each app is a different host, so this wouldn't collide even
// with a shared name, but a distinct name per app is simplest either way.
export const TOKEN_COOKIE = "meld_ops_token";
