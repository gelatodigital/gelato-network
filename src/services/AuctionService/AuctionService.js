const loggerNamespace = 'dx-service:services:AuctionsService'
const Logger = require('../../helpers/Logger')
const assert = require('assert')

const logger = new Logger(loggerNamespace)
const formatUtil = require('../../helpers/formatUtil')
const dxFilters = require('../../helpers/dxFilters')
const getTokenOrder = require('../../helpers/getTokenOrder')
// const AUCTION_START_DATE_MARGIN_HOURS = '18' // 24h (max) - 6 (estimation)
const numberUtil = require('../../helpers/numberUtil')

// const AuctionLogger = require('../../helpers/AuctionLogger')
// const auctionLogger = new AuctionLogger(loggerNamespace)
// const ENVIRONMENT = process.env.NODE_ENV

class AuctionService {
  constructor ({
    auctionRepo,
    ethereumRepo,
    markets
  }) {
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    // assert(markets, '"markets" is required')
    assert(markets, '"markets" is required')

    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._markets = markets
  }

  async getAuctionsReportInfo ({
    fromDate, toDate, sellToken, buyToken, account, count }) {
    _assertDatesOverlap(fromDate, toDate)

    return new Promise((resolve, reject) => {
      const auctions = []
      this._generateAuctionInfoByDates({
        fromDate,
        toDate,
        sellToken,
        buyToken,
        account,
        addAuctionInfo (auctionInfo) {
          // // FIXME we filter this info to show it in the publicApi
          // if (filterBotInfo) {
          //   const filteredAuctionInfo = Object.assign(
          //     {},
          //     auctionInfo,
          //     {
          //       botSellVolume: undefined,
          //       botBuyVolume: undefined,
          //       ensuredSellVolumePercentage: undefined,
          //       ensuredBuyVolumePercentage: undefined
          //     }
          //   )
          //   // logger.debug('Add auction info: ', auctionInfo)
          //   auctions.push(filteredAuctionInfo)
          // } else {
          //   auctions.push(auctionInfo)
          // }
          auctions.push(auctionInfo)
        },
        end (error) {
          logger.debug('Finish getting the info: ', error ? 'Error' : 'Success')
          if (error) {
            reject(error)
          } else {
            resolve({
              data: auctions,
              pagination: {
                endingBefore: null,
                startingAfter: null,
                limit: 0,
                order: [{
                  param: 'auctionStart',
                  direction: 'ASC'
                }],
                previousUri: null,
                nextUri: null
              }
            })
          }
        }
      })
    })
  }

  _generateAuctionInfoByDates ({ fromDate, toDate, sellToken, buyToken, account, addAuctionInfo, end }) {
    this
      // Get events info
      ._getAuctionsEventInfo({ fromDate, toDate, sellToken, buyToken, account, addAuctionInfo })
      .then(() => {
        logger.debug('All info was generated')
        end()
      })
      .catch(end)
  }

  async _getAuctionsEventInfo ({ fromDate, toDate, sellToken, buyToken, account, addAuctionInfo }) {
    const [ fromBlock, toBlock ] = await Promise.all([
      this._ethereumRepo.getFirstBlockAfterDate(fromDate),
      this._ethereumRepo.getLastBlockBeforeDate(toDate)
    ])
    // assert(botAddress, 'The bot address was not configured. Define the MNEMONIC environment var')

    // Get auctions info
    let auctions = await this._auctionRepo
      .getAuctions({
        fromBlock, toBlock
      })

    let markets
    const getMarketsFromFilteredAuctions = (tokenPairs, { sellToken, buyToken }) => {
      const [tokenA, tokenB] = getTokenOrder(sellToken, buyToken)
      const _equalsTokenPair = tokenPair => {
        return tokenPair.tokenA === tokenA && tokenPair.tokenB === tokenB
      }
      if (!tokenPairs.find(_equalsTokenPair)) {
        tokenPairs.push({ tokenA, tokenB })
      }
      return tokenPairs
    }

    if (!sellToken || !buyToken) {
      // Remove the unknown markets
      // auctions = auctions.filter(({ sellTokenSymbol, buyTokenSymbol }) => {
      //   return this._isKnownMarket(sellTokenSymbol, buyTokenSymbol)
      // })
      markets = auctions.reduce(getMarketsFromFilteredAuctions, [])
    } else {
      // Remove unnecesary auctions
      auctions = auctions.filter(({ sellToken: auctionSellToken, sellTokenSymbol, buyToken: auctionBuyToken, buyTokenSymbol }) => {
        // // passed sellToken matchs auction sellToken address or symbol
        return ((sellToken === auctionSellToken || sellToken === sellTokenSymbol) &&
          // passed buyToken matchs auction buyToken address or symbol
          (buyToken === auctionBuyToken || buyToken === buyTokenSymbol)) ||
          // passed buyToken matchs auction sellToken address or symbol
          ((buyToken === auctionSellToken || buyToken === sellTokenSymbol) &&
          // passed sellToken matchs auction buyToken address or symbol
          (sellToken === auctionBuyToken || sellToken === buyTokenSymbol))
      })
      markets = auctions.reduce(getMarketsFromFilteredAuctions, [])
    }

    // Get the start of the first of the auctions
    const startOfFirstAuction = auctions
      .map(auctionsInfo => auctionsInfo.auctionStart)
      .reduce((earlierAuctionStart, auctionStart) => {
        if (earlierAuctionStart === null || earlierAuctionStart > auctionStart) {
          return auctionStart
        } else {
          return earlierAuctionStart
        }
      }, null)

    // Get the block associated with the start
    let fromBlockStartAuctions
    if (startOfFirstAuction) {
      fromBlockStartAuctions = await this._ethereumRepo
        .getFirstBlockAfterDate(startOfFirstAuction)
    }

    // We start in the earliest block (this is relevant for strange cases,
    // especially for development with ganache-cli, where the ClearAuction event
    // might be mined before the auction start date, otherwise the
    // fromBlockStartAuctions is the earliest block)
    fromBlockStartAuctions = Math.min(
      fromBlock,
      fromBlockStartAuctions || fromBlock
    )

    // Get bot orders
    let botSellOrders, botBuyOrders
    if (account) {
      const [ botSellOrdersAux, botBuyOrdersAux ] = await Promise.all([
        // Get the bot's sell orders
        this._auctionRepo.getSellOrders({
          fromBlock: fromBlockStartAuctions,
          toBlock,
          user: account
        }),

        // Get the bot's buy orders
        this._auctionRepo.getBuyOrders({
          fromBlock: fromBlockStartAuctions,
          toBlock,
          user: account
        })
      ])

      botSellOrders = botSellOrdersAux
      botBuyOrders = botBuyOrdersAux
    }

    // Get info for every token pair
    if (auctions.length > 0) {
      const generateInfoPromises = markets
        .map(({ tokenA, tokenB }) => {
          let tokenPairFilter = dxFilters.createTokenPairFilter({
            sellToken: tokenA,
            buyToken: tokenB,
            sellTokenParam: 'sellToken',
            buyTokenParam: 'buyToken'
          })

          let tokenPairFilterOpp = dxFilters.createTokenPairFilter({
            sellToken: tokenB,
            buyToken: tokenA,
            sellTokenParam: 'sellToken',
            buyTokenParam: 'buyToken'
          })

          const params = {
            fromDate,
            toDate,
            allBotBuyOrders: botBuyOrders,
            allBotSellOrders: botSellOrders,
            addAuctionInfo
          }

          // Generate report for both markets
          return Promise.all([
            // Report for tokenA-tokenB
            this._generateAuctionInfoByMarket(Object.assign(params, {
              sellToken: tokenA,
              buyToken: tokenB,
              auctions: auctions.filter(tokenPairFilter)
            })),

            // Report for tokenB-tokenA
            this._generateAuctionInfoByMarket(Object.assign(params, {
              sellToken: tokenB,
              buyToken: tokenA,
              auctions: auctions.filter(tokenPairFilterOpp)
            }))
          ])
        })

      return Promise.all(generateInfoPromises)
    } else {
      logger.debug("There aren't any auctions between %s and %s",
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )
    }
  }

  async _generateAuctionInfoByMarket ({
    fromDate,
    toDate,
    sellToken,
    buyToken,
    auctions,
    allBotBuyOrders,
    allBotSellOrders,
    addAuctionInfo
  }) {
    if (auctions.length > 0) {
      logger.debug('Get auctions for %s-%s between %s and %s',
        sellToken,
        buyToken,
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )
      const generateInfoPromises = auctions.map(auction => {
        const {
          sellToken: sellTokenAddress,
          buyToken: buyTokenAddress,
          auctionIndex
        } = auction

        logger.debug('Get information for auction %s of %s-%s',
          auctionIndex,
          sellToken,
          buyToken
        )

        const filterOrder = dxFilters.createAuctionFilter({
          sellToken: sellTokenAddress,
          buyToken: buyTokenAddress,
          auctionIndex
        })

        // Add the auction buy orders and sell orders
        let auctionInfoWithOrders = Object.assign(auction, {
          addAuctionInfo
        })
        if (allBotBuyOrders && allBotSellOrders) {
          auctionInfoWithOrders.botBuyOrders = allBotBuyOrders.filter(filterOrder)
          auctionInfoWithOrders.botSellOrders = allBotSellOrders.filter(filterOrder)
        }

        return this._generateAuctionInfo(auctionInfoWithOrders)
      })
      return Promise.all(generateInfoPromises)
    } else {
      logger.debug('There are no auctions for %s-%s between %s and %s',
        sellToken,
        buyToken,
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )
    }
  }

  async _generateAuctionInfo ({
    sellToken,
    buyToken,
    sellTokenSymbol,
    buyTokenSymbol,
    auctionIndex,
    auctionStart, // not reliable yet
    auctionEnd,
    botSellOrders,
    botBuyOrders,
    buyVolume,
    sellVolume,
    closingPrice,
    previousClosingPrice,
    addAuctionInfo
  }) {
    // logger.debug('Get info: %o', arguments[0])
    // TODO: Add auctionEnd, auctionStart, runningTime
    let closingPriceAux
    if (closingPrice) {
      closingPriceAux = closingPrice
        .numerator
        .div(closingPrice.denominator)
    } else {
      closingPriceAux = null
    }

    let priceIncrement
    if (closingPriceAux && previousClosingPrice) {
      const previousClosingPriceAux = previousClosingPrice
        .numerator
        .div(previousClosingPrice.denominator)

      priceIncrement = numberUtil.getIncrement({
        newValue: closingPriceAux,
        oldValue: previousClosingPriceAux
      })
    } else {
      priceIncrement = null
    }

    function sumOrdersVolumes (botSellOrders) {
      return botSellOrders
        .map(order => order.amount)
        .reduce((sum, amount) => {
          return sum.plus(amount)
        }, numberUtil.toBigNumber(0))
    }

    let botSellVolume, botBuyVolume, ensuredSellVolumePercentage, ensuredBuyVolumePercentage
    if (botSellOrders && botBuyOrders) {
      botSellVolume = sumOrdersVolumes(botSellOrders)
      botBuyVolume = sumOrdersVolumes(botBuyOrders)
      ensuredSellVolumePercentage = numberUtil.getPercentage({
        part: botSellVolume,
        total: sellVolume
      })
      ensuredBuyVolumePercentage = numberUtil.getPercentage({
        part: botBuyVolume,
        total: buyVolume
      })

      botSellVolume = botSellVolume ? botSellVolume.div(1e18).toNumber() : 0
      botBuyVolume = botBuyVolume ? botBuyVolume.div(1e18).toNumber() : 0
      ensuredSellVolumePercentage = ensuredSellVolumePercentage ? ensuredSellVolumePercentage.toNumber() : 0
      ensuredBuyVolumePercentage = ensuredBuyVolumePercentage ? ensuredBuyVolumePercentage.toNumber() : 0
    }

    addAuctionInfo({
      // Auction info
      auctionIndex: auctionIndex.toNumber(),
      sellToken: sellTokenSymbol,
      buyToken: buyTokenSymbol,
      sellTokenAddress: sellToken,
      buyTokenAddress: buyToken,
      auctionStart, // Not reliable yet
      auctionEnd,

      // Volumes
      sellVolume: sellVolume ? sellVolume.div(1e18).toNumber() : 0,
      buyVolume: buyVolume ? buyVolume.div(1e18).toNumber() : 0,

      // Price
      closingPrice: closingPriceAux ? closingPriceAux.toNumber() : 0,
      priceIncrement: priceIncrement ? priceIncrement.toNumber() : null,

      // Bot sell/buy
      botSellVolume,
      botBuyVolume,
      ensuredSellVolumePercentage,
      ensuredBuyVolumePercentage
    })
  }

  _isKnownMarket (tokenA, tokenB) {
    if (tokenA && tokenB) {
      const [ sellToken, buyToken ] = getTokenOrder(tokenA, tokenB)

      return this._markets.some(market => {
        return market.tokenA === sellToken &&
          market.tokenB === buyToken
      })
    } else {
      return false
    }
  }
}

function _assertDatesOverlap (fromDate, toDate) {
  assert(fromDate < toDate, "The 'toDate' must be greater than the 'fromDate'")
}

module.exports = AuctionService
