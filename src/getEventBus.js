const EventBus = require('./helpers/EventBus')

let eventBus
module.exports = async () => {
  if (!eventBus) {
    eventBus = new EventBus()
  }

  return eventBus
}
