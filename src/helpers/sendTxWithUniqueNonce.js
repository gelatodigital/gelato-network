// List of pending transactions
const Logger = require('./Logger')
const logger = new Logger('dx-service:helpers:sendTxWithUniqueNonce')
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

const pendingTransaction = []

// This time, is just to allow the transaction
// to distribute to other nodes. Its triggered after we know it's at list in one
// node (i.e. important in case of using a pool of nodes)
const TIME_TO_RELEASE_LOCK = isLocal ? 0 : (1500 || process.env.SEND_TX_RELEASE_LOCK_MS)

// Check nonce config
const NONCE_INCREMENT_CHECK_TIME = 3000 || process.env.NONCE_INCREMENT_CHECK_TIME
// Log only every 10 checks: 10 * 3000 = 30s
const LOG_EVERY_N_CHECKS = 10 || process.env.LOG_EVERY_N_CHECKS
// wait max 20 * 3000 = 1 min
const NONCE_INCREMENT_MAX_NUM_CHECKS = 60 || process.env.NONCE_INCREMENT_MAX_NUM_CHECKS

let accountsLocks = {}

function sendTxWithUniqueNonce (transactionParams) {
  const { from } = transactionParams
  if (accountsLocks[from]) {
    logger.debug("The account %s is locked. I'll wait for later", from)
    pendingTransaction.push(transactionParams)
  } else {
    logger.debug("I'll do it now")
    _sendTransaction(transactionParams)
      .catch(_discardError)
  }
}

async function _sendTransaction ({
  getNonceFn,
  from,
  sendTransaction
}) {
  accountsLocks[from] = true
  const releaseLock = () => {
    logger.info('Releasing lock for %s...', from)
    setTimeout(() => {
      // Check if we have pending transactions
      if (pendingTransaction.length > 0) {
        // Handle the pending transaction: FIFO
        const transactionParams = pendingTransaction.shift()
        _sendTransaction(transactionParams)
          .catch(_discardError)
      } else {
        // No pending transaction, we release the lock
        logger.info('Lock released for %s', from)
        accountsLocks[from] = false
      }
    }, TIME_TO_RELEASE_LOCK)
  }

  // Get the current nonce
  const nonce = await getNonceFn(from)
  logger.info(`Nonce for %s: %s`, from, nonce)

  // Trigger the transaction
  const txPromise = sendTransaction(nonce)

  // Wait until the transaction is in the mempool of at list a node
  // so we can release the lock
  _waitForNonceToIncrement(nonce, from, getNonceFn, releaseLock, txPromise)

  return txPromise
}

function _waitForNonceToIncrement (nonce, from, getNonceFn, releaseLock, txPromise) {
  let intervalId

  // In case of an error, release lock
  txPromise.catch((/* error */) => {
    if (intervalId) {
      clearInterval(intervalId)
    }
    releaseLock()
    // No need to relaunch the error, is handlerd in the callback
    // throw error
  })

  try {
    if (isLocal) {
      setTimeout(releaseLock, 0)
    } else {
      let count = 0
      intervalId = setInterval(() => {
        count++
        getNonceFn(from).then(newNonce => {
          if (count % LOG_EVERY_N_CHECKS === LOG_EVERY_N_CHECKS - 1) {
            // Log only every 10 checks (i.e. If check time is 3s, we log every 30s)
            logger.info(`Checking nonce update for ${from}. Tx nonce: ${nonce}, current nonce: ${newNonce}. Transactions in queue: ${pendingTransaction.length}`)
          }
          const maxCheckReached = count > NONCE_INCREMENT_MAX_NUM_CHECKS
          if (
            // We surplus the max num of check
            maxCheckReached ||
            // check if the transaction has been incremented
            newNonce === nonce + 1
          ) {
            if (maxCheckReached) {
              const waitTimeInSeconds = NONCE_INCREMENT_CHECK_TIME * NONCE_INCREMENT_MAX_NUM_CHECKS / 1000
              logger.error('Releasing the lock before the NONCE was incremented. There must be a problem with the node. Waited %ds', waitTimeInSeconds)
            }
            releaseLock()
            // The transaction is in the mempool
            clearInterval(intervalId)
          }
        })
      }, NONCE_INCREMENT_CHECK_TIME)
    }
  } catch (error) {
    logger.error('Error waiting for nonce increment: %s', error)
    console.error(error)
  }
}

function _discardError () {
  // No need to handle, the transaction error, because its already handled in
  // the callback from the TX
}

module.exports = sendTxWithUniqueNonce
