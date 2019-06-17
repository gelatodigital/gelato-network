// const Promise = require('../helpers/Promise')
const debug = require('debug')('DEBUG-dx-service:helpers:EventBus')
debug.log = console.debug.bind(console)

class EventBus {
  constructor () {
    this._listenersByEvent = {}
  }

  listenTo (eventName, callback) {
    debug('New listener for event %s', eventName)
    let listeners = this._listenersByEvent[eventName]

    if (!listeners) {
      // If it's the first listener
      listeners = []
      this._listenersByEvent[eventName] = listeners
    }

    listeners.push(callback)
  }

  listenToEvents (eventNames, callback) {
    eventNames.forEach(eventName => this.listenTo(eventName, callback))
  }

  trigger (eventName, data) {
    debug('Trigger %s event. Data = %o', eventName, data)
    let listeners = this._listenersByEvent[eventName]

    let resultPromise
    if (listeners && listeners.length > 0) {
      // Notify all the listeners asyncronously
      // debug('Notifying %d listeners', listeners.length)
      resultPromise = Promise.all(
        // Join all promises in a single one
        listeners.map(async listener => listener({ eventName, data }))
      )
    } else {
      debug('No listeners to notify')
      resultPromise = Promise.resolve()
    }

    return resultPromise
  }

  clearAllListeners () {
    this._listenersByEvent = {}
    debug('All listeners has been cleared')
  }
}

module.exports = EventBus
