class Cache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.store = new Map();
    this.ttl = ttlMs;
  }

  set(key, value) {
    this.store.set(key, {
      value,
      expires: Date.now() + this.ttl,
    });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.store.clear();
  }
}

const streamCache = new Cache(10 * 60 * 1000);
const catalogCache = new Cache(30 * 60 * 1000);

module.exports = { Cache, streamCache, catalogCache };
