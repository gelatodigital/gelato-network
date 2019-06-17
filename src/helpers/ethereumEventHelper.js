const debug = require('debug')('DEBUG-dx-service:helpers:ethereumEventHelper')
const assert = require('assert')
const getEthereumClient = require('./ethereumClient')
let ethereumClient

/**
 * Return a promise with the events that match the criteria
 */
async function filter ({
  contract,
  filters = null,
  fromBlock = 0,
  toBlock: toBlockAux = -5,
  events = null
}) {
  // require events
  assert(events, '"events" is a required param')

  if (!ethereumClient) {
    ethereumClient = await getEthereumClient()
  }

  let toBlock
  if (Number.isInteger(toBlockAux) && toBlockAux < 0) {
    // A negative number, means the number of confirmation blocks
    toBlock = await ethereumClient.getBlockNumber() + toBlockAux
  } else {
    toBlock = toBlockAux
  }

  debug('Filtering contract\'s %s events: %s',
    contract.address,
    events ? events.join(', ') : 'all'
  )
  const eventsListsPromises = events.map(event => {
    debug('Get events %s from block %s to %s with filter: %o',
      event, fromBlock, toBlock, filters)
    return _getEvents(contract, event, filters, fromBlock, toBlock)
  })

  return Promise
    .all(eventsListsPromises)
    .then(eventsLists => {
      return eventsLists.reduce((acc, events) => {
        return acc.concat(events)
      }, [])
    })
}

async function _getEvents (contract, event, filters, fromBlock, toBlock) {
  return new Promise((resolve, reject) => {
    const eventObject = contract[event](filters, {
      fromBlock,
      toBlock
    })
    eventObject.get((error, events) => {
      if (error) {
        reject(error)
      } else {
        // Notify event
        debug('%d events match the filter', events.length)
        resolve(events)
      }
    })
  })
}

/**
 *  Listen for events
 */
function watch ({
  contract,
  callback,
  filters = null,
  fromBlock = 0,
  toBlock = 'latest',
  events = null
}) {
  debug('Watching contract\'s %s events: %s',
    contract.address,
    events ? events.join(', ') : 'all'
  )
  const aditionalFilters = { fromBlock, toBlock }

  let stopWatching
  if (events === null) {
    // Subscribe to all events
    assert(filters === null, 'When filtering all the events, the parameter "filter" is allowed')
    const eventObject = contract.allEvents(aditionalFilters)
    _watchAndNotify(eventObject, callback)

    // Allow to stop watching
    stopWatching = async () => {
      debug('Stop listening all events')
      return new Promise((resolve, reject) => {
        eventObject.stopWatching((error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        })
      })
    }
  } else {
    // Watch for a list of events
    const stopWatchingFunctions = []
    events.forEach(event => {
      debug('Subscribe to event %s', event)
      const eventObject = contract[event](filters, aditionalFilters)
      stopWatchingFunctions.push(eventObject.stopWatching)
      _watchAndNotify(eventObject, callback)
    })

    // Allow to stop watching
    stopWatching = async () => {
      // Stop listening all events
      debug('Stop listening all events')

      return Promise.all(
        stopWatchingFunctions.map(stopWatchingAux => new Promise((resolve, reject) => {
          stopWatchingAux((error, result) => {
            if (error) {
              reject(error)
            } else {
              resolve(result)
            }
          })
        }))
      )
    }
  }

  return {
    stopWatching
  }
}

function _watchAndNotify (eventObject, callback, isWatch) {
  eventObject.watch((error, event) => {
    if (error) {
      callback(error)
    } else {
      // Notify event
      debug('[%d] New log "%s" - %o', event.logIndex, event.event, event.args)
      callback(null, event)
    }
  })
}

/*
function watch ({ name, contract, callback, fromBlock = 0, events = null }) {
}
*/

/*
exampleEvent.watch(function(err, result) {
  if (err) {
    console.log(err)
    return;
  }
  console.log(result.args._value)
  // check that result.args._from is web3.eth.coinbase then
  // display result.args._value in the UI and call
  // exampleEvent.stopWatching()
})
*/

module.exports = {
  filter,
  watch
}
