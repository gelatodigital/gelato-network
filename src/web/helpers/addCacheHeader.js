function addCacheHeader ({ res, time }) {
  res.set('Cache-Control', 'public, max-age=' + time)
}

module.exports = addCacheHeader
