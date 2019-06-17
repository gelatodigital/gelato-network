const loggerNamespace = 'dx-service:repositories:EthereumRepoImpl'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)
const Cacheable = require('../../helpers/Cacheable')
const assert = require('assert')
const formatUtil = require('../../helpers/formatUtil')
const { isHexAddress } = formatUtil
// const AuctionLogger = require('../../helpers/AuctionLogger')
// const auctionLogger = new AuctionLogger(loggerNamespace)

// See: https://github.com/ethereum/eips/issues/20
const erc20Abi = require('./abi/erc20Abi')
const erc20AlternativeAbi = require('./abi/erc20AlternativeAbi')
const tokenContractsCache = {}

class EthereumRepoImpl extends Cacheable {
  constructor ({
    ethereumClient,
    web3,
    cacheConf
  }) {
    super({
      cacheConf,
      cacheName: 'EthereumRepo'
    })
    assert(ethereumClient, '"ethereumClient" is required')
    assert(web3, '"web3" is required')

    this._ethereumClient = ethereumClient
    this._web3 = web3
    this._erc20Contract = this._web3.eth.contract(erc20Abi)
  }

  async isConnected () {
    return this._ethereumClient.isConnected()
  }

  async isSyncing () {
    return this._ethereumClient.isSyncing()
  }

  async getAccounts () {
    return this._ethereumClient.getAccounts()
  }

  async getHealth () {
    return Promise
      .all([
        // this._ethereumClient.doCall({ propName: 'isConnected' })
        this._ethereumClient.doCall({ propName: 'version.getNode' }),
        this._ethereumClient.doCall({ propName: 'net.getListening' }),
        this._ethereumClient.doCall({ propName: 'version.getNetwork' }),
        this._ethereumClient.getBlockNumber(),
        this._ethereumClient.geLastBlockTime(),
        this._ethereumClient.doCall({ propName: 'net.getPeerCount' })
        // FIXME: Fails because promisfy mess up with the "this" so "this" is undefined instead of "web3.eth"
        // this._ethereumClient.doCall({ propName: 'eth.isSyncing' })
      ]).then(([
        node,
        isListening,
        network,
        lastBlockNumber,
        lastBlockTime,
        peerCount
        // isSyncing
      ]) => ({
        node,
        host: this._ethereumClient.getUrl(),
        isListening,
        network,
        lastBlockNumber,
        lastBlockTime,
        peerCount
        // isSyncing,
      }))
    /*
    return {
      node: this._ethereumClient._web3.version.node,

      isConnected: await this._ethereumClient.doCall({ propName: 'isConnected' }),

      isSyncing: await
      network: await this._ethereumClient.doCall({ propName: 'version.getNetwork' }),
      ethereumVersion: await this._ethereumClient.doCall({ propName: 'version.ethereum' }),
      whisperVersion: await this._ethereumClient.doCall({ propName: 'version.whisper' }),
      peerCount: await this._ethereumClient.doCall({ propName: 'eth.getPeerCount' })
    }
    */
  }

  async getGasPricesGWei () {
    // this._ethereumClient.doCall({ propName: 'eth.gasPrice' })
    return this._ethereumClient.getGasPricesGWei()
  }

  async getTransactionReceipt (transactionHash) {
    return this._ethereumClient.doCall({
      propName: 'eth.getTransactionReceipt',
      params: [ transactionHash ]
    })
  }

  async getTransaction (transactionHash) {
    return this._ethereumClient.doCall({
      propName: 'eth.getTransaction',
      params: [ transactionHash ]
    })
  }

  async getAbout () {
    return Promise
      .all([
        this._ethereumClient.doCall({ propName: 'version.getNode' }),
        this._ethereumClient.doCall({ propName: 'version.getNetwork' }),
        this._ethereumClient.doCall({ propName: 'version.getEthereum' })
      ])
      .then(([ node, network, ethereumVersion ]) => ({
        node,
        host: this._ethereumClient.getUrl(),
        network,
        ethereumVersion
      }))
  }

  async balanceOf ({ account }) {
    return this._ethereumClient.balanceOf(account)
  }

  async tokenBalanceOf ({ tokenAddress, account }) {
    logger.debug({
      msg: 'Get balance for token %s and account %s',
      params: [ tokenAddress, account ]
    })
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.balanceOf.call, account)
  }

  async tokenTransfer ({ tokenAddress, account, amount }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.transfer, account, amount)
  }

  async tokenTransferFrom ({ tokenAddress, from, to, amount }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.transferFrom, from, to, amount)
  }

  async tokenApprove ({ tokenAddress, spender, amount }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.approve, spender, amount)
  }

  async tokenAllowance ({ tokenAddress, owner, spender }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.allowance, owner, spender)
  }

  async tokenTotalSupply ({ tokenAddress }) {
    const tokenContract = this._getTokenContract(tokenAddress)
    return promisify(tokenContract.totalSupply)
  }

  async tokenGetInfo ({ tokenAddress }) {
    const fetchFn = () => this._tokenGetInfo({ tokenAddress })
    const cacheKey = 'tokenInfo:' + tokenAddress

    if (this._cache) {
      const that = this
      return this._cache.get({
        key: cacheKey,
        fetchFn,
        time (tokenInfo) {
          if (tokenInfo === undefined) {
            return that._cacheTimeShort
          } else if (tokenInfo === null) {
            return that._cacheTimeAverage
          } else {
            return that._cacheTimeLong
          }
        }
      })
    } else {
      return fetchFn()
    }
  }

  async _tokenGetInfo ({ tokenAddress }) {
    const tokenContract = this._getTokenContract(tokenAddress)

    // Use alternative token contract ABI.
    // Symbol and name are set to bytes32 instead of string
    let _useAlternativeTokenContract = infoField => {
      const alternativeTokenContract = this._getAltAbiTokenContract(tokenAddress)
      return promisify(alternativeTokenContract[infoField]).catch(() => null)
    }

    let _bytesToUtf8 = byteString => {
      let resultString
      byteString && isHexAddress({ token: byteString })
        // If web3 is updated to v1.0 this method should be changed for:
        // web3.utils.hexToUtf8
        ? resultString = this._web3.toUtf8(byteString)
        : resultString = byteString
      return resultString
    }

    // Since symbol, name, decimals are not mandatory
    // any error fetching those data will be ignored, and we just assume
    // no-value.
    //  i.e. DAI defined the symbol as a byte32, so it fails to fetch it using
    //      the ERC20 ABI.
    const [ symbol, name, decimals ] = await Promise.all([
      promisify(tokenContract.symbol).catch(() => {
        return _useAlternativeTokenContract('symbol')
      }),
      promisify(tokenContract.name).catch(() => {
        return _useAlternativeTokenContract('name')
      }),
      promisify(tokenContract.decimals).then(parseInt).catch(() => null)
    ])

    return {
      // TODO remove when ensured using EtherToken contract with WETH symbol
      symbol: symbol !== 'ETH' ? _bytesToUtf8(symbol) : 'WETH',
      name: _bytesToUtf8(name),
      address: tokenAddress,
      decimals
    }
  }

  async getBlock (blockNumber) {
    return this._ethereumClient.getBlock(blockNumber)
  }

  async getFirstBlockAfterDate (date) {
    return this._ethereumClient.getFirstBlockAfterDate(date)
  }

  async getLastBlockBeforeDate (date) {
    return this._ethereumClient.getLastBlockBeforeDate(date)
  }

  _getTokenContract (address) {
    let contract = tokenContractsCache[address]

    if (!contract) {
      contract = this._erc20Contract.at(address)
      tokenContractsCache[address] = contract
    }

    return contract
  }

  _getAltAbiTokenContract (address) {
    return this._web3.eth.contract(erc20AlternativeAbi).at(address)
  }
}

async function promisify (fn, ...params) {
  return new Promise((resolve, reject) => {
    const callback = (error, ...data) => {
      if (error) {
        reject(error)
      } else {
        resolve(...data)
      }
    }
    fn(...params, callback)
  })
}

module.exports = EthereumRepoImpl
