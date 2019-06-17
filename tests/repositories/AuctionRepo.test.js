const debug = require('debug')('tests:repositories:AuctionRepo')
debug.log = console.debug.bind(console)

const testSetup = require('../helpers/testSetup')
const BigNumber = require('bignumber.js')
const numberUtil = require('../../src/helpers/numberUtil.js')

const setupPromise = testSetup()
let currentSnapshotId

beforeEach(async () => {
  const { ethereumClient } = await setupPromise
  currentSnapshotId = await ethereumClient.makeSnapshot()
})

afterEach(async () => {
  const { ethereumClient } = await setupPromise
  return ethereumClient.revertSnapshot(currentSnapshotId)
})

test.skip('It should allow to approve one token', async () => {
  const { auctionRepo, owner } = await setupPromise
  const getIsApprovedRDN = () => auctionRepo.isApprovedToken({
    token: 'RDN'
  })

  // GIVEN a not approved token
  let isRdnApproved = await getIsApprovedRDN()
  expect(isRdnApproved).toBeFalsy()

  // WHEN approve the token
  await auctionRepo.approveToken({
    token: 'RDN', from: owner
  })

  // THEN the token is approved
  isRdnApproved = await getIsApprovedRDN()
  expect(isRdnApproved).toBeTruthy()
})

test.skip('It should fail when unknow token is required', async () => {
  expect.assertions(1)

  const { auctionRepo } = await setupPromise

  const getUnknownToken = () => auctionRepo.getTokenAddress({ token: 'ABC' })
  try {
    await getUnknownToken()
  } catch (e) {
    expect(e).toBeInstanceOf(Error)
  }
})

test.skip('It should return the fee ratio', async () => {
  const { user1, auctionRepo } = await setupPromise
  // GIVEN a base setupTest

  // WHEN we ask for the account fee ratio
  let feeRatio = await auctionRepo.getFeeRatio({ address: user1 })

  // THEN the fee ratio matches MAXIMUM_DX_FEE
  expect(feeRatio).toEqual(MAXIMUM_DX_FEE)
})

describe.skip('Market interacting tests', () => {
  let beforeSetupState

  beforeAll(async () => {
    const { fundUser1, ethereumClient } = await setupPromise

    beforeSetupState = await ethereumClient.makeSnapshot()
    // Avoid seting up test cases for each test
    await fundUser1()
  })

  afterAll(async () => {
    const { ethereumClient } = await setupPromise

    return ethereumClient.revertSnapshot(beforeSetupState)
  })

  test('It should return account balances', async () => {
    const { user1, auctionRepo } = await setupPromise
    // GIVEN a base setupTest

    // WHEN we ask for account balance
    let userBalance = await auctionRepo.getBalances({ address: user1 })

    // THEN the user balance matches INITIAL_USER1_BALANCE
    expect(userBalance).toEqual(INITIAL_USER1_BALANCE)
  })

  test('It should allow to add a new token pair', async () => {
    debug('Launching \'It should allow to add a new token pair\'')
    // GIVEN a not approved token pair
    let isRdnEthApproved = await _getIsApprovedMarket({})
    expect(isRdnEthApproved).toBeFalsy()

    // GIVEN a initial state that shows there haven't been any previous auction
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toEqual(UNKNOWN_PAIR_MARKET_STATE)

    // GIVEN a state status of UNKNOWN_TOKEN_PAIR
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('UNKNOWN_TOKEN_PAIR')

    // WHEN we add a new token pair
    await _addRdnEthTokenPair({})

    // THEN the new state matches the intial market state
    rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(INITIAL_MARKET_STATE)

    // THEN the new state status is WAITING_FOR_AUCTION_TO_START
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the new state status is WAITING_FOR_AUCTION_TO_START
    // for oposite market too
    rdnEthState = await _getState({ sellToken: 'WETH', buyToken: 'RDN' })
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the market is now approved
    isRdnEthApproved = await _getIsApprovedMarket({})
    expect(isRdnEthApproved).toBeTruthy()
  })

  test('It should return added token pairs', async () => {
    debug('Launching \'It should return added token pairs\'')
    const { auctionRepo } = await setupPromise
    // GIVEN a state without token pairs added
    let tokenPairs = await auctionRepo.getTokenPairs()
    expect(tokenPairs.length).toBe(0)

    // WHEN we add a new token pair
    await _addRdnEthTokenPair({})

    // THEN the market is now approved
    tokenPairs = await auctionRepo.getTokenPairs()
    expect(tokenPairs.length).toBe(1)
  })

  // Add funds to auction (sell tokens in auction)
  test('It should allow to add funds to an auction', async () => {
    debug('Launching \'It should allow to add funds to an auction\'')
    const { user1 } = await setupPromise

    // GIVEN a new token pair
    await _addRdnEthTokenPair({})

    // WHEN we add a new sell token order
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('2')
    })

    // THEN the new state matches the intial market state,
    // but with sellVolume != 0 for RDN-WETH
    let updatedAuction = Object.assign({}, INITIAL_MARKET_STATE.auction,
      { sellVolume: {} })
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
    expect(_isValidSellVolume(rdnEthstateInfo.auction.sellVolume, await _toBigNumberWei(2)))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auctionOpp.sellVolume, await _toBigNumberWei(13.123)))
      .toBeTruthy()
  })

  test('It should return seller balance for an auction', async () => {
    const { user1, auctionRepo } = await setupPromise
    // GIVEN a new token pair
    await _addRdnEthTokenPair({})

    // GIVEN an auction where our account sell some tokens
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('2')
    })

    // WHEN we ask for sell balance of an account
    const sellerBalance = await auctionRepo.getSellerBalance({
      sellToken: 'RDN', buyToken: 'WETH', auctionIndex: 1, address: user1
    })

    // THEN the sellBalance matches expected sell balance
    expect(_isValidSellVolume(sellerBalance, await _toBigNumberWei(2)))
      .toBeTruthy()
  })

  test('It should get correct closing state for a not started auction', async () => {
    const { user1, auctionRepo, ethereumClient } = await setupPromise

    // GIVEN a new token pair
    await _addRdnEthTokenPair({ ethFunding: 10 })
    // Fund and close 1 auction
    await _fundAndCloseAuction({ from: user1, ethereumClient })

    // GIVEN an auction where state is WAITING_FOR_FUNDING
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('0.01')
    })
    const auctionState = await auctionRepo.getState({
      sellToken: 'RDN', buyToken: 'WETH'
    })
    expect(auctionState).toBe('WAITING_FOR_FUNDING')

    // WHEN we ask for the auction state
    const { auction, auctionOpp } = await auctionRepo.getStateInfo({
      sellToken: 'RDN', buyToken: 'WETH'
    })

    // THEN both auction sides are not yet marked as TheoreticalClosed
    expect(auction.isTheoreticalClosed)
      .toBeFalsy()
    expect(auctionOpp.isTheoreticalClosed)
      .toBeFalsy()
  })

  test('It should return indices of auctions with claimable tokens for sellers', async () => {
    const { user1, auctionRepo } = await setupPromise

    await _addRdnEthTokenPair({})

    const _getClaimableAuctions = () => auctionRepo.getIndicesWithClaimableTokensForSellers({
      sellToken: 'RDN', buyToken: 'WETH', address: user1, lastNAuctions: 1
    })

    const EXPECTED_CLAIMABLE_AUCTIONS_INDICES = [new BigNumber('1')]

    // GIVEN an auction where we hadn't sell anything
    let claimableAuctions = await _getClaimableAuctions()
    expect(claimableAuctions).not.toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)

    // WHEN we post a sell order
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('2')
    })

    // WHEN we ask for claimable auctions indices
    claimableAuctions = await _getClaimableAuctions()

    // THEN the claimable auctions contain the index of the expected auction
    expect(claimableAuctions).toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)
  })

  test('It should return indices of auctions with claimable tokens for buyers', async () => {
    const { user1, auctionRepo, ethereumClient } = await setupPromise

    await _addRdnEthTokenPair({})
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    const _getClaimableAuctions = () => auctionRepo.getIndicesWithClaimableTokensForBuyers({
      sellToken: 'WETH', buyToken: 'RDN', address: user1, lastNAuctions: 1
    })

    const EXPECTED_CLAIMABLE_AUCTIONS_INDICES = [new BigNumber('1')]

    // GIVEN an auction where we havn't bought anything
    let claimableAuctions = await _getClaimableAuctions()
    expect(claimableAuctions).not.toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)

    // WHEN we post a buy order
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('1')
    })

    // WHEN we ask for claimable auctions indices
    claimableAuctions = await _getClaimableAuctions()

    // THEN the claimable auctions contain the index of the expected auction
    expect(claimableAuctions).toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)
  })

  test('It should claim from several auctions as seller', async () => {
    const { user1, auctionRepo, ethereumClient } = await setupPromise

    await _addRdnEthTokenPair({ ethFunding: 10 })
    // Fund and close 2 auctions where we participate
    // TODO claim from more than 1 auction
    await _fundAndCloseAuction({ from: user1, ethereumClient })

    const _getClaimableAuctions = () => auctionRepo.getIndicesWithClaimableTokensForSellers({
      sellToken: 'RDN', buyToken: 'WETH', address: user1, lastNAuctions: 2
    })

    const EXPECTED_CLAIMABLE_AUCTIONS_INDICES = [new BigNumber('1')]
    // const EXPECTED_CLAIMABLE_AUCTIONS_INDICES = [new BigNumber('1'), new BigNumber('2')]

    // GIVEN two claimable auctions as a seller
    let claimableAuctions = await _getClaimableAuctions()
    expect(claimableAuctions).toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)

    // WHEN claim from several auctions as a seller
    await auctionRepo.claimTokensFromSeveralAuctionsAsSeller({
      auctionsAsSeller: [{ sellToken: 'RDN', buyToken: 'WETH', indices: [1] }],
      address: user1
    })

    // THEN we have claimed the tokens succesfully
    claimableAuctions = await _getClaimableAuctions()
    expect(claimableAuctions).not.toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)
  })

  test('It should claim from several auctions as buyer', async () => {
    const { user1, auctionRepo, ethereumClient } = await setupPromise

    await _addRdnEthTokenPair({ ethFunding: 10 })
    // Fund and close 2 auctions where we participate
    await _fundAndCloseAuction({ from: user1, ethereumClient })
    // TODO claim from more than 1 auction
    // await _fundAndCloseAuction({ from: user1, ethereumClient })

    const _getClaimableAuctions = () => auctionRepo.getIndicesWithClaimableTokensForBuyers({
      sellToken: 'RDN', buyToken: 'WETH', address: user1, lastNAuctions: 2
    })

    const EXPECTED_CLAIMABLE_AUCTIONS_INDICES = [new BigNumber('1')]
    // const EXPECTED_CLAIMABLE_AUCTIONS_INDICES = [new BigNumber('1'), new BigNumber('2')]

    // GIVEN two claimable auctions as a seller
    let claimableAuctions = await _getClaimableAuctions()
    expect(claimableAuctions).toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)

    // WHEN claim from several auctions as a seller
    await auctionRepo.claimTokensFromSeveralAuctionsAsBuyer({
      auctionsAsBuyer: [{ sellToken: 'RDN', buyToken: 'WETH', indices: [1] }],
      address: user1
    })

    // THEN we have claimed the tokens succesfully
    claimableAuctions = await _getClaimableAuctions()
    expect(claimableAuctions).not.toContainEqual(EXPECTED_CLAIMABLE_AUCTIONS_INDICES)
  })

  // Test buy tokens in auction
  test('It should allow to buy tokens in an auction', async () => {
    const { user1, ethereumClient } = await setupPromise

    // GIVEN a new token pair after 6 hours of funding
    await _addRdnEthTokenPair({})
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    const [
      rdnEthState,
      ethRdnState
    ] = await Promise.all([
      _getState({}),
      _getState({ sellToken: 'WETH', buyToken: 'RDN' })
    ])
    // GIVEN a state status of RUNNING
    expect(rdnEthState).toEqual('RUNNING')

    // GIVEN a state status of RUNNING
    // for oposite market too
    expect(ethRdnState).toEqual('RUNNING')

    // WHEN we add a buy order
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('0.5')
    })

    // THEN the new state matches the intial market state
    let updatedAuction = Object.assign({}, INITIAL_MARKET_STATE.auction,
      { isClosed: true })
    let updatedAuctionOpp = Object.assign({}, INITIAL_MARKET_STATE.auctionOpp,
      { buyVolume: {} })
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction, auctionOpp: updatedAuctionOpp })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
    expect(_isValidBuyVolume(rdnEthstateInfo.auctionOpp.buyVolume, rdnEthstateInfo.auctionOpp.sellVolume))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auctionOpp.sellVolume, await _toBigNumberWei(13.123)))
      .toBeTruthy()
  })

  test('It should allow return buyer balance for an auction', async () => {
    const { user1, ethereumClient, auctionRepo } = await setupPromise

    // GIVEN a new token pair before user buying anything
    await _addRdnEthTokenPair({})
    await ethereumClient.increaseTime(6.1 * 60 * 60)
    let buyerBalance = await auctionRepo.getBuyerBalance({
      sellToken: 'WETH',
      buyToken: 'RDN',
      auctionIndex: 1,
      address: user1
    })
    expect(buyerBalance).toMatchObject(new BigNumber('0'))

    // WHEN we add a buy order
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('0.5')
    })

    // THEN the new state matches the intial market state
    buyerBalance = await auctionRepo.getBuyerBalance({
      sellToken: 'WETH',
      buyToken: 'RDN',
      auctionIndex: 1,
      address: user1
    })
    expect(_isValidBuyVolume(buyerBalance, await _toBigNumberWei('0.5')))
      .toBeTruthy()
  })

  // Test auction closing
  test('It should close auction after all tokens sold', async () => {
    jest.setTimeout(10000)
    const { user1, ethereumClient } = await setupPromise

    // GIVEN a new token pair after 6 hours of funding
    await _addRdnEthTokenPair({ rdnFunding: 0.5 })
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    // GIVEN a state status of RUNNING
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('RUNNING')

    // WHEN we add a buy order for all tokens of one auction side
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('0.5')
    })

    // THEN the new state matches that one auction has closed, with a closing price
    // let price = await _getCurrentAuctionPrice({})
    let updatedAuction = {
      // TODO check correct price
      // closingPrice: {
      //   numerator: price.numerator,
      //   denominator: new BigNumber('498750000000000000')
      // },
      isClosed: true,
      isTheoreticalClosed: true
    }
    let updatedAuctionOpp = Object.assign({}, INITIAL_MARKET_STATE.auctionOpp,
      { sellVolume: {} })
    let updatedMarket = Object.assign({}, INITIAL_MARKET_STATE,
      { auction: updatedAuction, auctionOpp: updatedAuctionOpp })
    let rdnEthstateInfo = await _getStateInfo({})
    expect(rdnEthstateInfo).toMatchObject(updatedMarket)
    expect(_isValidBuyVolume(rdnEthstateInfo.auction.buyVolume, rdnEthstateInfo.auction.sellVolume))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auction.sellVolume, await _toBigNumberWei(0.5)))
      .toBeTruthy()
    expect(_isValidSellVolume(rdnEthstateInfo.auctionOpp.sellVolume, await _toBigNumberWei(13.123)))
      .toBeTruthy()

    // THEN the new state status is ONE_AUCTION_HAS_CLOSED
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('ONE_AUCTION_HAS_CLOSED')
  })

  // Closing an auction in PENDING_CLOSE_THEORETICAL state
  test('It should allow to close a PENDING_CLOSE_THEORETICAL auction', async () => {
    const { user1, ethereumClient } = await setupPromise

    // GIVEN an auction after many tokens sold and 24 hours later
    await _addRdnEthTokenPair({ ethFunding: 10 })
    await ethereumClient.increaseTime(6.1 * 60 * 60)
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('9')
    })
    await ethereumClient.increaseTime(24 * 60 * 60)

    // GIVEN a state status of PENDING_CLOSE_THEORETICAL
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('PENDING_CLOSE_THEORETICAL')

    // WHEN we add a buy order without amount
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('0')
    })

    // THEN the new state status is WAITING_FOR_FUNDING
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_FUNDING')
  })

  // Ask for sell volume for next auction
  test('It should add sell volume for next auction', async () => {
    const { user1, ethereumClient, auctionRepo } = await setupPromise

    // GIVEN a RUNNING auction
    await _addRdnEthTokenPair({ ethFunding: 10 })
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    let sellVolumeNext = await auctionRepo.getSellVolumeNext({ sellToken: 'WETH', buyToken: 'RDN' })
    expect(sellVolumeNext).toEqual(new BigNumber('0'))

    // WHEN we add a new sell token order
    await _buySell('postSellOrder', {
      from: user1,
      sellToken: 'WETH',
      buyToken: 'RDN',
      amount: parseFloat('2')
    })

    // THEN the volume is added to the next auction
    sellVolumeNext = await auctionRepo.getSellVolumeNext({ sellToken: 'WETH', buyToken: 'RDN' })
    expect(_isValidSellVolume(sellVolumeNext, await _toBigNumberWei(2)))
      .toBeTruthy()
  })

  // Add a non ethereum market
  test('It should allow to add markets between tokens different from WETH', async () => {
    jest.setTimeout(10000)
    const { web3, auctionRepo, user1 } = await setupPromise

    // GIVEN a state status of UNKNOWN_TOKEN_PAIR for RDN-WETH
    let rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('UNKNOWN_TOKEN_PAIR')
    // GIVEN a state status of UNKNOWN_TOKEN_PAIR for OMG-WETH
    let omgEthState = await _getState({ sellToken: 'OMG' })
    expect(omgEthState).toEqual('UNKNOWN_TOKEN_PAIR')
    // GIVEN a state status of UNKNOWN_TOKEN_PAIR for RDN-OMG
    let rdnOmgState = await _getState({ buyToken: 'OMG' })
    expect(rdnOmgState).toEqual('UNKNOWN_TOKEN_PAIR')

    // WHEN we add WETH-RDN token pair
    await auctionRepo.addTokenPair({
      from: user1,
      tokenA: 'WETH',
      tokenAFunding: web3.toWei(10, 'ether'),
      tokenB: 'RDN',
      tokenBFunding: web3.toWei(0, 'ether'),
      initialClosingPrice: {
        numerator: 1000000,
        denominator: 4079
      }
    })

    // WHEN we add OMG-WETH token pair
    await auctionRepo.addTokenPair({
      from: user1,
      tokenA: 'OMG',
      tokenAFunding: web3.toWei(0, 'ether'),
      tokenB: 'WETH',
      tokenBFunding: web3.toWei(10, 'ether'),
      initialClosingPrice: {
        numerator: 22200,
        denominator: 1000000
      }
    })

    // WHEN we add RDN-OMG token pair
    await auctionRepo.addTokenPair({
      from: user1,
      tokenA: 'RDN',
      tokenAFunding: web3.toWei(300, 'ether'),
      tokenB: 'OMG',
      tokenBFunding: web3.toWei(500, 'ether'),
      initialClosingPrice: {
        numerator: 4079,
        denominator: 22200
      }
    })

    // THEN the new state status for RDN-WETH is WAITING_FOR_AUCTION_TO_START
    rdnEthState = await _getState({})
    expect(rdnEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the new state status for OMG-WETH is WAITING_FOR_AUCTION_TO_START
    omgEthState = await _getState({ sellToken: 'OMG' })
    expect(omgEthState).toEqual('WAITING_FOR_AUCTION_TO_START')

    // THEN the new state status for RDN-OMG is WAITING_FOR_AUCTION_TO_START
    rdnOmgState = await _getState({ buyToken: 'OMG' })
    expect(rdnOmgState).toEqual('WAITING_FOR_AUCTION_TO_START')
  })

  test('It should return last available closing price', async () => {
    const { user1, auctionRepo, ethereumClient } = await setupPromise

    const initialClosingPrice = {
      numerator: new BigNumber(4079),
      denominator: new BigNumber(1000000)
    }

    await _addRdnEthTokenPair({ rdnFunding: 1000, initialClosingPrice })
    await ethereumClient.increaseTime(6.1 * 60 * 60)

    const _getLastClosingPrice = () => auctionRepo.getLastAvaliableClosingPrice({
      sellToken: 'RDN', buyToken: 'WETH', auctionIndex: 2
    })

    // GIVEN a first time running auction
    let closingPrice = await _getLastClosingPrice()
    // Price should be the creation price
    expect(closingPrice).toMatchObject(initialClosingPrice)

    // WHEN we buy and close the auction
    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('1')
    })
    await ethereumClient.increaseTime(24 * 60 * 60)

    await _buySell('postBuyOrder', {
      from: user1,
      sellToken: 'RDN',
      buyToken: 'WETH',
      amount: parseFloat('0')
    })

    // THEN price has lowered
    // (we bought less than there was offered for the initialClosingPrice)
    closingPrice = await _getLastClosingPrice()
    const decimalClosingPrice = numberUtil.toBigNumberFraction(closingPrice)
    const decimalInitialClosingPrice = numberUtil.toBigNumberFraction(initialClosingPrice)
    expect(decimalClosingPrice
      .lessThanOrEqualTo(decimalInitialClosingPrice)
    ).toBeTruthy()
  })

  // Test skiped until transaction retry is correctly implemented
  /*
    describe('Transaction retry tests', async () => {
      let originalPostSellOrder
      let sendTransactionFn

      beforeAll(async () => {
        const { auctionRepo } = await setupPromise

        // We save a copy of the function we use to test retries
        // Is a complex object with a function at root and som auxiliary methods in properties
        // We have to deal with this complexity as jest do not handle it correctly
        originalPostSellOrder = clone(auctionRepo._dx.postSellOrder)
      })

      beforeEach(async () => {
        const { auctionRepo } = await setupPromise

        // wrap scope function with mock properties
        // Contract function is a complex object with a function and some auxiliary methods
        // First we mock the base function implementation
        let postSellOrder = jest.spyOn(auctionRepo._dx, 'postSellOrder')
        // Then we merge the base function with the original auxiliary methods and overwrite the original object
        auctionRepo._dx.postSellOrder = Object.assign(postSellOrder, originalPostSellOrder)
        sendTransactionFn = auctionRepo._dx.postSellOrder
      })

      afterEach(async () => {
        const { auctionRepo } = await setupPromise

        // We use this function to remove mock methods in order to avoid issues
        // and restore pure origin functionality
        auctionRepo._dx.postSellOrder.mockRestore()
        auctionRepo._doTransactionWithRetry.mockRestore()
      })

      test('It should retry the transaction in case of failure', async () => {
        const { user1, auctionRepo } = await setupPromise

        // GIVEN a new token pair
        await _addRdnEthTokenPair({})

        // Config the params to have more control in test cases
        auctionRepo._transactionRetryTime = 200
        auctionRepo._gasRetryIncrement = 2
        auctionRepo._overFastPriceFactor = 2

        let transactionWithRetry = jest.spyOn(auctionRepo, '_doTransactionWithRetry')

        // WHEN we get an unresolved promise twice
        const promise = new Promise((resolve, reject) => {})
        sendTransactionFn
          .mockReturnValueOnce(promise)

        // WHEN we do a transaction
        await _buySell('postSellOrder', {
          from: user1,
          sellToken: 'RDN',
          buyToken: 'WETH',
          amount: parseFloat('2')
        })

        // THEN The send transaction function is called 2 times
        expect(sendTransactionFn).toHaveBeenCalledTimes(2)

        // THEN _doTransactionWithRetry is called 2 times
        expect(transactionWithRetry).toHaveBeenCalledTimes(2)
      })

      test('It should not retry the transaction if max gas price reached', async () => {
        const { user1, auctionRepo } = await setupPromise

        // GIVEN a new token pair
        await _addRdnEthTokenPair({})

        // Config the params to have more control in test cases
        auctionRepo._transactionRetryTime = 200
        auctionRepo._gasRetryIncrement = 2
        auctionRepo._overFastPriceFactor = 2

        let transactionWithRetry = jest.spyOn(auctionRepo, '_doTransactionWithRetry')

        // WHEN we get an unresolved promise twice
        const promise = new Promise((resolve, reject) => {})
        const resolvingPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve()
          }, 1000)
        })
        sendTransactionFn
          .mockReturnValueOnce(promise)
          .mockReturnValueOnce(resolvingPromise)
          .mockReturnValueOnce(promise)
          .mockReturnValueOnce(promise)

        // WHEN we do a transaction
        await _buySell('postSellOrder', {
          from: user1,
          sellToken: 'RDN',
          buyToken: 'WETH',
          amount: parseFloat('2')
        })

        // THEN The send transaction function is called 3 times
        expect(sendTransactionFn).toHaveBeenCalledTimes(3)

        // THEN _doTransactionWithRetry is called 3 times
        expect(transactionWithRetry).toHaveBeenCalledTimes(3)
      })

      test('It return a rejected transaction', async () => {
        const { user1, auctionRepo } = await setupPromise

        // GIVEN a new token pair
        await _addRdnEthTokenPair({})

        // Config the params to have more control in test cases
        auctionRepo._transactionRetryTime = 200
        auctionRepo._gasRetryIncrement = 2
        auctionRepo._overFastPriceFactor = 2

        let transactionWithRetry = jest.spyOn(auctionRepo, '_doTransactionWithRetry')

        // WHEN we get an unresolved promise twice
        const promise = new Promise((resolve, reject) => {})
        const rejectingPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Expect rejected'))
          }, 500)
        })
        sendTransactionFn
          .mockReturnValueOnce(rejectingPromise)
          .mockReturnValueOnce(promise)
          .mockReturnValueOnce(promise)

        // WHEN we do a transaction expecting an error
        try {
          await _buySell('postSellOrder', {
            from: user1,
            sellToken: 'RDN',
            buyToken: 'WETH',
            amount: parseFloat('2')
          })
        } catch (e) {
          expect(e).toEqual(new Error('Expect rejected'))
        }

        // THEN The send transaction function is called 2 times
        expect(sendTransactionFn).toHaveBeenCalledTimes(2)

        // THEN _doTransactionWithRetry is called 2 times
        expect(transactionWithRetry).toHaveBeenCalledTimes(2)
      })
    }) */
})

// ********* Test helpers *********
// DX Fee up to 0.5%
// The DX returns it expressed as an array of BigNumbers
const MAXIMUM_DX_FEE = [new BigNumber('1'), new BigNumber('200')]

const UNKNOWN_PAIR_MARKET_STATE = {
  auction: null,
  auctionIndex: 0,
  auctionOpp: null,
  auctionStart: null
}

const INITIAL_MARKET_STATE = {
  auctionIndex: 1,
  auction: {
    // buyVolume: new BigNumber('0'),
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false// ,
    // sellVolume: new BigNumber('0')
  },
  auctionOpp: {
    // buyVolume: new BigNumber('0'),
    closingPrice: null,
    isClosed: false,
    isTheoreticalClosed: false// ,
    // sellVolume: new BigNumber('13062839545454545454')
  }
}

const INITIAL_USER1_BALANCE = [
  { 'amount': new BigNumber('750e18'), 'token': 'GNO' },
  { 'amount': new BigNumber('20e18'), 'token': 'WETH' },
  { 'amount': new BigNumber('0'), 'token': 'MGN' },
  { 'amount': new BigNumber('0'), 'token': 'OWL' },
  { 'amount': new BigNumber('12000e18'), 'token': 'RDN' },
  { 'amount': new BigNumber('1500e18'), 'token': 'OMG' }
]

async function _getIsApprovedMarket ({ tokenA = 'RDN', tokenB = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.isValidTokenPair({ tokenA, tokenB })
}

async function _getStateInfo ({ sellToken = 'RDN', buyToken = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.getStateInfo({ sellToken, buyToken })
}

async function _getState ({ sellToken = 'RDN', buyToken = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  return auctionRepo.getState({ sellToken, buyToken })
}

async function _getCurrentAuctionPrice ({ sellToken = 'RDN', buyToken = 'WETH' }) {
  const { auctionRepo } = await setupPromise

  const auctionIndex = await auctionRepo.getAuctionIndex({
    buyToken,
    sellToken
  })

  return auctionRepo.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })
}

async function _fundAndCloseAuction ({ sellToken = 'RDN', buyToken = 'WETH', from, ethereumClient }) {
  // Fund auction
  await _buySell('postSellOrder', {
    from,
    sellToken,
    buyToken,
    amount: parseFloat('5000')
  })
  await ethereumClient.increaseTime(6.1 * 60 * 60)
  // console.log(JSON.stringify(await _getStateInfo({})))
  await _buySell('postBuyOrder', {
    from,
    sellToken,
    buyToken,
    amount: parseFloat('0.1')
  })
  await ethereumClient.increaseTime(24 * 60 * 60)
  // Close auction
  await _buySell('postBuyOrder', {
    from,
    sellToken,
    buyToken,
    amount: parseFloat('0')
  })
}

async function _buySell (operation, { from, buyToken, sellToken, amount }) {
  const { web3, auctionRepo } = await setupPromise

  let auctionIndex = await auctionRepo.getAuctionIndex({
    buyToken,
    sellToken
  })

  if (operation === 'postSellOrder') {
    const [auctionStart, now] = await Promise.all([
      auctionRepo.getAuctionStart({ sellToken, buyToken }),
      auctionRepo._getTime()
    ])
    auctionIndex = auctionStart !== null && auctionStart <= now
      ? auctionIndex + 1
      : auctionIndex
  }

  await auctionRepo[operation]({
    from,
    buyToken,
    sellToken,
    auctionIndex,
    amount: web3.toWei(amount, 'ether')
  })
}

async function _addRdnEthTokenPair ({
  rdnFunding = 0,
  ethFunding = 13.123,
  initialClosingPrice = {
    numerator: 4079,
    denominator: 1000000
  }
}) {
  const { web3, auctionRepo, user1 } = await setupPromise

  await auctionRepo.addTokenPair({
    from: user1,
    tokenA: 'RDN',
    tokenAFunding: web3.toWei(rdnFunding, 'ether'),
    tokenB: 'WETH',
    tokenBFunding: web3.toWei(ethFunding, 'ether'),
    initialClosingPrice: initialClosingPrice
  })
}

async function _toBigNumberWei (value) {
  const { web3 } = await setupPromise

  return new BigNumber(web3.toWei(value, 'ether'))
}

function _isValidBuyVolume (buyVolume, sellVolume) {
  debug('buyVolume: ', buyVolume)
  debug('sellVolume: ', sellVolume)

  return buyVolume.lessThanOrEqualTo(sellVolume)
}

function _isValidSellVolume (sellVolume, fundingSellVolume) {
  const minimumSellVolume = fundingSellVolume.mul(1 - MAXIMUM_DX_FEE[0].div(MAXIMUM_DX_FEE[1]))

  debug('minimumSellVolume: ', minimumSellVolume)
  debug('sellVolume: ', sellVolume)
  debug('originSellVolume: ', fundingSellVolume)

  return minimumSellVolume.lessThanOrEqualTo(sellVolume) &&
    sellVolume.lessThanOrEqualTo(fundingSellVolume)
}
