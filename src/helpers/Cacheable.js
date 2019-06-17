const Cache = require('../helpers/Cache')
const assert = require('assert')

class Cacheable {
  constructor ({
    cacheName,
    cacheConf
  }) {
    if (cacheConf) {
      const { long, average, short } = cacheConf
      assert(long, 'The long timeout value is required')
      assert(average, 'The average timeout value is required')
      assert(short, 'The short timeout value is required')

      this._cache = new Cache(cacheName)
      this._cacheTimeShort = short
      this._cacheTimeAverage = average
      this._cacheTimeLong = long
    }
  }
}

module.exports = Cacheable
