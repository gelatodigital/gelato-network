const debug = require('debug')('DEBUG-dx-services:util:version')
debug.log = console.debug.bind(console)

function getVersion () {
  let packageJson = require('../../package.json')
  debug('[getVersion] Version %s', packageJson.version)
  return packageJson.version
}

module.exports = getVersion
