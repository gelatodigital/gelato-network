const assert = require('assert')
const RETRY_WAIT_TIME = 1000

async function doWithRetry ({
  name = 'doWithRetry',
  fn,
  attempt = 1,
  totalAttempts = 5
}) {
  assert(fn, '"fn" is a required field')
  return fn().catch(error => {
    console.error(`[${name}] Error: ${error.message}`)

    if (attempt > totalAttempts) {
      console.error(`Not more attempts availible`)
      throw error
    }

    // Retry in some time
    const waitTime = attempt * attempt * attempt * RETRY_WAIT_TIME
    console.error(`Attempt ${attempt} of ${totalAttempts}. Retry in ${waitTime / 1000} seconds`)

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        doWithRetry(name, fn, attempt + 1, totalAttempts)
          .then(resolve)
          .catch(reject)
      }, waitTime)
    })
  })
}

module.exports = doWithRetry
