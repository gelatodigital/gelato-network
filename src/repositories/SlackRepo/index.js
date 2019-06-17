const SlackRepo = require('./SlackRepo')

let instance, instancePromise

async function _getInstance () {
  return new SlackRepo()
}

module.exports = async () => {
  if (!instance) {
    if (!instancePromise) {
      instancePromise = _getInstance()
    }

    instance = await instancePromise
  }

  return instance
}
