const loggerNamespace = 'dx-service:repositories:priceRepo:strategies:sequence'
const AuctionLogger = require('../../../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const priceRepos = {}

function _capitalizeFirstLetter (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function _getPriceRepo (feedName) {
  let priceRepo = priceRepos[feedName]
  if (!priceRepo) {
    const PriceRepo = require('../feeds/PriceRepo' + _capitalizeFirstLetter(feedName))
    priceRepo = new PriceRepo({})
    priceRepos[feedName] = priceRepo
  }
  return priceRepo
}

async function _doGetPrice ({ tokenA, tokenB }, feeds) {
  const [ bestFeed, ...remainingFeeds ] = feeds

  return _getPriceRepo(bestFeed)
    .getPrice({ tokenA, tokenB })
    .catch(error => {
      // Display a ERROR or WARN depending on if we have more feeds
      let feedsLeftMsg, debugLevel
      if (remainingFeeds.length > 0) {
        feedsLeftMsg = 'Remaining feeds: ' + remainingFeeds.join(', ')
        debugLevel = 'warn'
      } else {
        feedsLeftMsg = 'No feeds left'
        debugLevel = 'error'
      }
      const params = [ bestFeed, error.message, feedsLeftMsg ]
      const msg = 'Unable to get the price from "%s": %s. %s'

      // Print the log
      auctionLogger[debugLevel]({
        sellToken: tokenA,
        buyToken: tokenB,
        msg,
        params
      })

      if (remainingFeeds.length > 0) {
        // Retry with next feeds
        return _doGetPrice({ tokenA, tokenB }, remainingFeeds)
      } else {
        // No more feeds avaliable
        throw new Error('Not more feeds avaliable. All of the price feeds have failed')
      }
    })
}

function getPrice ({ tokenA, tokenB }, { feeds }) {
  return _doGetPrice({ tokenA, tokenB }, feeds)
}

module.exports = {
  getPrice
}
