const NodeCache = require('node-cache')
const gracefullShutdown = require('./gracefullShutdown')

const DEFAULT_TIMEOUT = 15 // 15s
const DEFAULT_CHECK_PERIOD = 600 // 600s

const caches = []

class Cache {
  constructor (name) {
    this._name = name
    this._cache = new NodeCache({
      stdTTL: DEFAULT_TIMEOUT,
      checkperiod: DEFAULT_CHECK_PERIOD
    })
    caches.push(this._cache)
  }

  async get ({ key, time, fetchFn }) {
    let value = this._cache.get(key)
    if (value === undefined) {
      value = await fetchFn()
      let cachingTime
      if (typeof time === 'function') {
        cachingTime = time(value)
      } else {
        cachingTime = time
      }
      this._cache.set(key, value, cachingTime)
    }

    return value
  }
}

function _clearAll () {
  caches.forEach(cacheInstance => {
    cacheInstance.close()
  })
}

Cache.prototype.clearAll = _clearAll

// Clear all caches
gracefullShutdown.onShutdown(() => {
  _clearAll()
})

module.exports = Cache
