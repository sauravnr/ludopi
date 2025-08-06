export function setCache(key, data, ttl) {
  try {
    const value = { time: Date.now(), ttl, data };
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function getCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { time, ttl, data } = JSON.parse(raw);
    if (Date.now() - time > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
