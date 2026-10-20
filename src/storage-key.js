// Dev and public live on the same hostname, so localStorage must be namespaced
// by path. Existing live/root save keys stay byte-for-byte compatible.
export function storageKey(key, pathname='/') {
  const dev = /^\/oakrest-dev(?:\/|$)/.test(pathname);
  return dev ? key.replace(/^oakrest-/, 'oakrest-dev-') : key;
}
