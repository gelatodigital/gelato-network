const loggerNamespace = 'dx-service:repositories:ArbitrageRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
const Cacheable = require('../../helpers/Cacheable')
const assert = require('assert')

const HEXADECIMAL_REGEX = /0[xX][0-9a-fA-F]+/

// Caches the arbitrage contracts once loaded
const ARBITRAGE_CONTRACT_CACHE = {}

class ArbitrageRepoImpl extends Cacheable {
  constructor ({
    ethereumRepo,
    ethereumClient,
    contracts,
    arbitrageContractAbi,
    localArbitrageAddress,
    // Cache
    cacheConf,
    // Gas
    // defaultGas = 6700000,
    gasPriceDefault = 'fast', // safeLow, average, fast
    // Retry
    overFastPriceFactor = 1,
    gasEstimationCorrectionFactor = 2
  }) {
    super({
      cacheConf,
      cacheName: 'ArbitrageRepo'
    })
    assert(ethereumClient, '"ethereumClient" is required')
    assert(contracts, '"contracts" is required')

    this._ethereumRepo = ethereumRepo
    this._ethereumClient = ethereumClient
    // this._defaultGas = defaultGas
    this._overFastPriceFactor = overFastPriceFactor
    this._gasEstimationCorrectionFactor = gasEstimationCorrectionFactor
    this._gasPriceDefault = gasPriceDefault
    this._BLOCKS_MINED_IN_24H = ethereumClient.toBlocksFromSecondsEst(24 * 60 * 60)

    // Contracts
    this._arbitrageContractAbi = arbitrageContractAbi
    this._localArbitrageAddress = localArbitrageAddress
    this._uniswapFactory = contracts.uniswapFactory
    this._uniswapExchange = contracts.uniswapExchange
    this._tokens = Object.assign({
      GNO: contracts.gno,
      WETH: contracts.eth,
      MGN: contracts.mgn,
      OWL: contracts.owl
    }, contracts.erc20TokenContracts)

    // logger.debug({
    //   msg: `Arbitrage contract in address %s`,
    //   params: [ this._arbitrage.address ]
    // })

    this.ready = Promise.resolve()
    Object.keys(this._tokens).forEach(token => {
      const contract = this._tokens[token]
      logger.debug({
        msg: `Token %s in address %s`,
        params: [ token, contract.address ]
      })
    })
  }

  getArbitrageAddress () {
    return this._arbitrage.address
  }

  _loadArbitrageContract ({ arbitrageContractAddress }) {
    let ArbitrageContract = ARBITRAGE_CONTRACT_CACHE[arbitrageContractAddress]
    if (!ArbitrageContract) {
      ArbitrageContract = this._arbitrageContractAbi

      ARBITRAGE_CONTRACT_CACHE[arbitrageContractAddress] = ArbitrageContract
    }

    return ArbitrageContract.at(arbitrageContractAddress)
  }

  async owner (arbitrageContractAddress) {
    const arbitrage = this._loadArbitrageContract({ arbitrageContractAddress })
    return arbitrage.owner.call()
  }

  async getUniswapExchange (uniswapExchangeAddress) {
    const uniswapExchangeInstance = this._uniswapExchange.at(uniswapExchangeAddress)
    return uniswapExchangeInstance
  }

  async getEthToTokenInputPrice (token, amount) {
    assert(token, 'The token is required')
    assert(amount > 0, 'The amount is required and must be greater than 0')

    const tokenAddress = this._getTokenAddress(token)
    const uniswapExchangeAddress = await this._uniswapFactory.getExchange.call(tokenAddress)
    const uniswapExchangeInstance = await this.getUniswapExchange(uniswapExchangeAddress)
    return uniswapExchangeInstance.getEthToTokenInputPrice(amount)
  }

  async getTokenToEthInputPrice (token, amount) {
    assert(token, 'The token is required')
    assert(amount > 0, 'The amount is required and must be greater than 0')

    const tokenAddress = this._getTokenAddress(token)
    const uniswapExchangeAddress = await this._uniswapFactory.getExchange.call(tokenAddress)
    const uniswapExchangeInstance = await this.getUniswapExchange(uniswapExchangeAddress)
    return uniswapExchangeInstance.getTokenToEthInputPrice(amount)
  }

  _assertOneTokenIsEth ({ sellToken, buyToken }) {
    const etherTokenAddress = this._tokens.WETH.address
    // At least one of the tokens must be WETH
    assert(
      sellToken.toLowerCase() === etherTokenAddress.toLowerCase() ||
      buyToken.toLowerCase() === etherTokenAddress.toLowerCase() ||
      sellToken === 'WETH' ||
      buyToken === 'WETH',
      'Not prepared to do ERC20 to ERC20 arbitrage ')
  }

  _getTokenContractBySymbol (token) {
    const tokenContract = this._tokens[token]
    if (!tokenContract) {
      const knownTokens = Object.keys(this._tokens)
      const error = new Error(`Unknown token ${token}. Known tokens are ${knownTokens}. Otherwise use the token address`)
      error.type = 'UNKNOWN_TOKEN'
      error.status = 404
      throw error
    }
    return tokenContract
  }

  _getTokenAddress (token) {
    if (HEXADECIMAL_REGEX.test(token)) {
      return token
    }

    const tokenAddress = this._getTokenContractBySymbol(token).address

    return tokenAddress
  }

  isTokenEth (token) {
    return token === 'WETH' ||
      token.toLowerCase() === this._tokens.WETH.address.toLowerCase()
  }

  async getUniswapBalances ({ sellToken, buyToken }) {
    this._assertOneTokenIsEth({ sellToken, buyToken })

    // After asserting that one token is ETH we check if ETH is the sellToken
    const isSellTokenEth = this.isTokenEth(sellToken)
    const token = isSellTokenEth ? buyToken : sellToken
    const tokenAddress = this._getTokenAddress(token)
    const uniswapExchangeAddress = await this._uniswapFactory.getExchange.call(tokenAddress)
    // We get etherBalance and tokenBalance
    const etherBalance = await this._ethereumClient.balanceOf(uniswapExchangeAddress)
    const tokenBalance = await this._ethereumRepo.tokenBalanceOf({
      tokenAddress: tokenAddress,
      account: uniswapExchangeAddress
    })
    // buyToken is exchanged for sellToken, sellToken is inputToken, buyToken is outputToken

    if (isSellTokenEth) {
      // if sellToken is etherToken then buyToken is tokenToken.
      // etherToken is used as inputToken that will be exchanged for tokenToken outputToken
      return {
        inputBalance: etherBalance,
        outputBalance: tokenBalance
      }
    } else {
      return {
        inputBalance: tokenBalance,
        outputBalance: etherBalance
      }
    }
  }

  async transferToken ({ token, amount, from, arbitrageContractAddress }) {
    assert(token, 'The token param is required')
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    const tokenAddress = this._getTokenAddress(token)

    return this._doTransaction({
      operation: 'transferToken',
      from,
      arbitrageContractAddress,
      params: [tokenAddress, amount]
    })
  }

  async claimBuyerFunds ({ token, auctionIndex, from, arbitrageContractAddress }) {
    assert(token, 'The token param is required')
    assert(from, 'The from param is required')
    assert(auctionIndex, 'The auctionId is required')

    const tokenAddress = this._getTokenAddress(token)

    return this._doTransaction({
      operation: 'claimBuyerFunds',
      from,
      arbitrageContractAddress,
      params: [tokenAddress, auctionIndex]
    })
  }

  async withdrawToken ({ token, amount, from, arbitrageContractAddress }) {
    assert(token, 'The token param is required')
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    const tokenAddress = this._getTokenAddress(token)

    return this._doTransaction({
      operation: 'withdrawToken',
      from,
      arbitrageContractAddress,
      params: [tokenAddress, amount]
    })
  }

  async withdrawEther ({ amount, from, arbitrageContractAddress }) {
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    return this._doTransaction({
      operation: 'withdrawEther',
      from,
      arbitrageContractAddress,
      params: [amount]
    })
  }

  async withdrawEtherThenTransfer ({ amount, from, arbitrageContractAddress }) {
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    return this._doTransaction({
      operation: 'withdrawEtherThenTransfer',
      from,
      arbitrageContractAddress,
      params: [amount]
    })
  }

  async transferEther ({ amount, from, arbitrageContractAddress }) {
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    return this._doTransaction({
      operation: 'transferEther',
      from,
      arbitrageContractAddress,
      params: [amount]
    })
  }

  async transferOwnership ({ newOwner, arbitrageAddress, from }) {
    assert(newOwner, 'The newOwner param is required')
    assert(arbitrageAddress, 'The arbitrageAddress is required')
    assert(from, 'The from param is required')

    return this._doTransaction({
      operation: 'transferOwnership',
      from,
      arbitrageContractAddress: arbitrageAddress,
      params: [newOwner]
    })
  }

  async dutchOpportunity ({ arbToken, amount, from, arbitrageContractAddress }) {
    assert(arbToken, 'The arbToken param is required')
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    const tokenAddress = this._getTokenAddress(arbToken)

    return this._doTransaction({
      operation: 'dutchOpportunity',
      from,
      arbitrageContractAddress,
      params: [tokenAddress, amount]
    })
  }

  async uniswapOpportunity ({ arbToken, amount, from, arbitrageContractAddress }) {
    assert(arbToken, 'The arbToken param is required')
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    const tokenAddress = this._getTokenAddress(arbToken)

    return this._doTransaction({
      operation: 'uniswapOpportunity',
      from,
      arbitrageContractAddress,
      params: [tokenAddress, amount]
    })
  }

  async getOwner ({ arbitrageContractAddress }) {
    assert(arbitrageContractAddress, 'The arbitrageContractAddress is required')

    return this._doCall({
      operation: 'owner',
      arbitrageContractAddress
    })
  }

  async approveToken ({ token, allowance, from, arbitrageContractAddress }) {
    assert(token, 'The token param is required')
    assert(from, 'The from param is required')
    assert(allowance >= 0, 'The allowance is required')

    const tokenAddress = this._getTokenAddress(token)

    return this._doTransaction({
      operation: 'approveToken',
      from,
      arbitrageContractAddress,
      params: [ tokenAddress, allowance ]
    })
  }

  async depositToken ({ token, amount, from, arbitrageContractAddress }) {
    assert(token, 'The token param is required')
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    const tokenAddress = this._getTokenAddress(token)

    return this._doTransaction({
      operation: 'depositToken',
      from,
      arbitrageContractAddress,
      params: [tokenAddress, amount]
    })
  }

  async depositEther ({ amount, from, arbitrageContractAddress }) {
    assert(from, 'The from param is required')
    assert(amount >= 0, 'The amount is required')

    return this._doTransaction({
      operation: 'depositEther',
      from,
      arbitrageContractAddress,
      value: amount
    })
  }

  async _doCall ({
    operation,
    params,
    cacheTime = this._cacheTimeShort
  }) {
    // NOTE: cacheTime can be set null/0 on porpouse, so it's handled from the
    //  caller method
    params = params || []
    logger.debug('Transaction: ' + operation, params)
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
    logger.debug('Fetching from blockchain: ' + operation, params)
    return this._arbitrage[operation]
      .call(...params)
      .catch(e => {
        logger.error({
          msg: 'ERROR: Call %s with params: [%s]',
          params: [ operation, params.join(', ') ],
          e
        })
        throw e
      })
  }

  _getCacheKey ({ operation, params }) {
    return operation + ':' + params.join('-')
  }

  async _doTransaction ({
    operation,
    from,
    gasPrice: gasPriceParam,
    arbitrageContractAddress,
    params,
    value
  }) {
    value = value || '0'
    params = params || []
    logger.debug({
      msg: '_doTransaction: \n%O',
      params: [
        operation,
        from,
        params,
        value
      ]
    })

    let gasPricePromise = this._getGasPrices(gasPriceParam)

    const arbitrage = await this._loadArbitrageContract({ arbitrageContractAddress })

    const [ gasPrices, estimatedGas ] = await Promise.all([
      // Get gasPrice
      gasPricePromise,

      // Estimate gas
      arbitrage[operation]
        .estimateGas(...params, { from, value })
    ])

    const { initialGasPrice, fastGasPrice } = gasPrices

    logger.debug({
      msg: '_doTransaction. Estimated gas for "%s": %d',
      params: [ operation, estimatedGas ]
    })
    logger.debug({
      msg: 'Initial gas price is set to %d by %s',
      params: [ initialGasPrice, this._gasPriceDefault ]
    })
    const gas = Math.ceil(estimatedGas * this._gasEstimationCorrectionFactor)
    const maxGasWillingToPay = fastGasPrice * this._overFastPriceFactor

    return new Promise((resolve, reject) => {
      // Do transaction, with no retry
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
        arbitrageContractAddress,
        nonce: undefined,
        value
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

  async _doTransactionWithoutRetry ({
    resolve,
    reject,
    gasPrice,
    maxGasWillingToPay,
    operation,
    from,
    params,
    gas,
    arbitrageContractAddress,
    gasPriceParam, // if manually set
    nonce,
    value
  }) {
    const arbitrage = await this._loadArbitrageContract({ arbitrageContractAddress })

    return arbitrage[operation](...params, {
      from,
      gas,
      gasPrice,
      value
    }).then(result => {
      resolve(result)
    }).catch(error => {
      logger.error({
        msg: 'Error on transaction "%s", from "%s". Params: [%s]. Gas: %d, GasPrice: %d. Value: %d. Error: %s',
        params: [ operation, from, params, gas, gasPrice, value, error ],
        error
      })

      reject(error)
    })
  }
}

module.exports = ArbitrageRepoImpl
