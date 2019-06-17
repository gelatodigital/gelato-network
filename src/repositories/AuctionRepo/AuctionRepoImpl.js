const loggerNamespace = 'dx-service:repositories:AuctionRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../../helpers/AuctionLogger')
const ethereumEventHelper = require('../../helpers/ethereumEventHelper')
const dxFilters = require('../../helpers/dxFilters')
const auctionLogger = new AuctionLogger(loggerNamespace)
const Cacheable = require('../../helpers/Cacheable')
// const sendTxWithUniqueNonce = require('../../helpers/sendTxWithUniqueNonce')

const HEXADECIMAL_REGEX = /0[xX][0-9a-fA-F]+/
const assert = require('assert')

const AUCTION_START_FOR_WAITING_FOR_FUNDING = 1
const MAXIMUM_FUNDING = 10 ** 30

const BigNumber = require('bignumber.js')
const numberUtil = require('../../helpers/numberUtil.js')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

class AuctionRepoImpl extends Cacheable {
  constructor ({
    ethereumClient,
    contracts,
    // Cache
    cacheConf,
    gasPriceDefault = 'fast', // safeLow, average, fast
    // Retry
    transactionRetryTime = 5 * 60 * 1000, // 5 minutes,
    gasRetryIncrement = 1.2,
    overFastPriceFactor = 1,
    gasEstimationCorrectionFactor = 2
  }) {
    super({
      cacheConf,
      cacheName: 'AuctionRepo'
    })
    assert(ethereumClient, '"ethereumClient" is required')
    assert(contracts, '"contracts" is required')

    this._ethereumClient = ethereumClient
    this._transactionRetryTime = transactionRetryTime
    this._gasRetryIncrement = gasRetryIncrement
    this._overFastPriceFactor = overFastPriceFactor
    this._gasEstimationCorrectionFactor = gasEstimationCorrectionFactor
    this._gasPriceDefault = gasPriceDefault
    this._BLOCKS_MINED_IN_24H = ethereumClient.toBlocksFromSecondsEst(24 * 60 * 60)

    // Contracts
    this._dx = contracts.dx
    this._dxHelper = contracts.dxHelper
    this._priceOracle = contracts.priceOracle
    this._tokens = Object.assign({
      GNO: contracts.gno,
      WETH: contracts.eth,
      MGN: contracts.mgn,
      OWL: contracts.owl
    }, contracts.erc20TokenContracts)

    logger.debug({
      msg: `DX contract in address %s`,
      params: [this._dx.address]
    })
    logger.debug({
      msg: `Price Oracle in address %s`,
      params: [this._priceOracle.address]
    })

    this.ready = Promise.resolve()
    Object.keys(this._tokens).forEach(token => {
      const contract = this._tokens[token]
      logger.debug({
        msg: `Token %s in address %s`,
        params: [token, contract.address]
      })
    })
  }

  async ethToken () {
    return this._doCall({ operation: 'ethToken', params: [] })
  }

  async getAbout () {
    const auctioneerAddress = await this._dx.auctioneer.call()
    const tokenNames = Object.keys(this._tokens)

    return {
      auctioneer: auctioneerAddress,
      dxAddress: this._dx.address,
      priceOracleAddress: this._priceOracle.address,
      tokens: tokenNames.map(name => ({
        name,
        address: this._tokens[name].address
      }))
    }
  }

  async getThresholdNewTokenPair () {
    const thresholdNewTokenPair = await this._dx.thresholdNewTokenPair.call()
    return thresholdNewTokenPair.div(1e18)
  }

  async getThresholdNewAuction () {
    const thresholdNewAuction = await this._dx.thresholdNewAuction.call()
    return thresholdNewAuction.div(1e18)
  }

  async getStateInfo ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    // auctionLogger.debug({ sellToken, buyToken, msg: 'Get state' })
    const auctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    // auctionLogger.debug({ sellToken, buyToken, msg: 'Auction index: %d', params: [ auctionIndex ] })

    let auctionStart, auction, auctionOpp
    if (auctionIndex === 0) {
      // The token pair doesn't exist
      auctionStart = null
      auction = null
      auctionOpp = null
    } else {
      auctionStart = await this.getAuctionStart({ sellToken, buyToken })

      // Check the state on each side of the auction
      let [auctionState, auctionOppState] = await Promise.all([
        this.getAuctionState({ sellToken, buyToken, auctionIndex }),
        this.getAuctionState({ sellToken: buyToken, buyToken: sellToken, auctionIndex })
      ])
      auction = auctionState
      auctionOpp = auctionOppState
    }

    return {
      auctionIndex,
      auctionStart,

      // auction: { buyVolume, sellVolume, closingPrice, isClosed, isTheoreticalClosed }
      auction,
      // auctionOpp: { buyVolume, sellVolume, closingPrice, isClosed, isTheoreticalClosed }
      auctionOpp
    }
  }

  async getState ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    const {
      auctionIndex,
      auctionStart,
      auction,
      auctionOpp
    } = await this.getStateInfo({ sellToken, buyToken })

    if (auctionIndex === 0) {
      return 'UNKNOWN_TOKEN_PAIR'
    } else {
      const {
        isClosed,
        isTheoreticalClosed,
        sellVolume
      } = auction

      const {
        isClosed: isClosedOpp,
        isTheoreticalClosed: isTheoreticalClosedOpp,
        sellVolume: sellVolumeOpp
      } = auctionOpp

      const now = await this._getTime()
      if (auctionStart === null) {
        // We havent surplus the threshold (or it's the first auction)
        return 'WAITING_FOR_FUNDING'
      } else if (auctionStart >= now) {
        return 'WAITING_FOR_AUCTION_TO_START'
      } else if (
        (isTheoreticalClosed && !isClosed) ||
        (isTheoreticalClosedOpp && !isClosedOpp)) {
        return 'PENDING_CLOSE_THEORETICAL'
      } else if (
        // If one side is closed (by clearing, not by having no sellVolume)
        (isClosed && !sellVolume.isZero() && !isClosedOpp) ||
        (!isClosed && isClosedOpp && !sellVolumeOpp.isZero())) {
        return 'ONE_AUCTION_HAS_CLOSED'
      } else {
        return 'RUNNING'
      }
    }
  }

  /*
  // TODO: Review this logic. This are the states of the diagram
  // (not used right now)
  async getState2 ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    const {
      auctionStart,
      auction,
      auctionOpp
    } = await this.getStateInfo({ sellToken, buyToken })
    const {
      isClosed,
      isTheoreticalClosed,
      sellVolume
    } = auction

    const {
      isClosed: isClosedOpp,
      isTheoreticalClosed: isTheoreticalClosedOpp,
      sellVolume: sellVolumeOpp
    } = auctionOpp

    if (auctionStart === null) {
      // We havent surplus the threshold
      return 'WAITING_FOR_FUNDING' // S0
    } else if (sellVolume === 0 || sellVolumeOpp === 0) {
      // One of the auctions doesn't have sell volume

      if (
        (sellVolume === 0 && isTheoreticalClosedOpp) ||
        (sellVolumeOpp === 0 && isTheoreticalClosed)) {
        // One has no SellVolume
        // The other is theoretically closed
        return 'ONE_THEORETICAL_CLOSED' // S7
      } else {
        // One of the auctions is running
        // the other one has no sell volume
        return 'RUNNING_ONE_NOT_SELL_VOLUME' // S1
      }
    } else {
      // They both have volume

      if (
        isTheoreticalClosed && isTheoreticalClosedOpp &&
        !isClosed && !isClosedOpp) {
        // both are close theoretical
        // and not closed yet
        return 'BOTH_THEORETICAL_CLOSED' // S4
      } else if (isClosedOpp || isClosed) {
        // At least, one of the auctions is closed for real

        if (
          (isClosed && !isTheoreticalClosedOpp) ||
          (isClosedOpp && !isTheoreticalClosed)
        ) {
          // One auction is closed
          // The other one is still running
          return 'ONE_CLEARED_AUCTION' // S2
        } else if (
          (isClosed && isTheoreticalClosedOpp) ||
          (isClosedOpp && isTheoreticalClosed)) {
          // One is closed for real
          // The other is closed theoretical
          return 'ONE_CLEARED_AUCTION_ONE_THEORETICAL_CLOSE' // S6
        }
      }

      if (isTheoreticalClosedOpp || isTheoreticalClosed) {
        // One theoretical close
        // S3
        return 'ONE_THEORETICAL_CLOSED'
      }

      // The only state left
      return 'RUNNING' // S0
    }
  }
  */

  async getAuctionIndex ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    return this
      ._callForPair({
        operation: 'getAuctionIndex',
        sellToken,
        buyToken,
        cacheTime: this._cacheTimeAverage
      })
      .then(parseInt)
  }

  async getAuctionStart ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    const auctionStartEpoch = await this._callForPair({
      operation: 'getAuctionStart',
      sellToken,
      buyToken,
      cacheTime: this._cacheTimeAverage
    })

    // The SC has 0 when the contract is initialized
    // 1 when looking for funding. For the repo, they both will be modeled as a
    // null state of the auctionStart
    if (auctionStartEpoch <= AUCTION_START_FOR_WAITING_FOR_FUNDING) {
      return null
    } else {
      return epochToDate(auctionStartEpoch)
    }
  }

  async approveToken ({ token, from, isApproved = true }) {
    assert(token, 'The token is required')
    assert(from, 'The from is required')

    const tokenAddress = await this._getTokenAddress(token, false)

    const params = [
      [tokenAddress],
      [isApproved ? 1 : 0]
    ]

    return this._doTransaction({
      operation: 'updateApprovalOfToken',
      from,
      params
    })

    // NOTE: now is not standard, method receives array of token addresses
    // return this._transactionForToken({
    //   operation: 'updateApprovalOfToken',
    //   from,
    //   token: token,
    //   args: [ isApproved ? 1 : 0 ],
    //   checkToken: false
    // })
  }

  async isApprovedToken ({ token }) {
    assert(token, 'The token is required')

    return this._callForToken({
      operation: 'approvedTokens',
      token: token,
      checkToken: false,
      cacheTime: this._cacheTimeAverage
    })
  }

  async isValidTokenPair ({ tokenA, tokenB }) {
    assertPair(tokenA, tokenB)

    const auctionIndex = await this.getAuctionIndex({
      sellToken: tokenA,
      buyToken: tokenB
    })
    // auctionLogger.info({tokenA, tokenB, msg: 'isValidTokenPair? auctionIndex=%s', params: [ auctionIndex ]})

    return auctionIndex > 0
  }

  async hasPrice ({ token }) {
    assert(token, 'The token is required')

    return this.isValidTokenPair({
      tokenA: token,
      tokenB: 'WETH'
    })
  }

  // TODO: getCurrencies?

  async getSellVolume ({ sellToken, buyToken, cacheTime }) {
    assertPair(sellToken, buyToken)

    return this._callForPair({
      operation: 'sellVolumesCurrent',
      sellToken,
      buyToken,
      cacheTime: cacheTime || this._cacheTimeAverage
    })
  }

  async getSellVolumeNext ({ sellToken, buyToken }) {
    assertPair(sellToken, buyToken)

    return this._callForPair({
      operation: 'sellVolumesNext',
      sellToken,
      buyToken,
      cacheTime: this._cacheTimeShort
    })
  }

  async getBuyVolume ({ sellToken, buyToken, cacheTime }) {
    assertPair(sellToken, buyToken)

    return this._callForPair({
      operation: 'buyVolumes',
      sellToken,
      buyToken,
      cacheTime: cacheTime || this._cacheTimeShort
    })
  }

  async getBalance ({ token, address }) {
    assert(token, 'The token is required')
    assert(address, 'The address is required')

    return this._callForToken({
      operation: 'balances',
      token,
      args: [address],
      checkToken: false,
      cacheTime: this._cacheTimeShort
    })
  }

  async getTokens () {
    return Object.keys(this._tokens)
  }

  async getTokenPairs () {
    return this._getTokenPairs({
      event: 'NewTokenPair'
    })
  }

  async getTokenAddress ({ token }) {
    return this._getTokenAddress(token, false)
  }

  async getBalances ({ address }) {
    assert(address, 'The address is required')

    // logger.debug('Get balances for %s', address)
    const balancePromises =
      // for every token
      Object.keys(this._tokens)
        // get it's balance
        .map(async token => {
          const amount = await this.getBalance({ token, address })
          return { token, amount }
        })

    return Promise.all(balancePromises)
  }

  async getExtraTokens ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)

    return this._callForAuction({
      operation: 'extraTokens',
      sellToken,
      buyToken,
      auctionIndex,
      cacheTime: this._cacheTimeAverage
    })
  }

  async getSellerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForAuction({
      operation: 'sellerBalances',
      sellToken,
      buyToken,
      auctionIndex,
      args: [address],
      cacheTime: this._cacheTimeAverage
    })
  }

  async getIndicesWithClaimableTokensForSellers ({ sellToken, buyToken, address, lastNAuctions }) {
    assertPair(sellToken, buyToken)
    assert(address, 'The "address" is required')
    assert(lastNAuctions, 'The "lastNAuctions" is required')

    // FIXME when DXContract deploy > 0.5.0 Remove lastNAuctions assignment
    const lastAuctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    lastNAuctions = lastAuctionIndex

    return this._callForPair({
      operation: 'getIndicesWithClaimableTokensForSellers',
      sellToken,
      buyToken,
      args: [address, lastNAuctions]
    })
  }

  async getIndicesWithClaimableTokensForBuyers ({ sellToken, buyToken, address, lastNAuctions }) {
    assertPair(sellToken, buyToken)
    assert(address, 'The "address" is required')
    assert(lastNAuctions, 'The "lastNAuctions" is required')

    // FIXME when DXContract deploy > 0.5.0. Remove lastNAuctions assignment
    const lastAuctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    lastNAuctions = lastAuctionIndex

    return this._callForPair({
      operation: 'getIndicesWithClaimableTokensForBuyers',
      sellToken,
      buyToken,
      args: [address, lastNAuctions]
    })
  }

  async claimTokensFromSeveralAuctionsAsSeller ({
    auctionsAsSeller,
    address,
    fromAddress
  }) {
    // Transform the tokenPairs into addresses
    const auctionsInfoPromises = auctionsAsSeller.map(({ sellToken, buyToken, indices }) => {
      return Promise.all([
        this._getTokenAddress(sellToken),
        this._getTokenAddress(buyToken)
      ]).then(([sellTokenAddress, buyTokenAddress]) => ({
        sellToken,
        buyToken,
        sellTokenAddress,
        buyTokenAddress,
        indices
      }))
    })
    const auctionsInfo = await Promise.all(auctionsInfoPromises)

    const {
      auctionSellTokens,
      auctionBuyTokens,
      auctionIndices
    } = auctionsInfo.reduce((acc, auction) => {
      const {
        sellTokenAddress,
        buyTokenAddress,
        indices
      } = auction

      indices.forEach(auctionIndex => {
        acc.auctionSellTokens.push(sellTokenAddress)
        acc.auctionBuyTokens.push(buyTokenAddress)
        acc.auctionIndices.push(auctionIndex)
      })
      return acc
    }, {
      auctionSellTokens: [],
      auctionBuyTokens: [],
      auctionIndices: []
    })

    return this._doTransaction({
      operation: 'claimTokensFromSeveralAuctionsAsSeller',
      from: fromAddress || address,
      params: [auctionSellTokens, auctionBuyTokens, auctionIndices, address]
    })
  }

  async claimTokensFromSeveralAuctionsAsBuyer ({
    auctionsAsBuyer,
    address,
    fromAddress
  }) {
    // Transform the tokenPairs into addresses
    const auctionsInfoPromises = auctionsAsBuyer.map(({ sellToken, buyToken, indices }) => {
      return Promise.all([
        this._getTokenAddress(sellToken),
        this._getTokenAddress(buyToken)
      ]).then(([sellTokenAddress, buyTokenAddress]) => ({
        sellToken,
        buyToken,
        sellTokenAddress,
        buyTokenAddress,
        indices
      }))
    })
    const auctionsInfo = await Promise.all(auctionsInfoPromises)
    const {
      auctionSellTokens,
      auctionBuyTokens,
      auctionIndices
    } = auctionsInfo.reduce((acc, auction) => {
      const {
        sellTokenAddress,
        buyTokenAddress,
        indices
      } = auction

      indices.forEach(auctionIndex => {
        acc.auctionSellTokens.push(sellTokenAddress)
        acc.auctionBuyTokens.push(buyTokenAddress)
        acc.auctionIndices.push(auctionIndex)
      })
      return acc
    }, {
      auctionSellTokens: [],
      auctionBuyTokens: [],
      auctionIndices: []
    })
    return this._doTransaction({
      operation: 'claimTokensFromSeveralAuctionsAsBuyer',
      from: fromAddress || address,
      params: [auctionSellTokens, auctionBuyTokens, auctionIndices, address]
    })
  }

  async getSellerBalancesOfCurrentAuctions ({ tokenPairs, address }) {
    // Transform the tokenPairs into addresses
    const tokenPairsInfoPromises = tokenPairs.map(({ sellToken, buyToken }) => {
      return Promise.all([
        this._getTokenAddress(sellToken),
        this._getTokenAddress(buyToken)
      ]).then(([sellTokenAddress, buyTokenAddress]) => ({
        sellToken,
        buyToken,
        sellTokenAddress,
        buyTokenAddress
      }))
    })
    const tokenPairsInfo = await Promise.all(tokenPairsInfoPromises)

    // Transfor the addresses into the DX param format (two addresses arrays)
    const {
      auctionSellTokens,
      auctionBuyTokens,
      sellTokens,
      buyTokens
    } = tokenPairsInfo.reduce((acc, tokenPairInfo) => {
      const {
        sellToken,
        buyToken,
        sellTokenAddress,
        buyTokenAddress
      } = tokenPairInfo

      acc.auctionSellTokens.push(sellTokenAddress)
      acc.auctionBuyTokens.push(buyTokenAddress)
      acc.sellTokens.push(sellToken)
      acc.buyTokens.push(buyToken)
      return acc
    }, {
      auctionSellTokens: [],
      auctionBuyTokens: [],
      sellTokens: [],
      buyTokens: []
    })

    const sellersBalances = await this._doCall({
      operation: 'getSellerBalancesOfCurrentAuctions',
      params: [auctionSellTokens, auctionBuyTokens, address]
    })

    return sellersBalances.map((balance, index) => ({
      sellToken: sellTokens[index],
      buyToken: buyTokens[index],
      balance: sellersBalances[index]
    }))
  }

  async getBuyerBalance ({ sellToken, buyToken, auctionIndex, address }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForAuction({
      operation: 'buyerBalances',
      sellToken,
      buyToken,
      auctionIndex,
      args: [address],
      cacheTime: this._cacheTimeShort
    })
  }

  async getClaimedAmounts ({ sellToken, buyToken, auctionIndex, address }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForAuction({
      operation: 'claimedAmounts',
      sellToken,
      buyToken,
      auctionIndex,
      args: [address]
    })
  }

  async depositEther ({ from, amount }) {
    assert(from, 'The from param is required')
    assert(from, 'The amount is required')

    const balance = await this._ethereumClient.balanceOf(from)
    const amountBigNumber = numberUtil.toBigNumber(amount)
    assert(balance.greaterThanOrEqualTo(amountBigNumber), `The user ${from} has \
just ${balance.div(1e18)} ETH (not able to wrap ${amountBigNumber.div(1e18)} ETH)`)

    // deposit ether
    const eth = this._tokens.WETH
    return eth.deposit({ from, value: amount })
  }

  async withdrawEther ({ from, amount }) {
    assert(from, 'The from param is required')
    assert(from, 'The amount is required')

    const balance = await this.getBalanceERC20Token({ token: 'WETH', address: from })
    const amountBigNumber = numberUtil.toBigNumber(amount)
    assert(balance.greaterThanOrEqualTo(amountBigNumber), `The user ${from} has \
just ${balance.div(1e18)} WETH (not able to unwrap ${amountBigNumber.div(1e18)} WETH)`)

    // deposit ether
    const eth = this._tokens.WETH
    return eth.withdraw(amount, { from })
  }

  async getPriceEthUsd () {
    return this._priceOracle
      .getUSDETHPrice
      .call()
  }

  async setAllowance ({ token, from, amount }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')

    // Let DX use the ether
    const tokenContract = this._getTokenContractBySymbol(token)
    return tokenContract
      .approve(this._dx.address, amount, { from }) /*,  gas: 200000 */
    // .then(toTransactionNumber)
  }

  async getAllowance ({ token, accountAddress }) {
    assert(token, 'The token is required')
    assert(accountAddress, 'The accountAddress is required')

    const tokenContract = this._getTokenContractBySymbol(token)

    return tokenContract
      .allowance.call(accountAddress, this._dx.address)
  }

  async transferERC20Token ({ token, from, to, amount }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(to, 'The to param is required')
    assert(amount, 'The amount is required')

    // Let DX use the ether
    const tokenContract = this._getTokenContractBySymbol(token)
    return tokenContract.transfer(to, amount, { from })
  }

  async getBalanceERC20Token ({ token, address }) {
    assert(token, 'The token is required')
    assert(address, 'The address is required')

    const tokenContract = this._getTokenContractBySymbol(token)
    return tokenContract.balanceOf.call(address)
  }

  async deposit ({ token, amount, from }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')
    await this._assertBalanceERC20Token({
      token,
      address: from,
      amount
    })

    return this
      ._transactionForToken({
        operation: 'deposit',
        from,
        token,
        args: [amount], // new BigNumber(amount)
        checkToken: false
      })
    // .then(toTransactionNumber)
  }

  async withdraw ({ token, amount, from }) {
    assert(token, 'The token is required')
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')

    return this
      ._transactionForToken({
        operation: 'withdraw',
        from,
        token,
        args: [amount]
      })
    // .then(toTransactionNumber)
  }

  async postSellOrder ({
    sellToken, buyToken, auctionIndex, from, amount, gasPrice
  }) {
    /*
    logger.debug('postSellOrder: %o', {
      sellToken, buyToken, auctionIndex, from, amount
    })
    */

    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')
    assert(amount, 'The amount is required')

    assert(amount > 0, 'The amount must be a positive number')

    await this._assertBalance({
      token: sellToken,
      address: from,
      amount
    })

    const isValidTokenPair = await this.isValidTokenPair({ tokenA: sellToken, tokenB: buyToken })
    // TODO review
    assert(isValidTokenPair, 'The token pair has not been approved')

    const auctionStart = await this.getAuctionStart({ sellToken, buyToken })
    const now = await this._getTime()

    const lastAuctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    if (auctionStart !== null && auctionStart <= now) {
      // The auction is running
      assert.strictEqual(auctionIndex, lastAuctionIndex + 1,
        'The auction index should be set to the next auction (the auction is running)'
      )
    } else {
      // We are waiting (to start or for funding
      assert.strictEqual(auctionIndex, lastAuctionIndex,
        'The auction index should be set to the current auction (we are in a waiting period)'
      )
    }

    // const auctionHasCleared = this._auctionHasCleared({ sellToken, buyToken, auctionIndex })
    // assert(auctionHasCleared, 'The auction has cleared')
    //
    //
    // assert(auctionStart != null, 'The auction is in a waiting period')
    //
    //
    // assert(auctionStart <= now, "The auction hasn't started yet")
    //
    //
    // assert.strictEqual(auctionIndex, lastAuctionIndex, 'The provided index is not the index of the running auction')
    //
    // const sellVolume = await this.getSellVolume({ sellToken, buyToken })
    // assert(sellVolume > 0, "There's not selling volume")
    //
    // const buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    // assert(buyVolume + amount < MAXIMUM_FUNDING, 'The buyVolume plus the amount cannot be greater than ' + MAXIMUM_FUNDING)

    return this
      ._transactionForAuction({
        operation: 'postSellOrder',
        from,
        sellToken,
        buyToken,
        auctionIndex,
        args: [amount],
        gasPrice
      })
    // .then(toTransactionNumber)
  }

  async postBuyOrder ({ sellToken, buyToken, auctionIndex, from, amount }) {
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'postBuyOrder: %o',
      params: [{ buyToken, sellToken, auctionIndex, from, amount }]
    })
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    await this._assertBalance({
      token: buyToken,
      address: from,
      amount
    })

    const hasClosingPrice = this._hasClosingPrice({ sellToken, buyToken, auctionIndex })
    assert(hasClosingPrice, 'The auction has closing price (has cleared)')

    const auctionStart = await this.getAuctionStart({ sellToken, buyToken })
    assert(auctionStart != null, 'The auction is in a waiting period')

    const now = await this._getTime()
    assert(auctionStart <= now, "The auction hasn't started yet")

    const lastAuctionIndex = await this.getAuctionIndex({ sellToken, buyToken })
    assert.strictEqual(auctionIndex, lastAuctionIndex, 'The provided index is not the index of the running auction')

    const sellVolume = await this.getSellVolume({ sellToken, buyToken })
    assert(sellVolume > 0, "There's not selling volume")

    const buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    assert(buyVolume.add(amount).toNumber() < MAXIMUM_FUNDING, `The buyVolume (${buyVolume}) plus the amount (${amount}) cannot be greater than ${MAXIMUM_FUNDING}`)

    return this
      ._transactionForAuction({
        operation: 'postBuyOrder',
        from,
        sellToken,
        buyToken,
        auctionIndex,
        args: [amount]
      })
    // .then(toTransactionNumber)
  }

  async claimSellerFunds ({
    sellToken, buyToken, from, auctionIndex
  }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')

    // TODO: Review why the transaction needs address as a param as well
    return this
      ._transactionForPair({
        operation: 'claimSellerFunds',
        from,
        sellToken,
        buyToken,
        args: [from, auctionIndex]
      })
    // .then(toTransactionNumber)
  }

  async claimBuyerFunds ({ sellToken, buyToken, from, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(from, 'The from param is required')

    return this
      ._transactionForPair({
        operation: 'claimBuyerFunds',
        from,
        sellToken,
        buyToken,
        args: [from, auctionIndex]
      })
    // .then(toTransactionNumber)
  }

  async getUnclaimedBuyerFunds ({ sellToken, buyToken, address, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    assert(address, 'The address is required')

    return this._callForPair({
      operation: 'getUnclaimedBuyerFunds',
      sellToken,
      buyToken,
      args: [address, auctionIndex]
    })
  }

  async addTokenPair ({
    // address
    from,
    // Token A
    tokenA, tokenAFunding,
    // Token B
    tokenB, tokenBFunding,
    // Initial closing price
    initialClosingPrice
  }) {
    auctionLogger.debug({
      sellToken: tokenA,
      buyToken: tokenB,
      msg: 'Add new token pair: %s (%d), %s (%d). Price: %o. From %s ',
      params: [tokenA, tokenAFunding, tokenB, tokenBFunding, initialClosingPrice, from]
    })
    assertPair(tokenA, tokenB)
    assert(tokenAFunding >= 0, 'The funding for token A is incorrect')
    assert(tokenBFunding >= 0, 'The funding for token B is incorrect')
    assert(from, 'The from param is required')
    assert(initialClosingPrice, 'The initialClosingPrice is required')
    assert(initialClosingPrice.numerator >= 0, 'The initialClosingPrice numerator is incorrect')
    assert(initialClosingPrice.denominator >= 0, 'The initialClosingPrice denominator is incorrect')
    assert.notStrictEqual(tokenA, tokenB)
    assert(initialClosingPrice.numerator > 0, 'Initial price numerator must be positive')
    assert(initialClosingPrice.denominator > 0, 'Initial price denominator must be positive')

    const actualAFunding = await this._getMaxAmountAvaliable({
      token: tokenA, address: from, maxAmount: tokenAFunding
    })

    const actualBFunding = await this._getMaxAmountAvaliable({
      token: tokenB, address: from, maxAmount: tokenBFunding
    })

    assert(actualAFunding < MAXIMUM_FUNDING, 'The funding cannot be greater than ' + MAXIMUM_FUNDING)
    assert(actualBFunding < MAXIMUM_FUNDING, 'The funding cannot be greater than ' + MAXIMUM_FUNDING)
    auctionLogger.debug({
      sellToken: tokenA,
      buyToken: tokenB,
      msg: 'Actual A Funding: %s',
      params: [actualAFunding]
    })
    auctionLogger.debug({
      sellToken: tokenA,
      buyToken: tokenB,
      msg: 'Actual B Funding: %s',
      params: [actualBFunding]
    })

    const isValidTokenPair = await this.isValidTokenPair({ tokenA, tokenB })
    assert(!isValidTokenPair, 'The pair was previouslly added')

    // Ensure that we reach the minimum USD to add a token pair
    await this._assertMinimumFundingForAddToken({
      tokenA, actualAFunding, tokenB, actualBFunding
    })

    const tokenAAddress = await this._getTokenAddress(tokenA, false)
    const tokenBAddress = await this._getTokenAddress(tokenB, false)

    const params = [
      tokenAAddress, tokenBAddress,
      // we don't use the actual on porpuse (let the contract do that)
      tokenAFunding, tokenBFunding,
      initialClosingPrice.numerator,
      initialClosingPrice.denominator
    ]

    // debug('Add tokens with params: %o', params)
    return this
      ._doTransaction({
        operation: 'addTokenPair',
        from,
        params
      })
    // .then(toTransactionNumber)
  }

  async _assertBalanceERC20Token ({ token, address, amount }) {
    return this._assertBalanceAux({ token, address, amount, balanceInDx: false })
  }

  async _assertBalance ({ token, address, amount }) {
    return this._assertBalanceAux({ token, address, amount, balanceInDx: true })
  }

  async _assertBalanceAux ({ token, address, amount, balanceInDx }) {
    let balance
    if (balanceInDx) {
      balance = await this.getBalance({
        token,
        address
      })
    } else {
      balance = await this.getBalanceERC20Token({
        token,
        address
      })
    }
    const amountBigNumber = numberUtil.toBigNumber(amount)
    assert(
      balance.greaterThanOrEqualTo(amountBigNumber),
      `The user ${address} has just ${balance.div(1e18)} ${token} \
(required ${amountBigNumber.div(1e18)} ${token})`)
  }

  async _assertMinimumFundingForAddToken ({ tokenA, actualAFunding, tokenB, actualBFunding }) {
    // get the funded value in USD
    let fundedValueUSD
    if (this.isTokenEth(tokenA)) {
      fundedValueUSD = await this.getPriceInUSD({
        token: tokenA,
        amount: actualAFunding
      })
    } else if (this.isTokenEth(tokenB)) {
      fundedValueUSD = await this.getPriceInUSD({
        token: tokenB,
        amount: actualBFunding
      })
    } else {
      const fundingAInUSD = await this.getPriceInUSD({
        token: tokenA,
        amount: actualAFunding
      })
      const fundingBInUSD = await this.getPriceInUSD({
        token: tokenB,
        amount: actualBFunding
      })
      fundedValueUSD = fundingAInUSD.add(fundingBInUSD)
    }

    auctionLogger.debug({
      sellToken: tokenA,
      buyToken: tokenB,
      msg: 'Price in USD for the initial funding',
      params: [fundedValueUSD]
    })
    const THRESHOLD_NEW_TOKEN_PAIR = await this.getThresholdNewTokenPair()
    assert(fundedValueUSD.toNumber() > THRESHOLD_NEW_TOKEN_PAIR, `Not enough funding. \
Actual USD funding ${fundedValueUSD}. Required funding ${THRESHOLD_NEW_TOKEN_PAIR}`)
  }

  async getFundingInUSD ({ tokenA, tokenB, auctionIndex }) {
    // auctionLogger.debug(tokenA, tokenB, `getFundingInUSD for auction ${auctionIndex}`)
    const currentAuctionIndex = await this.getAuctionIndex({
      sellToken: tokenA, buyToken: tokenB
    })
    let getSellVolumeFn
    if (auctionIndex === currentAuctionIndex) {
      getSellVolumeFn = 'getSellVolume'
    } else if (auctionIndex === currentAuctionIndex + 1) {
      getSellVolumeFn = 'getSellVolumeNext'
    } else {
      throw new Error(`The sell volume can only be obtained for the current \
auction or the next one. auctionIndex=${auctionIndex}, \
currentAuctionIndex=${currentAuctionIndex}`)
    }

    const [sellVolumeA, sellVolumeB] = await Promise.all([
      this[getSellVolumeFn]({ sellToken: tokenA, buyToken: tokenB }),
      this[getSellVolumeFn]({ sellToken: tokenB, buyToken: tokenA })
    ])

    const [fundingA, fundingB] = await Promise.all([
      this.getPriceInUSD({
        token: tokenA,
        amount: sellVolumeA
      }),
      this.getPriceInUSD({
        token: tokenB,
        amount: sellVolumeB
      })
    ])

    return {
      fundingA,
      fundingB
    }
  }

  async getPriceInUSD ({ token, amount }) {
    const amountBN = numberUtil.toBigNumber(amount)
    const ethUsdPrice = await this.getPriceEthUsd()
    logger.debug({
      msg: 'Eth/Usd Price for %s: %d',
      params: [token, ethUsdPrice]
    })
    let amountInETH
    if (this.isTokenEth(token)) {
      amountInETH = amountBN
    } else {
      const priceTokenETH = await this.getPriceInEth({ token })
      logger.debug({
        msg: 'Price in WETH for %s: %d',
        params: [
          token,
          priceTokenETH.numerator.div(priceTokenETH.denominator)
        ]
      })
      amountInETH = amountBN
        .mul(priceTokenETH.numerator)
        .div(priceTokenETH.denominator)
    }

    return amountInETH
      .mul(ethUsdPrice)
      .div(1e18)
  }

  async getPriceFromUSDInTokens ({ token, amountOfUsd }) {
    const ethUsdPrice = await this.getPriceEthUsd()
    logger.debug('Eth/Usd Price for %s: %d', token, ethUsdPrice)
    let amountInETH = amountOfUsd.div(ethUsdPrice)

    let amountInToken
    if (this.isTokenEth(token)) {
      amountInToken = amountInETH
    } else {
      const priceTokenETH = await this.getPriceInEth({ token })
      logger.debug('Price of token %s in WETH: %d', token,
        priceTokenETH.numerator.div(priceTokenETH.denominator))
      amountInToken = amountInETH
        .mul(priceTokenETH.denominator)
        .div(priceTokenETH.numerator)
    }

    return amountInToken.mul(1e18)
  }

  async getOutstandingVolume ({ sellToken, buyToken, auctionIndex }) {
    const state = this.getState({ sellToken, buyToken, auctionIndex })
    assert(
      state !== 'WAITING_FOR_FUNDING' &&
      state !== 'WAITING_FOR_AUCTION_TO_START',
      `The auction can't be in a waiting period for getting the outstanding \
volume: ${state}`)

    const sellVolume = await this.getSellVolume({
      sellToken,
      buyToken
    })

    const buyVolume = await this.getBuyVolume({
      sellToken,
      buyToken
    })

    const price = await this.getCurrentAuctionPrice({
      sellToken,
      buyToken,
      auctionIndex
    })

    const sellVolumeInBuyTokens = sellVolume
      .mul(price.numerator)
      .div(price.denominator)

    const outstandingVolume = sellVolumeInBuyTokens.minus(buyVolume)
    return outstandingVolume.lessThan(0) ? 0 : outstandingVolume
  }

  // TODO: Implement a price function for auctions that are running
  /*
        fraction memory ratioOfPriceOracles = computeRatioOfHistoricalPriceOracles(sellToken, buyToken, auctionIndex);

        // If we're calling the function into an unstarted auction,
        // it will return the starting price of that auction
        uint timeElapsed = atleastZero(int(now - getAuctionStart(sellToken, buyToken)));

        // The numbers below are chosen such that
        // P(0 hrs) = 2 * lastClosingPrice, P(6 hrs) = lastClosingPrice, P(>=24 hrs) = 0

        // 10^4 * 10^35 = 10^39
        price.num = atleastZero(int((86400 - timeElapsed) * ratioOfPriceOracles.num));
        // 10^4 * 10^35 = 10^39
        price.den = (timeElapsed + 43200) * ratioOfPriceOracles.den;

        if (price.num * sellVolumesCurrent[sellToken][buyToken] <= price.den * buyVolumes[sellToken][buyToken]) {
            price.num = buyVolumes[sellToken][buyToken];
            price.den = sellVolumesCurrent[sellToken][buyToken];
        }

  */

  async getFeeRatio ({ address }) {
    assert(address, 'The address is required')
    return this
      ._doCall({
        operation: 'getFeeRatio',
        params: [address],
        cacheTime: this._cacheTimeAverage
      })
  }

  async getCurrentAuctionPriceWithFees ({ sellToken, buyToken, auctionIndex, amount, from, owlAllowance, owlBalance, ethUSDPrice }) {
    const cacheTime = 15
    const { numerator, denominator } = await this.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex, cacheTime })
    const sellVolume = await this.getSellVolume({ sellToken, buyToken, cacheTime })
    const buyVolume = await this.getBuyVolume({ sellToken, buyToken, cacheTime })

    // 10^30 * 10^37 = 10^67
    let outstandingVolume = sellVolume.mul(numerator).div(denominator).sub(buyVolume)
    outstandingVolume = outstandingVolume.lt(0) ? outstandingVolume.mul(0) : outstandingVolume
    let amountAfterFee = amount
    let closesAuction = false
    if (amount.lt(outstandingVolume)) {
      if (amount.gt(0)) {
        amountAfterFee = await this.settleFee(buyToken, sellToken, auctionIndex, amount, from, owlAllowance, owlBalance, ethUSDPrice)
      }
    } else {
      amountAfterFee = outstandingVolume
      closesAuction = true
    }

    return {
      closesAuction,
      amountAfterFee
    }
  }

  async settleFee (primaryToken, secondaryToken, auctionIndex, amount, from, owlAllowance, owlBalance, ethUSDPrice) {
    const [numerator, denominator] = await this.getFeeRatio({ address: from })

    // 10^30 * 10^3 / 10^4 = 10^29
    let fee = amount.mul(numerator).div(denominator)

    if (fee > 0) {
      fee = await this.settleFeeSecondPart(primaryToken, fee, from, owlAllowance, owlBalance, ethUSDPrice)
    }

    return amount.sub(fee)
  }

  async settleFeeSecondPart (primaryToken, fee, from, owlAllowance, owlBalance, ethUSDPrice) {
    const cacheTime = 15
    // Allow user to reduce up to half of the fee with owlToken

    const { numerator, denominator } = await this.getPriceInEth({ token: primaryToken, cacheTime })

    // Convert fee to ETH, then USD
    // 10^29 * 10^30 / 10^30 = 10^29
    let feeInETH = fee.mul(numerator).div(denominator)
    // 10^29 * 10^6 = 10^35
    // Uses 18 decimal places <> exactly as owlToken tokens: 10**18 owlToken == 1 USD
    let feeInUSD = feeInETH.mul(ethUSDPrice)

    let halfFee = feeInUSD.div(2)
    let amountOfowlTokenBurned = owlAllowance.lt(halfFee) ? owlAllowance : halfFee
    amountOfowlTokenBurned = amountOfowlTokenBurned.lt(owlBalance) ? amountOfowlTokenBurned : owlBalance
    let newFee
    if (amountOfowlTokenBurned.gt(0)) {
      // Adjust fee
      // 10^35 * 10^29 = 10^64
      let adjustment = amountOfowlTokenBurned.mul(fee).div(feeInUSD)
      newFee = fee.sub(adjustment)
    } else {
      newFee = fee
    }
    return newFee
  }

  async getCurrentAuctionPrice ({ sellToken, buyToken, auctionIndex, cacheTime }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    // let currentAuctionPrice
    return this
      ._callForAuction({
        operation: 'getCurrentAuctionPrice',
        sellToken,
        buyToken,
        auctionIndex,
        cacheTime: cacheTime || this._cacheTimeShort
      })
      .then(toFraction)
    // TODO: breaking many places for now
    // if (!currentAuctionPrice) {
    //   // Handle the sellVolume=0 case
    //   //    * Given an auction that is closed from the begining (sellVolume=0)
    //   //    * It will return null if you request the price
    //   //    * It's not hanled this case in the SC
    //   //    * So, for the time being, it's handled in this repo
    //   // TODO: Remove this logic, if the SC implements this check
    //   currentAuctionPrice = await this
    //     ._callForAuction({
    //       operation: 'getCurrentAuctionPrice',
    //       sellToken: buyToken,
    //       buyToken: sellToken,
    //       auctionIndex
    //     })
    //     .then(toFraction)
    //
    //   if (currentAuctionPrice) {
    //     currentAuctionPrice = {
    //       numerator: currentAuctionPrice.denominator,
    //       denominator: currentAuctionPrice.numerator
    //     }
    //   } else {
    //     currentAuctionPrice = null
    //   }
    // }

    // return currentAuctionPrice
  }

  async getPastAuctionPrice ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)

    return this
      ._callForAuction({
        operation: 'getPriceInPastAuction',
        sellToken,
        buyToken,
        auctionIndex
      })
      .then(toFraction)
  }

  async getSellOrders ({
    fromBlock = 0,
    toBlock = -5,
    user,
    sellToken,
    buyToken,
    auctionIndex
  }) {
    return this._getOrders({
      event: 'NewSellOrder',
      fromBlock,
      toBlock,
      user,
      sellToken,
      buyToken,
      auctionIndex
    })
  }

  async getBuyOrders ({
    fromBlock = 0,
    toBlock = -5,
    user,
    sellToken,
    buyToken,
    auctionIndex,
    event
  }) {
    return this._getOrders({
      event: 'NewBuyOrder',
      fromBlock,
      toBlock,
      user,
      sellToken,
      buyToken,
      auctionIndex
    })
  }

  getAuctionStartScheduledEvents ({
    fromBlock,
    toBlock,
    sellToken,
    buyToken,
    auctionIndex
  }) {
    return ethereumEventHelper
      .filter({
        contract: this._dx,
        filters: {
          sellToken,
          buyToken,
          auctionIndex
        },
        fromBlock,
        toBlock,
        events: [
          'AuctionStartScheduled'
        ]
      })
      .then(events => this._toEventsData({
        events,
        datePropName: 'auctionStartScheduled'
      }))
      .then(auctionStartScheduledEvents => {
        return auctionStartScheduledEvents.map(event => Object.assign({}, event, {
          auctionStart: new Date(event.auctionStart.mul(1000).toNumber())
        }))
      })
  }

  async getFees ({
    fromBlock = 0,
    toBlock = -5,
    primaryToken,
    secondarToken,
    auctionIndex,
    user
  } = {}) {
    let feesList = await ethereumEventHelper
      .filter({
        contract: this._dx,
        filters: {
          primaryToken,
          secondarToken,
          user
        },
        fromBlock,
        toBlock,
        events: ['Fee']
      })
      .then(events => this._toEventsData({
        events,
        datePropName: 'tradeDate'
      }))
      .then(eventsData => eventsData.map(eventData => {
        // Rename the primaryToken and secondaryToken to sellTokeb, buyToken
        const eventDataRenamed = Object.assign({}, eventData, {
          sellToken: eventData.primaryToken,
          buyToken: eventData.secondarToken/*,
          primaryToken: undefined,
          secondarToken: undefined
          */
        })

        delete eventDataRenamed.primaryToken
        delete eventDataRenamed.secondarToken

        return eventDataRenamed
      }))
      .then(eventsData => this._addTokensToEventsData(eventsData))

    if (auctionIndex) {
      feesList = feesList.filter(fee => fee.auctionIndex.equals(auctionIndex))
    }

    return feesList
  }

  async getAuctions ({ fromBlock, toBlock }) {
    // Get cleared auctions to select the auctions

    const [auctions, auctionStartEvents] = await Promise.all([
      // Get cleared auctions
      this.getClearedAuctions({
        fromBlock,
        toBlock
      }),

      // Get auction scheduled events
      this.getAuctionStartScheduledEvents({
        // Search at withing 24h before the give fromBlock
        fromBlock: fromBlock - this._BLOCKS_MINED_IN_24H,
        toBlock
      })
    ])

    // Get aditional info for the auction
    const auctionDtoPromises = auctions.map(async auction => {
      // Get aditional info: auction start, closingPrice
      const { sellToken, buyToken, auctionIndex } = auction

      // Get the previous closing price
      let lastAvaliableClosingPricePromise
      if (auction.auctionIndex.greaterThan(0)) {
        lastAvaliableClosingPricePromise = this.getLastAvaliableClosingPrice({
          sellToken,
          buyToken,
          auctionIndex: auction.auctionIndex.minus(1)
        })
      } else {
        // There's no previous price befor auction 0
        lastAvaliableClosingPricePromise = Promise.resolve(null)
      }

      // Add the auction start date
      const filterByAuction = dxFilters.createAuctionPairFilter({
        sellToken,
        buyToken,
        auctionIndex
      })

      let auctionStart, auctionStartScheduled
      const auctionStartEvent = auctionStartEvents.find(filterByAuction)
      if (auctionStartEvent) {
        auctionStart = auctionStartEvent.auctionStart
        auctionStartScheduled = auctionStartEvent.auctionStartScheduled
      } else {
        auctionStart = null
        auctionStartScheduled = null

        // We notify the error, but we can continue
        // it can happen if the auction was running for too long (so it shouldn
        // not happen)
        auctionLogger.error({
          sellToken,
          buyToken,
          msg: "There's no auction start event for auction %d. Maybe run too long?",
          params: [auctionIndex]
        })
      }

      const [closingPrice, previousClosingPrice] = await Promise.all([
        // Get closing price
        this.getClosingPrices({ sellToken, buyToken, auctionIndex }),

        // Get the previous closing price
        lastAvaliableClosingPricePromise
      ])

      return Object.assign(auction, {
        auctionStart,
        auctionStartScheduled,
        closingPrice,
        previousClosingPrice
      })
    })

    return Promise.all(auctionDtoPromises)
  }

  async _getOrders ({
    fromBlock = 0,
    toBlock = -5,
    user,
    sellToken,
    buyToken,
    auctionIndex,
    event
  }) {
    let sellTokenAddress = sellToken ? await this._getTokenAddress(sellToken) : undefined
    let buyTokenAddress = buyToken ? await this._getTokenAddress(buyToken) : undefined

    let orders = await ethereumEventHelper
      .filter({
        contract: this._dx,
        events: [event],
        fromBlock,
        toBlock,
        filters: {
          user,
          sellToken: sellTokenAddress,
          buyToken: buyTokenAddress
        }
      })
      .then(orderEvents => this._toEventsData({
        events: orderEvents,
        datePropName: 'dateTime'
      }))

    // auctionIndex is not indexed, so we filter programatically
    if (auctionIndex) {
      orders = orders.filter(order => order.auctionIndex.equals(auctionIndex))
    }

    return orders
  }

  async _getTokenPairs ({
    fromBlock = 0,
    toBlock = -5,
    sellToken,
    buyToken,
    event
  }) {
    let tokens = await ethereumEventHelper
      .filter({
        contract: this._dx,
        events: [event],
        fromBlock,
        toBlock,
        filters: {
        }
      })
      .then(tokenPairEvents => this._toEventsData({
        events: tokenPairEvents,
        datePropName: 'dateTime'
      }))

    return tokens
  }

  async getClearedAuctions ({
    fromBlock = 0,
    toBlock = -5,
    sellToken,
    buyToken,
    auctionIndex
  } = {}) {
    return ethereumEventHelper
      .filter({
        contract: this._dx,
        filters: {
          sellToken,
          buyToken,
          auctionIndex
        },
        fromBlock,
        toBlock,
        events: [
          'AuctionCleared'
        ]
      })
      .then(orderEvents => this._toEventsData({
        events: orderEvents,
        datePropName: 'auctionEnd'
      }))
      .then(eventsData => this._addTokensToEventsData(eventsData))
  }

  async getClaimedFundsSeller ({
    fromBlock = 0,
    toBlock = -5,
    sellToken,
    buyToken,
    auctionIndex,
    user
  } = {}) {
    return this._getClaimedFundsAux({
      eventName: 'NewSellerFundsClaim',
      fromBlock,
      toBlock,
      sellToken,
      buyToken,
      auctionIndex,
      user
    })
  }

  async getClaimedFundsBuyer ({
    fromBlock = 0,
    toBlock = -5,
    sellToken,
    buyToken,
    auctionIndex,
    user
  } = {}) {
    return this._getClaimedFundsAux({
      eventName: 'NewBuyerFundsClaim',
      fromBlock,
      toBlock,
      sellToken,
      buyToken,
      auctionIndex,
      user
    })
  }

  async _getClaimedFundsAux ({
    eventName,
    fromBlock = 0,
    toBlock = -5,
    sellToken,
    buyToken,
    auctionIndex,
    user
  } = {}) {
    let claimedFundsList = await ethereumEventHelper
      .filter({
        contract: this._dx,
        filters: {
          sellToken,
          buyToken,
          user
        },
        fromBlock,
        toBlock,
        events: [eventName]
      })
      .then(orderEvents => this._toEventsData({
        events: orderEvents,
        datePropName: 'claimDate'
      }))
      .then(eventsData => this._addTokensToEventsData(eventsData))

    if (auctionIndex) {
      claimedFundsList = claimedFundsList.filter(claimedFunds => claimedFunds.auctionIndex.equals(auctionIndex))
    }

    return claimedFundsList
  }

  async getPriceInEth ({ token, cacheTime }) {
    assert(token, 'The token is required')

    if (this.isTokenEth(token)) {
      return {
        numerator: numberUtil.toBigNumber(1),
        denominator: numberUtil.toBigNumber(1)
      }
    }

    // If none of the token are WETH, we make sure the market <token>/WETH exists
    const tokenEthMarketExists = await this.isValidTokenPair({
      tokenA: token,
      tokenB: 'WETH'
    })

    assert(tokenEthMarketExists, `The market ${token}-WETH doesn't exists`)

    let foo = await this
      ._callForToken({
        operation: 'getPriceOfTokenInLastAuction',
        token,
        checkToken: false,
        cacheTime
      })
      .then(toFraction)

    return foo
    // // Removed the use of getPriceOfTokenInLastAuction
    // //     * The implementation doesn't look in the current auction ¿¿??
    // //     * It involves changing the smart contract, so we have to do a hack in
    // //        our side
    // //     * Knowing that getPriceInPastAuction starts looking in the
    // //        auction - 1, we pass auction + 1
    // const sellToken = token
    // const buyToken = 'WETH'
    // const currentAuctionIndex = await this.getAuctionIndex({
    //   sellToken,
    //   buyToken
    // })
    // return this
    //   ._callForAuction({
    //     operation: 'getPriceInPastAuction',
    //     sellToken,
    //     buyToken,
    //     auctionIndex: currentAuctionIndex + 1
    //   })
    //   .then(toFraction)
  }

  async getLastAvaliableClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    const auctionIndexBn = numberUtil.toBigNumber(auctionIndex)
    assert(auctionIndexBn.greaterThanOrEqualTo(0),
      'The auction index must be a positive number')

    return this._getLastAvaliableClosingPriceAux({
      sellToken,
      buyToken,
      auctionIndex: auctionIndexBn
    })
  }

  async _addTokensToEventsData (eventsData) {
    const eventsDataWithSymbols = eventsData.map(async eventData => {
      const [sellTokenSymbol, buyTokenSymbol] = await Promise.all([
        this._getTokenSymbolByAddress(eventData.sellToken),
        this._getTokenSymbolByAddress(eventData.buyToken)
      ])

      return Object.assign(eventData, {
        sellTokenSymbol,
        buyTokenSymbol
      })
    })

    return Promise.all(eventsDataWithSymbols)
  }

  async _getLastAvaliableClosingPriceAux ({ sellToken, buyToken, auctionIndex }) {
    if (auctionIndex.lessThan(0)) {
      return null
    }

    const closingPrice = await this.getClosingPrices({
      sellToken,
      buyToken,
      auctionIndex
    })

    if (closingPrice) {
      return closingPrice
    } else {
      return this._getLastAvaliableClosingPriceAux({
        sellToken,
        buyToken,
        auctionIndex: auctionIndex.minus(1)
      })
    }
  }

  async getClosingPrices ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    const fetchFn = () => this
      ._callForAuction({
        operation: 'closingPrices',
        sellToken,
        buyToken,
        auctionIndex,
        cacheTime: null // We want to handle the cache specially for this method
      })
      .then(toFraction)

    const params = [sellToken, buyToken, auctionIndex]
    const cacheKey = this._getCacheKey({ operation: 'closingPrices', params })

    if (this._cache) {
      const that = this
      return this._cache.get({
        key: cacheKey,
        fetchFn,
        time (closingPrice) {
          if (closingPrice === null) {
            return that._cacheTimeShort
          } else {
            return that._cacheTimeLong
          }
        }
      })
    } else {
      return fetchFn()
    }
  }

  async getAuctionState ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)

    // auctionLogger.debug(sellToken, buyToken, 'getAuctionState: %d', auctionIndex)
    const buyVolume = await this.getBuyVolume({ sellToken, buyToken })
    const sellVolume = await this.getSellVolume({ sellToken, buyToken })

    /*
    auctionLogger.debug(sellToken, buyToken,
      '_getIsClosedState(%s-%s): buyVolume: %d, sellVolume: %d',
      sellToken, buyToken,
      buyVolume, sellVolume
    )
    */

    const price = await this.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })
    let isTheoreticalClosed = null

    const [auctionStart, now] = await Promise.all([
      this.getAuctionStart({ sellToken, buyToken }),
      this._getTime()
    ])
    const hasAuctionStarted = auctionStart && auctionStart < now

    if (price && hasAuctionStarted) {
      /*
      auctionLogger.debug(sellToken, buyToken, 'Auction index: %d, Price: %d/%d %s/%s',
        auctionIndex, price.numerator, price.denominator,
        sellToken, buyToken
      )
      */

      // (Pn x SV) / (Pd x BV)
      // example:
      isTheoreticalClosed = price.numerator
        .mul(sellVolume)
        .sub(price.denominator
          .mul(buyVolume)
        ).toNumber() === 0
    } else {
      isTheoreticalClosed = false
    }

    const closingPrice = await this.getClosingPrices({
      sellToken, buyToken, auctionIndex
    })

    // There's to ways a auction can be closed
    //  (1) Because it has cleared, so it has a closing price
    //  (2) Because when the auction started, it didn't have sellVolume, so i
    //      is considered, autoclosed since the start
    let isClosed
    if (sellVolume.isZero()) {
      // closed if sellVolume=0 and the auction has started and hasn't been cleared
      isClosed = hasAuctionStarted
    } else {
      /*
      debug('_getIsClosedState(%s-%s): Closing price: %d/%d',
        sellToken, buyToken,
        closingPrice.numerator, closingPrice.denominator
      )
      */
      isClosed = closingPrice !== null
    }

    /*
    debug('_getIsClosedState(%s-%s): is closed? %s. Is theoretical closed? %s',
      sellToken, buyToken,
      isClosed, isTheoreticalClosed
    )
    */

    return {
      buyVolume,
      sellVolume,
      auctionStart,
      hasAuctionStarted,
      closingPrice,
      isClosed,
      isTheoreticalClosed
    }
  }

  async getMagnoliaToken () {
    return this._tokens['MGN']
  }

  isTokenEth (token) {
    return token === 'WETH' ||
      token.toLowerCase() === this._tokens.WETH.address.toLowerCase()
  }

  _hasClosingPrice ({ sellToken, buyToken, auctionIndex }) {
    assertAuction(sellToken, buyToken, auctionIndex)
    const closingPrice = this.getClosingPrices({ sellToken, buyToken, auctionIndex })

    return closingPrice.denominator !== 0
  }

  async _getMaxAmountAvaliable ({ token, address, maxAmount }) {
    const balance = await this.getBalance({ token, address })
    // console.log('MIN', balance.toNumber(), maxAmount)
    return BigNumber.min(balance, maxAmount)
  }

  _getTokenContractBySymbol (token) {
    const tokenContract = this._tokens[token]
    if (!tokenContract) {
      const error = new Error(`Unknown token ${token}. For convenience only WETH symbol is supported. Otherwise use the token address`)
      error.type = 'UNKNOWN_TOKEN'
      error.status = 404
      throw error
    }
    return tokenContract
  }

  _getTokenSymbolByAddress (tokenAddress) {
    const tokenSymbols = Object.keys(this._tokens)

    return tokenSymbols.find(tokenSymbol => {
      const contract = this._tokens[tokenSymbol]
      return contract.address === tokenAddress
    })
  }

  async _getTokenAddress (token, check = false) {
    let tokenAddress
    if (HEXADECIMAL_REGEX.test(token)) {
      tokenAddress = token
    } else {
      tokenAddress = this._getTokenContractBySymbol(token).address
      if (check) {
        const isApprovedToken = await this.isApprovedToken({ tokenAddress })

        if (!isApprovedToken) {
          throw Error(`${token} is not an approved token`)
        }
      }
    }

    // Check that the address returns some code. Parity returns a hard error if no contract in given address: VM Execution error
    const code = await this._ethereumClient.getCode(tokenAddress)
    if (code === '0x') {
      const error = new Error(`Token address ${tokenAddress} is not valid. Check that it is a token address.`)
      error.type = 'TOKEN_ADDRESS_NOT_FOUND'
      error.status = 404
      throw error
    }

    return tokenAddress
  }

  async _callForToken ({
    operation,
    token,
    args = [],
    checkToken = true,
    cacheTime
  }) {
    /*
    debug('Get "%s" for token %s. Args: %s',
      operation, token, args)
    */

    const tokenAddress = await this._getTokenAddress(token, checkToken)
    const params = [tokenAddress, ...args]

    // debug('Call "%s" with params: [%s]', operation, params.join(', '))

    // return this._dx[operation].call(...params)
    return this._doCall({ operation, params, cacheTime })
  }

  async _callForPair ({
    operation,
    sellToken,
    buyToken,
    args = [],
    checkTokens = false,
    cacheTime
  }) {
    /*
    debug('Get "%s" for pair %s-%s. Args: %s',
      operation, sellToken, buyToken, args)
      */
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)
    const params = [sellTokenAddress, buyTokenAddress, ...args]

    // return this._dx[operation].call(...params)
    return this._doCall({ operation, params, cacheTime })
  }

  async _callForAuction ({
    operation,
    sellToken,
    buyToken,
    auctionIndex,
    args = [],
    checkTokens = false,
    cacheTime
  }) {
    // console.log('Get %s for auction %d of pair %s-%s',
    //   operation, auctionIndex, sellToken, buyToken
    // )
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)
    const params = [sellTokenAddress, buyTokenAddress, auctionIndex, ...args]

    // return this._dx[operation].call(...params)
    return this._doCall({ operation, params, cacheTime })
  }

  async _transactionForToken ({ operation, from, token, args = [], checkToken }) {
    logger.debug('Execute transaction "%s" (from %s) for token %s. Args: %s',
      operation, from, token, args
    )
    const tokenAddress = await this._getTokenAddress(token, checkToken)

    const params = [
      tokenAddress,
      ...args
    ]

    // logger.debug('Params: %o', params)
    return this._doTransaction({ operation, from, params })
  }

  async _transactionForPair ({
    operation, from, sellToken, buyToken, args = [], checkTokens
  }) {
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Execute transaction "%s" (from %s)',
      params: [operation, from]
    })
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)

    const params = [
      sellTokenAddress,
      buyTokenAddress,
      ...args
    ]
    return this._doTransaction({ operation, from, params })
  }

  async _toEventData (event, datePropName) {
    const block = await this._ethereumClient.getBlock(event.blockNumber)

    // Return the data of the event (event.args)
    // Also, the rest of the data is returned as ethInfo
    const eventData = Object.assign({
      ethInfo: Object.assign({}, event, { args: undefined })
    }, event.args)

    // Add the date where the block was mined
    eventData[datePropName] = block ? new Date(block.timestamp * 1000) : null

    return eventData
  }

  async _toEventsData ({ events, datePropName }) {
    const eventDataPromises = events
      .map(event => this._toEventData(event, datePropName))

    return Promise.all(eventDataPromises)
  }

  async _doCall ({
    operation,
    params,
    cacheTime = this._cacheTimeShort
  }) {
    // NOTE: cacheTime can be set null/0 on porpouse, so it's handled from the
    //  caller method

    logger.trace('Call: ' + operation, params)
    if (this._cache && cacheTime !== null) {
      const cacheKey = this._getCacheKey({ operation, params })
      return this._cache.get({
        key: cacheKey,
        time: cacheTime, // Caching time in seconds
        fetchFn: () => {
          return this._fetchFromBlockchain({ operation, params })
        }
      })
    } else {
      return this._fetchFromBlockchain({ operation, params })
    }
  }

  _fetchFromBlockchain ({ operation, params }) {
    logger.trace('Fetching from blockchain: ' + operation, params)
    // Check if operation is in dx or dxHelper
    return (this._dx[operation] || this._dxHelper[operation])
      .call(...params)
      .catch(e => {
        logger.error({
          msg: 'ERROR: Call %s with params: [%s]',
          params: [operation, params.join(', ')],
          e
        })
        throw e
      })
  }

  _getCacheKey ({ operation, params }) {
    return operation + ':' + params.join('-')
  }

  async _transactionForAuction ({
    operation,
    from,
    sellToken,
    buyToken,
    auctionIndex,
    args = [],
    checkTokens,
    gasPrice
  }) {
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: 'Execute transaction %s (address %s) for auction %d',
      params: [operation, from, auctionIndex]
    })
    const sellTokenAddress = await this._getTokenAddress(sellToken, checkTokens)
    const buyTokenAddress = await this._getTokenAddress(buyToken, checkTokens)
    const params = [
      sellTokenAddress,
      buyTokenAddress,
      auctionIndex,
      ...args
    ]
    return this._doTransaction({ operation, from, gasPrice, params })
  }

  async _doTransaction ({ operation, from, gasPrice: gasPriceParam, params }) {
    logger.debug({
      msg: '_doTransaction: \n%O',
      params: [
        operation,
        from,
        params
      ]
    })

    let gasPricePromise = this._getGasPrices(gasPriceParam)

    const [gasPrices, estimatedGas] = await Promise.all([
      // Get gasPrice
      gasPricePromise,

      // Estimate gas
      this._dx[operation]
        .estimateGas(...params, { from })
    ])

    const { initialGasPrice, fastGasPrice } = gasPrices

    logger.debug({
      msg: '_doTransaction. Estimated gas for "%s": %d',
      params: [operation, estimatedGas]
    })
    logger.debug({
      msg: 'Initial gas price is set to %d by %s',
      params: [initialGasPrice, this._gasPriceDefault]
    })
    const gas = Math.ceil(estimatedGas * this._gasEstimationCorrectionFactor)
    const maxGasWillingToPay = fastGasPrice * this._overFastPriceFactor

    // // Serialize the transactions, so we ensure we don't have nonce collitions
    // // we calculate the nonce in advance, so we can retry the transaction when
    // // they take long
    // return sendTxWithUniqueNonce({
    //   from,
    //   ethereumClient: this._ethereumClient,
    //   sendTransaction: nonce => {
    //     logger.debug('Send transaction using nonce: %d', nonce)

    //     return new Promise((resolve, reject) => {
    //       // Do transaction, and retry if it takes to long
    //       this._doTransactionWithRetry({
    //         resolve,
    //         reject,
    //         gasPrice: initialGasPrice,
    //         maxGasWillingToPay,
    //         operation,
    //         from,
    //         params,
    //         gas,
    //         gasPriceParam,
    //         nonce
    //       })
    //     })
    //   }
    // })

    return new Promise((resolve, reject) => {
      // Do transaction, and retry if it takes to long
      this._doTransactionWithoutRetry({
        resolve,
        reject,
        gasPrice: initialGasPrice,
        maxGasWillingToPay,
        operation,
        from,
        params,
        gas,
        gasPriceParam,
        nonce: undefined
      })
    })
  }

  async _getGasPrices (gasPriceParam) {
    if (gasPriceParam) {
      // Use the provided gas price
      return Promise.resolve({
        initialGasPrice: gasPriceParam,
        fastGasPrice: gasPriceParam
      })
    } else {
      // Get safe low gas price by default
      return this._ethereumClient
        .getGasPricesGWei()
        .then(gasPricesGWei => {
          return {
            initialGasPrice: gasPricesGWei[this._gasPriceDefault].mul(1e9),
            fastGasPrice: gasPricesGWei['fast'].mul(1e9)
          }
        })
    }
  }

  // FIXME: I removed the retry as an easy fix for the problem described in DX-553
  async _doTransactionWithoutRetry ({
    resolve,
    reject,
    gasPrice,
    maxGasWillingToPay,
    operation,
    from,
    params,
    gas,
    gasPriceParam, // if manually setted
    nonce
  }) {
    return this
      ._dx[operation](...params, {
        from,
        gas,
        gasPrice
      }).then(result => {
        resolve(result)
      }).catch(error => {
        logger.error({
          msg: 'Error on transaction "%s", from "%s". Params: [%s]. Gas: %d, GasPrice: %d. Error: %s',
          params: [operation, from, params, gas, gasPrice, error],
          error
        })

        reject(error)
      })
  }

  async _doTransactionWithRetry ({
    resolve,
    reject,
    gasPrice,
    maxGasWillingToPay,
    operation,
    from,
    params,
    gas,
    gasPriceParam, // if manually setted
    nonce
  }) {
    let timer
    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
      }
    }

    let transactionPromise = this
      ._dx[operation](...params, {
        from,
        gas,
        gasPrice,
        nonce
      }).then(result => {
        clearTimer()
        resolve(result)
      }).catch(error => {
        clearTimer()

        logger.error({
          msg: 'Error on transaction "%s", from "%s". Params: [%s]. Gas: %d, GasPrice: %d. Error: %s',
          params: [operation, from, params, gas, gasPrice, error],
          error
        })

        reject(error)
      })

    timer = setTimeout(async () => {
      let newGasPrice = gasPrice * this._gasRetryIncrement

      // If fastGasPrice increases we update the maxGasWillingToPay
      const { fastGasPrice } = await this._getGasPrices(gasPriceParam)
      let newMaxGasWillingToPay = fastGasPrice > maxGasWillingToPay
        ? fastGasPrice * this._overFastPriceFactor
        : maxGasWillingToPay

      if (newGasPrice < newMaxGasWillingToPay) {
        logger.info({
          msg: 'Transaction with nonce %d is taking too long (%d min), retrying "%s" from "%s" with higher gas. Previous gas: %d, new gas price: %d. Params: [%s]',
          params: [nonce, (this._transactionRetryTime / 60000), operation, from, gasPrice, newGasPrice, params]
        })

        this._doTransactionWithRetry({
          resolve,
          reject,
          gasPrice: newGasPrice,
          maxGasWillingToPay: newMaxGasWillingToPay,
          operation,
          from,
          params,
          gas,
          nonce
        })
      } else {
        logger.info({
          msg: 'Transaction with nonce %d took too long. Max gas price reached, current gas price: %d, max gas willing to pay: %d, waiting transaction for "%s" from "%s". Params: [%s]',
          params: [nonce, gasPrice, newMaxGasWillingToPay, operation, from, params]
        })

        transactionPromise
          .then(resolve)
          .catch(reject)
      }
    }, this._transactionRetryTime)
  }

  async _getTime () {
    let now
    if (isLocal) {
      now = await this._ethereumClient.geLastBlockTime()
    } else {
      now = new Date()
    }

    return now
  }
}

function toFraction ([numerator, denominator]) {
  // console.log('toFracton', numerator.toString(10), denominator.toString(10))
  // the contract return 0/0 when something is undetermined
  if (numerator.isZero() && denominator.isZero()) {
    return null
  } else {
    return { numerator, denominator }
  }
}

/*
function _toOrderFromEvent (event) {
  logger.debug('Event: %s', event)
  return {
    auctionIdex: 1
  }
}

function _toClearedAuctionFromEvent (event) {
  return event.args
}

function _toClearedAuctionFromEvent (event) {
  return event.args
}
*/

// function _toEventData(event) {
//   return event.args
// }

// function toTransactionNumber (transactionResult) {
//   return transactionResult.tx
// }

function epochToDate (epoch) {
  return new Date(epoch * 1000)
}

function assertPair (sellToken, buyToken) {
  assert(sellToken, 'The sell token is required')
  assert(buyToken, 'The buy token is required')
}

function assertAuction (sellToken, buyToken, auctionIndex) {
  assertPair(sellToken, buyToken)
  assert(auctionIndex >= 0, 'The auction index is invalid')
}

module.exports = AuctionRepoImpl
