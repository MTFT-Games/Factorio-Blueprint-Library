export function getLocal() {
  let local = JSON.parse(localStorage.getItem('nre5152-p1-settings'));
  if (!local) {
    local = { user: "", login: null, favorites: [] };
    localStorage.setItem('nre5152-p1-settings', JSON.stringify(local));
  }
  return local;
}