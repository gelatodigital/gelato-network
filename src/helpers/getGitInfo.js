var git = require('git-rev-sync')

module.exports = function () {
  try {
    return {
      short: git.short(),
      long: git.long(),
      branch: git.branch(),
      tag: git.tag()
    }
  } catch (error) {
    const msg = 'Not a git repo'
    return {
      short: msg,
      long: msg,
      branch: msg,
      tag: msg
    }
  }
}
