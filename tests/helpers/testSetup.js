// TODO: Move amd refactor logic into DxTradeService.
const debug = require('debug')('DEBUG-dx-service:tests:helpers:testSetup')
debug.log = console.debug.bind(console)

console.log('%%% I am in  ./tests/helpers/testSetup.js%%%')

const instanceFactory = require('../../src/helpers/instanceFactory')
const getAddress = require('../../src/helpers/getAddress')
const BigNumber = require('bignumber.js')

const numberUtil = require('../../src/helpers/numberUtil')
const printStateNew = require('../../src/cli/helpers/printState')

// const environment = process.env.NODE_ENV
// const isLocal = environment === 'local'

const NUM_TEST_USERS = 1
const INITIAL_AMOUNTS = {
  WETH: 20,
  GNO: 750,
  // OWL: 1000,
  MGN: 0,
  RDN: 12000,
  OMG: 1500
}

const baseConfig = {
  AUCTION_REPO: {
    factory: 'src/repositories/AuctionRepo/AuctionRepoImpl'
  }
}

// const balanceProps = ['token', 'balance']

async function getContracts ({ ethereumClient, auctionRepo, dxPriceOracle }) {
  return {
    dx: auctionRepo._dx,
    dxPriceOracle: dxPriceOracle._dxPriceOracle,
    priceOracle: auctionRepo._priceOracle,
    tokens: auctionRepo._tokens,
    // the following address are just for debuging porpouses
    dxMaster: auctionRepo._dxMaster
  }
}

async function getHelpers ({ ethereumClient, dxInfoService, auctionRepo, ethereumRepo, config }, { dx, dxMaster, priceOracle, tokens }) {
  // const address = await ethereumClient.doCall({ propName: 'eth.getCoinbase' })
  const accounts = await ethereumClient.getAccounts()
  const web3 = ethereumClient.getWeb3()
  const [ owner, user1, user2 ] = accounts
  const botAccount = await getAddress(0)

  const supportedTokens = config.MARKETS.reduce((acc, market) => {
    if (!acc.includes(market.tokenA)) acc.push(market.tokenA)
    if (!acc.includes(market.tokenB)) acc.push(market.tokenB)
    return acc
  }, [])

  async function setAuctionRunningAndFundUser ({ sellToken = 'WETH', buyToken = 'RDN' }) {
    const tokenPair = { sellToken, buyToken }
    const ethBalance = await auctionRepo.getBalance({
      token: 'WETH',
      address: user1
    })
    if (ethBalance.lessThan(5 * 1e18)) {
      debug("The user1 doesn't have so much coin. Let's give him some :)")
      await fundUser1()
    } else {
      debug('The user1 is wealthy enough :)')
    }

    const isValidTokenPair = await auctionRepo.isValidTokenPair({
      tokenA: sellToken,
      tokenB: buyToken
    })
    if (!isValidTokenPair) {
      debug("The %s-%s market was not approved. Let's add the token pair",
        sellToken, buyToken)
      await addTokens()
    } else {
      debug('The %s-%s market was approved. Nothing to do',
        sellToken, buyToken)
    }

    await printBalances({ accountName: 'User 1', account: user1, verbose: true })
    await printState('Intial state of the auction', tokenPair)

    const state = await auctionRepo.getState(tokenPair)
    if (state === 'WAITING_FOR_AUCTION_TO_START') {
      await printTime('We are waiting for the auction to start')
      const now = await ethereumClient.geLastBlockTime()
      const auctionStart = await auctionRepo.getAuctionStart(tokenPair)
      const secondsToStart = (auctionStart.getTime() - now.getTime()) / 1000
      await ethereumClient.increaseTime(secondsToStart)
      const numHours = (secondsToStart / 3600).toFixed(2)
      await printTime(`Let time to go by ${numHours} hours`)
    } else if (state === 'WAITING_FOR_FUNDING') {
      debug("We are in a waiting for funding period, let's wait for the bots to do their job")
      await delay(() => {
        debug("Let's continue...")
      }, 31000)
    } else if (state === 'RUNNING') {
      debug('The auction is curently running')
    } else {
      // Clear both auctions
      await clearAuction({ sellToken, buyToken })
      await clearAuction({ sellToken: buyToken, buyToken: sellToken })
    }

    await printState('State after setup', { buyToken, sellToken })
  }

  async function clearAuction ({ sellToken, buyToken }) {
    const auctionIndex = await auctionRepo.getAuctionIndex({ sellToken, buyToken })
    const outstandingVolume = await auctionRepo.getOutstandingVolume({
      sellToken,
      buyToken,
      auctionIndex
    })

    debug('Clear %s-%s auction', sellToken, buyToken)
    if (outstandingVolume.greaterThan(0)) {
      const amount = outstandingVolume.div(1e18)
      debug('We need to buy %d %s in %s-%s', amount,
        buyToken, sellToken, buyToken)
      await buySell('postBuyOrder', {
        from: user1,
        sellToken,
        buyToken,
        amount
      })
      debug('We bought %d %s in %s-%s', outstandingVolume,
        buyToken, sellToken, buyToken)
    } else {
      debug('The auction %s-%s was already cleared. Nothing to do',
        sellToken, buyToken)
    }

    debug('Auction %s-%s cleared', sellToken, buyToken)
  }

  // helpers
  async function buySell (operation, { from, buyToken, sellToken, amount, auctionIndex = null }) {
    // buy
    if (!auctionIndex) {
      auctionIndex = await auctionRepo.getAuctionIndex({
        buyToken,
        sellToken
      })
    }
    debug(`Token:\n\t${sellToken}-${buyToken}. Auction: ${auctionIndex}`)
    debug(`Auction:\n\t${auctionIndex}`)

    await printState('State before ' + operation, { buyToken, sellToken })

    await auctionRepo[operation]({
      from,
      buyToken,
      sellToken,
      auctionIndex,
      amount: numberUtil.toWei(amount)
    })
    debug(`Succesfull "${operation}" of ${amount} tokens. SellToken: ${sellToken}, BuyToken: ${buyToken} `)
    await printState('State after ' + operation, { buyToken, sellToken })
  }

  async function fundUser1 () {
    debug(`\n**********  Setup DX: Funding, and aproved tokens and Oracle  **********\n`)
    // Deposit 50ETH in the ETH Token
    // const [, ...users] = accounts
    const users = accounts.slice(1, 1 + NUM_TEST_USERS)
    debug('owner: %s', owner)
    debug('users: %s', users.join(', '))

    const initialAmounts = [
      { token: 'WETH', amount: INITIAL_AMOUNTS['WETH'] },
      { token: 'GNO', amount: INITIAL_AMOUNTS['GNO'] }
      // { token: 'OWL', amount: INITIAL_AMOUNTS['OWL'] }
      // { token: 'MGN', amount: 2 },
    ]
    const setAllowances = ['WETH'] // , 'OWL'
    if (supportedTokens.includes('RDN')) {
      setAllowances.push('RDN')
      initialAmounts.push({ token: 'RDN', amount: INITIAL_AMOUNTS['RDN'] })
    }
    if (supportedTokens.includes('OMG')) {
      setAllowances.push('OMG')
      initialAmounts.push({ token: 'OMG', amount: INITIAL_AMOUNTS['OMG'] })
    }
    const depositERC20Tokens = setAllowances.concat(['GNO'])
    // const ethUsdPrice = 1100.0

    function getAmount (token) {
      const amount = initialAmounts
        .find(initialAmount => initialAmount.token === token)
        .amount
      if (!amount) {
        throw new Error('Initial amount is not declared for token ' + token)
      }

      return amount
    }

    // Aprove tokens
    debug('\tAprove tokens:')
    await Promise.all(
      setAllowances.map(token => {
        return auctionRepo
          .approveToken({ token, from: owner })
          .then(() => debug(`\t\t- The "owner" has approved the token "${token}"`))
      })
    )
    debug('\t\t- All tokens has been approved')

    debug('\n\tFunding DX:')
    const userSetupPromises = users.map(async userAddress => {
      const userId = users.indexOf(userAddress) + 1

      // The owner gives some tokens to the users
      await Promise.all(
        depositERC20Tokens
          // We don't need to give ETH to the users (they deposit it)
          .filter(t => t !== 'WETH')
          .map(token => {
            const amount = getAmount(token)

            return auctionRepo.transferERC20Token({
              from: owner,
              to: userAddress,
              token,
              amount: numberUtil.toWei(amount)
            }).then(() => {
              debug('\t\t- "owner" gives "user%d" %d %s as a present', userId, amount, token)
            })
          })
      )

      // User deposits ETH
      const amountETH = getAmount('WETH')
      await auctionRepo.depositEther({
        from: userAddress,
        amount: numberUtil.toWei(amountETH)
      })
      debug('\t\t- "user%d" deposits %d ETH into ETH token', userId, amountETH)

      // Deposit initial amounts
      await Promise.all(initialAmounts.map(({ token }) => {
        const amount = getAmount(token)

        const amountInWei = numberUtil.toWei(amount)
        return auctionRepo.setAllowance({
          from: userAddress,
          token,
          amount: amountInWei
        }).then(() => {
          debug('\t\t- "user%d" aproves DX to take %d %s on his behalf', userId, amount, token)
        })
      }))

      await Promise.all(initialAmounts.map(({ token, amount }) => {
        const amountInWei = numberUtil.toWei(amount)
        // debug('\t\t- "user%d" is about to deposits %d %s in the DX', userId, amount, token)
        return auctionRepo.deposit({
          from: userAddress,
          token,
          amount: amountInWei
        }).then(() => {
          debug('\t\t- "user%d" deposits %d %s in the DX', userId, amount, token)
        })
      }))
    })

    // Do funding
    await Promise.all(userSetupPromises)
    debug('\t\t- All users has deposited the %s tokens in the DX\n',
      depositERC20Tokens.join(', '))

    // I don't understand why we need this
    // TODO: Revview "testFunction" in DX
    /*
    debug('\n\tFunding DX:')
    const priceFeedSource = await priceOracle.priceFeedSource.call()
    await priceFeed.post(
      web3.toWei(ethUsdPrice),
      1516168838 * 2,
      priceFeedSource,
      { from: owner }
    )
    */

    debug('\n**************************************\n\n')
  }

  async function printTime (message) {
    const time = await ethereumClient.geLastBlockTime()
    debug(message + ':\t', time.toUTCString())
  }

  async function printState (message, tokenPair) {
    const now = await ethereumClient.geLastBlockTime()
    const marketDetails = await dxInfoService.getMarketDetails(tokenPair)
    printStateNew({
      message,
      tokenPair,
      logger: {
        info: debug
      },
      now,
      marketDetails
    })
  }

  async function printAddresses () {
    debug(`\n**********  Addresses  **********\n`)
    // debug('\n\tUsers:')
    const users = {
      /*
      'Owner': owner,
      'User 1': user1,
      'User 2': user2
      */
      'owner': owner,
      'user1': user1,
      'user2': user2
    }
    Object.keys(users).forEach(name => {
      // debug('\t\t-%s: %s', name, users[name])
      debug("var %s = '%s'", name, users[name])
    })

    // Print token addresses
    // debug('\n\tToken Addresses:')
    const tokens = await auctionRepo.getTokens()
    await Promise.all(
      tokens.map(async token => {
        const tokenAddress = await auctionRepo.getTokenAddress({ token })
        // debug('var %s: %s', token.toLowerCase(), tokenAddress)
        debug("var %sAddress = '%s'", token.toLowerCase(), tokenAddress)
      })
    )

    // debug('\n\tContract Addresses:')
    const contracts = {
      /*
      'DX (proxy)': dx.address,
      'DX (master)': dxMaster.address,
      'Price Oracle': priceOracle.address
      */
      'dxAddress': dx.address,
      'dxMasterAddress': dxMaster ? dxMaster.address : 'DX master address not public :(',
      'priceOracleAddress': priceOracle.address
    }
    Object.keys(contracts).forEach(name => {
      // debug('\t\t- %s: \t%s', name, contracts[name])
      debug("var %s = '%s'", name, contracts[name])
    })

    debug(`
var formatFromWei = n => web3.fromWei(n, 'ether').toNumber()

var dx = DutchExchange.at(dxAddress)
var dxMaster = DutchExchange.at(dxMasterAddress)
var priceOracle = PriceOracleInterface.at(priceOracleAddress)

var eth = EtherToken.at(ethAddress)
var rdn = Token.at(rdnAddress)
var omg = Token.at(omgAddress)


dx.sellVolumesCurrent(ethAddress, rdnAddress).then(formatFromWei)
eth.balanceOf(user1).then(formatFromWei)
eth.allowance(user1, dxAddress).then(formatFromWei)
dx.deposit(ethAddress, web3.toWei(1, 'ether'), { from: user1 })
dx.balances(ethAddress, user1).then(formatFromWei)
priceOracle.getUSDETHPrice().then(formatFromWei)
      `)

    debug('\n**************************************\n\n')
  }

  async function printBalances ({
    accountName = 'owner',
    account = botAccount,
    verbose = true
  }) {
    debug(`\n**********  Balance for ${accountName}  **********\n`)
    const balanceETH = await ethereumRepo.balanceOf({ account })
    debug('\tACCOUNT: %s', account)
    debug('\tBALANCE: %d ETH', formatFromWei(balanceETH))

    const tokens = await auctionRepo.getTokens()
    const balances = await Promise.all(
      tokens.map(async token => {
        const tokenAddress = await auctionRepo.getTokenAddress({ token })

        return Promise
          .all([
            // get token balance
            ethereumRepo.tokenBalanceOf({ tokenAddress, account }),
            ethereumRepo.tokenAllowance({
              tokenAddress,
              owner: account,
              spender: dx.address
            }),
            ethereumRepo.tokenTotalSupply({ tokenAddress }),
            // get token balance in DX
            auctionRepo.getBalance({ token, address: account })
          ])
          .then(async ([ amount, allowance, totalSupply, amountInDx ]) => {
            const priceUsdInDx = await auctionRepo
              .getPriceInUSD({
                token, amount: amountInDx
              })
              .then(price => price.toFixed(2))
              .catch(() => '???')

            const priceUsd = await auctionRepo
              .getPriceInUSD({ token, amount })
              .then(price => price.toFixed(2))
              .catch(() => '???')

            return {
              tokenAddress,
              token,
              amount,
              allowance,
              totalSupply,
              amountInDx,
              priceUsdInDx,
              priceUsd
            }
          })
      }))

    balances.forEach(balance => {
      debug('\n\tBalances %s:', balance.token)
      debug(
        '\t\t- Balance in DX: %s (%s USD)',
        formatFromWei(balance.amountInDx),
        balance.priceUsdInDx
      )
      debug(
        '\t\t- Balance of user: %s (%s USD)',
        formatFromWei(balance.amount),
        balance.priceUsd
      )

      if (verbose) {
        debug('\t\t- Approved for DX: ' + formatFromWei(balance.allowance))
        debug('\t\t- Token Supply: ' + formatFromWei(balance.totalSupply))
        // console.log('\t\t- Token address: ' + balance.tokenAddress)
      }
    })
    debug('\n**************************************\n\n')
  }

  function formatFromWei (wei) {
    let weiAux
    if (numberUtil.isBigNumber(wei)) {
      weiAux = wei.toString()
    } else {
      weiAux = wei
    }
    return numberUtil.fromWei(weiAux)
  }

  async function printOraclePrice (message, { token }) {
    const isApproved = await auctionRepo.isApprovedToken({ token })

    if (isApproved) {
      const hasPrice = await auctionRepo.hasPrice({ token })

      if (hasPrice) {
        const priceToken = await auctionRepo.getPriceInEth({ token })
        debug('%s%s: %d ETH/%s',
          message, token, fractionFormatter(priceToken), token)
      } else {
        debug(`\t\t- %s: The token has no price because the market %s-ETH\
 doesn't exist yet`, token, token)
      }
    } else {
      debug('\t\t- %s: The token is not approved yet, so it cannot have price', token)
    }
  }

  async function addTokenPair ({ accountName, from, tokenA, tokenB, tokenAFunding, tokenBFunding, initialClosingPrice }) {
    const tokenABalance = await auctionRepo.getBalance({
      token: tokenA,
      address: from
    })
    const tokenBBalance = await auctionRepo.getBalance({
      token: tokenB,
      address: from
    })
    // const ethUsdPrice = await auctionRepo.getBalance({ token: tokenB })

    debug(`\n**********  "${accountName}" ads a new token pair  **********\n`)
    debug('\tMarket to add:')
    debug('\t\t- Market: %s-%s', tokenA, tokenB)
    debug('\t\t- %d %s. The user has a balance of %d %s',
      formatFromWei(tokenAFunding), tokenA, formatFromWei(tokenABalance), tokenA)
    debug('\t\t- %d %s. The user has a balance of %d %s',
      formatFromWei(tokenBFunding), tokenB, formatFromWei(tokenBBalance), tokenB)
    debug('\t\t- Initial price: %d', fractionFormatter(initialClosingPrice))
    debug('\t\t- From: %s (%s)', accountName, from)

    debug('\n\tPrice Oracle:')
    await printOraclePrice('\t\t- ', { token: tokenA })
    await printOraclePrice('\t\t- ', { token: tokenB })
    debug()

    const result = await auctionRepo.addTokenPair({
      from,
      tokenA,
      tokenAFunding,
      tokenB,
      tokenBFunding,
      initialClosingPrice
    })
    debug('\n\tResult:')
    debug('\t\t- Successfully added the token pair. Transaction : %s', result)

    debug('\n**************************************\n\n')

    // return result
  }

  async function deposit ({ account, token, amount }) {
    debug(`\n**********  Deposit ${token} for ${account}  **********\n`)
    let balance = await auctionRepo.getBalance({
      token,
      address: account
    })

    debug('\n\tPrevious balance:')
    debug('\t\t- %s: %d', token, formatFromWei(balance))

    debug('\n\tAmount to deposit:')
    debug('\t\t- %s: %d', token, amount)

    // do the deposit
    await auctionRepo.deposit({
      token,
      amount: numberUtil.toWei(amount),
      from: account
    })

    debug('\n\tNew balance:')
    balance = await auctionRepo.getBalance({ token: token, address: account })
    debug('\t\t- %s: %d', token, formatFromWei(balance))

    debug('\n**************************************\n\n')
  }

  async function addTokens () {
    if (supportedTokens.includes('RDN')) {
      return addTokenPair({
        accountName: 'user1',
        from: user1,
        tokenA: 'RDN',
        tokenAFunding: 0,
        tokenB: 'WETH',
        tokenBFunding: numberUtil.toWei(13.123),
        initialClosingPrice: {
          numerator: 4079,
          denominator: 1000000
        }
      })
    } else {
      throw new Error('RDN is not supported')
    }

    /*
    await addTokenPair({
      tokenA: 'OMG',
      tokenAFunding: 0,
      tokenB: 'ETH',
      tokenBFunding: 20.123,
      initialClosingPrice: {
        numerator: 1279820,
        denominator: 100000000
      }
    })
    */
  }

  return {
    web3,
    botAccount,
    owner,
    user1,
    user2,
    accounts,

    // debug utils
    delay,
    printProps,
    printTime,
    printState,
    printBalances,
    printAddresses,
    fractionFormatter,

    // interact with DX
    setAuctionRunningAndFundUser,
    fundUser1,
    addTokens,
    buySell,
    deposit
  }
}
function printProps (prefix, props, object, formatters) {
  if (object) {
    props.forEach(prop => {
      let value = object[prop]
      if (formatters && formatters[prop]) {
        value = formatters[prop](value)
      }

      debug(`${prefix}${prop}: ${value}`)
    })
  } else {
    debug(`${prefix}${object}`)
  }
}

function fractionFormatter (fraction) {
  if (fraction === null) {
    return null
  } else {
    const fractionBigNumber = {
      numerator: new BigNumber(fraction.numerator),
      denominator: new BigNumber(fraction.denominator)
    }

    return fractionBigNumber
      .numerator
      .div(fractionBigNumber.denominator)
      .toNumber()
  }
}
/*
function fractionFormatter ({ numerator, denominator }) {
  const fraction = {
    numerator: new BigNumber(numerator),
    denominator: new BigNumber(denominator)
  }

  if (fraction.numerator.isZero() && fraction.denominator.isZero()) {
    return 0
  } else {
    return fraction
      .numerator
      .div(fraction.denominator)
      .toNumber()
  }
}
*/

async function delay (callback, mills) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(callback())
    }, mills)
  })
}

/*
function weiToEth (wei) {
  return new BigNumber(wei).div(10 ** 18)
}
*/

function testSetup ({ config = baseConfig } = {}) {
  return instanceFactory({ test: true, config })
    .then(async instances => {
      const contracts = await getContracts(instances)
      const helpers = await getHelpers(instances, contracts)
      return Object.assign({}, contracts, helpers, instances)
    })
}

module.exports = testSetup
