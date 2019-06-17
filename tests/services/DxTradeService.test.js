const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})

const setupPromise = testSetup()

test('It should post a buy order', async () => {
  const { dxTradeService } = await setupPromise

  // we mock the auction repo
  dxTradeService._auctionRepo = auctionRepoMock

  // we wrap postBuyOrder with jest mock functionalities
  const postBuyOrder = jest.fn(dxTradeService._auctionRepo.postBuyOrder)
  dxTradeService._auctionRepo.postBuyOrder = postBuyOrder

  // GIVEN no calls to postSellOrder function
  expect(postBuyOrder.mock.calls.length).toBe(0)

  // WHEN we do a buy
  await dxTradeService.buy({
    sellToken: 'RDN',
    buyToken: 'WETH',
    auctionIndex: 77,
    from: '0x123',
    amount: 1
  })

  // THEN expect 1 call to postBuyOrder function
  expect(postBuyOrder.mock.calls.length).toBe(1)
})

test('It should post a sell order', async () => {
  const { dxTradeService } = await setupPromise

  // we mock the auction repo
  dxTradeService._auctionRepo = auctionRepoMock

  // we wrap postSellOrder with jest mock functionalities
  const postSellOrder = jest.fn(dxTradeService._auctionRepo.postSellOrder)
  dxTradeService._auctionRepo.postSellOrder = postSellOrder

  // GIVEN no calls to postSellOrder function
  expect(postSellOrder.mock.calls.length).toBe(0)

  // WHEN we do a sell
  await dxTradeService.sell({
    sellToken: 'RDN',
    buyToken: 'WETH',
    auctionIndex: 77,
    from: '0x123',
    amount: 1
  })

  // THEN expect 1 call to postSellOrder function
  expect(postSellOrder.mock.calls.length).toBe(1)
})