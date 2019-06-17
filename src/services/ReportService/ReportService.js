const loggerNamespace = 'dx-service:services:ReportService'
const Logger = require('../../helpers/Logger')
const assert = require('assert')

// const getAddress = require('../../helpers/getAddress')
// this._botAddressPromise = getAddress(0)

const logger = new Logger(loggerNamespace)
const formatUtil = require('../../helpers/formatUtil')
const dxFilters = require('../../helpers/dxFilters')
const AuctionsReportRS = require('../helpers/AuctionsReportRS')
const getTokenOrder = require('../../helpers/getTokenOrder')
// const AUCTION_START_DATE_MARGIN_HOURS = '18' // 24h (max) - 6 (estimation)
const numberUtil = require('../../helpers/numberUtil')

let requestId = 1

// const AuctionLogger = require('../../helpers/AuctionLogger')
// const auctionLogger = new AuctionLogger(loggerNamespace)
// const ENVIRONMENT = process.env.NODE_ENV

class ReportService {
  constructor ({
    auctionRepo,
    ethereumRepo,
    slackRepo,
    // conf
    markets,
    auctionsReportSlackChannel
  }) {
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')
    assert(slackRepo, '"slackRepo" is required')
    assert(markets, '"markets" is required')

    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
    this._slackRepo = slackRepo

    this._markets = markets
    this._auctionsReportSlackChannel = auctionsReportSlackChannel
  }

  async getAuctionsReportInfo ({ fromDate, toDate, account }) {
    _assertDatesOverlap(fromDate, toDate)

    return new Promise((resolve, reject) => {
      const auctions = []
      this._generateAuctionInfoByDates({
        fromDate,
        toDate,
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
            resolve(auctions)
          }
        }
      })
    })
  }

  async getAuctionsReportFile ({ fromDate, toDate, account }) {
    _assertDatesOverlap(fromDate, toDate)

    logger.debug('Generate auction report from "%s" to "%s"',
      formatUtil.formatDateTime(fromDate),
      formatUtil.formatDateTime(toDate)
    )

    const isBot = account !== undefined
    const auctionsReportRS = new AuctionsReportRS({ delimiter: '\t', isBot })
    this._generateAuctionInfoByDates({
      fromDate,
      toDate,
      account,
      addAuctionInfo (auctionInfo) {
        // logger.debug('Add auction into report: ', auctionInfo)
        auctionsReportRS.addAuction(auctionInfo)
      },
      end (error) {
        logger.debug('Finished report: ', error ? 'Error' : 'Success')
        if (error) {
          auctionsReportRS.end(error)
        } else {
          auctionsReportRS.end()
        }
      }
    })

    return {
      name: 'auctions-reports.csv',
      mimeType: 'text/csv',
      content: auctionsReportRS
    }
  }

  sendAuctionsReportToSlack ({ fromDate, toDate, account, senderInfo }) {
    _assertDatesOverlap(fromDate, toDate)
    const id = requestId++

    // Generate report file and send it to slack (fire and forget)
    logger.debug('[requestId=%d] Generating report between "%s" and "%s" requested by "%s"...',
      id, formatUtil.formatDateTime(fromDate), formatUtil.formatDateTime(toDate),
      senderInfo
    )
    this._doSendAuctionsReportToSlack({ id, senderInfo, account, fromDate, toDate })
      .then(() => {
        logger.debug('The auctions report was sent to slack')
      })
      .catch(error => {
        logger.error({
          msg: '[requestId=%d] Error generating and sending the auctions report to slack: %s',
          params: [ id, error.toString() ],
          error
        })
      })

    // Return the request id and message
    logger.debug('[requestId=%d] Returning a receipt', id)
    return {
      message: 'The report request has been submited',
      id
    }
  }

  _generateAuctionInfoByDates ({ fromDate, toDate, account, addAuctionInfo, end }) {
    this
      // Get events info
      ._getAuctionsEventInfo({ fromDate, toDate, account, addAuctionInfo })
      .then(() => {
        logger.debug('All info was generated')
        end()
      })
      .catch(end)
  }

  async _getAuctionsEventInfo ({ fromDate, toDate, account, addAuctionInfo }) {
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

    // Remove the unknown markets
    auctions = auctions.filter(({ sellTokenSymbol, buyTokenSymbol }) => {
      return this._isKnownMarket(sellTokenSymbol, buyTokenSymbol)
    })

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
      const generateInfoPromises = this
        ._markets
        .map(({ tokenA, tokenB }) => {
          let tokenPairFilter = dxFilters.createTokenPairFilter({
            sellToken: tokenA,
            buyToken: tokenB,
            sellTokenParam: 'sellTokenSymbol',
            buyTokenParam: 'buyTokenSymbol'
          })

          let tokenPairFilterOpp = dxFilters.createTokenPairFilter({
            sellToken: tokenB,
            buyToken: tokenA,
            sellTokenParam: 'sellTokenSymbol',
            buyTokenParam: 'buyTokenSymbol'
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

  async _doSendAuctionsReportToSlack ({ id, senderInfo, account, fromDate, toDate }) {
    // Generate report file
    const file = await this.getAuctionsReportFile({
      fromDate,
      toDate,
      account
    })
    logger.debug('[requestId=%d] Report file "%s" was generated. Sending it to slack...',
      id, file.name)

    const message = {
      channel: this._auctionsReportSlackChannel,
      text: "Check out what the bot's been doing lately",
      attachments: [
        {
          title: 'New report avaliable',
          color: 'good',
          text: "There's a new report for the last auctions of DutchX",
          fields: [
            {
              title: 'From:',
              value: formatUtil.formatDate(fromDate),
              short: false
            }, {
              title: 'To:',
              value: formatUtil.formatDate(toDate),
              short: false
            }
          ],
          footer: senderInfo
        }
      ]
    }

    // Send file to Slack
    return this._sendFileToSlack({
      channel: this._auctionsReportSlackChannel,
      message,
      id,
      file
    })
  }

  async _sendFileToSlack ({ channel, message, id, file }) {
    const { name: fileName, content: fileContent } = file

    // Upload file to slack
    logger.debug('[requestId=%d] Uploading file "%s" to Slack', id, fileName)
    const { file: fileSlack } = await this._slackRepo.uploadFile({
      fileName,
      file: fileContent,
      channels: channel
    })

    const url = fileSlack.url_private
    logger.debug('[requestId=%d] File uploaded. fileId=%s, url=%s',
      id, fileSlack.id, url)

    message.attachments[0].fields.push({
      title: 'File',
      value: url,
      short: false
    })

    // Send message with the file attached
    return this._slackRepo
      .postMessage(message)
      .then(({ ts }) => {
        logger.debug('File sent to Slack: ', ts)
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

module.exports = ReportService
