// XX1. Write down the test scenario
// XX2. List the order of calls we conduct within the execute function to the DutchX
// XX3. Write down which values should be returned from each function call
// XX4. Write a Mock dutchX contract which has the same function names specified in 2) which returns the values specified in 3) and which employs setter to set new values
// 5. Create a truffle test file which deploys a new instance of the gelatoDX interface with a new core and the mock contract instead of the dutchX
// 6. Create a bash script that endows the user before executing the new test file
// 7. Copy paste the tests which mint 3 execution claims
// 8. You maybe have to edit the min. 6 hour interval func in order to skip forward in time. Otherwise research how we can skip time in truffle. If that does not work, use execution times that lie within the past
// 8a. Dont forget to call the appriveDutchX func beforehand
// 8n. To truely test the transfer of the amounts, we have to give the Mock contract funds
// 9. Implement the test specified in 1.
// 10. Implement the test which should result in a revert, such as selling in an auction twice.

/*

    // 1. Test scenario using Mock contract of the Execute() func

    TEST SCENARIO
    - User wants to sell 10 WETH for RDN on the DutchX twice, with an interval span of 6 hours. The execution time of the first tx is now.
    - The DutchX has a WETH-RDN auction currently running, with:
        - Auction Index 10
        - Auction Start time: now - 6 hours => Auction is running and started roughly 6h ago
        - Current price: 1WETH == 100 RND => Num === 100 && Den === 1
        - Current Fee: 0.2% => Num === 1 && Den === 500
    #1 The 1st execution should pass without a problem. Gelatos balance should be deducted by the sell amount. The claim should be burned.
    #2 Executing the second claim right after that should result in the execution time reverting
    #3 Skip ahead in time so we and test if we are at the right block
    #4 Change the DutchXMockContract values and test if they were correctly incremented
    #5 Test if the second claim can be successfully executed. The Gelato balance should be deducted by the sell amount. The users balance should be updated by the withdraw amount. The claim should be burned
    #6 Repeat #3 && ä4
    #7 Execute third tx and check if the user balance was successfully incremented

    // // 2 / 3. List the order of calls we conduct within the execute function to the DutchX

    1. dutchExchange.getAuctionIndex(buyToken, sellToken) => 10
    2. dutchExchange.getAuctionStart(sellToken, buyToken) => now - 6 hours
    3. dutchExchange.getFeeRatio(address(this)) => num: 1, den: 500 => 1 / 500 == 0,002. 10 WETH / 500 => 0,02 WETH === Fee
    4. dutchExchange.depositAndSell(_sellToken, _buyToken, _sellAmount) => true
    5. dutchExchange.closingPrices(_sellToken, _buyToken, _lastAuctionIndex) => num: 1000 amount RDN, den: 10 amount WETH => 10WETH should => 1000 RND WETH/RDN === 100RDN
    6. dutchExchange.claimAndWithdraw(_sellToken, _buyToken, address(this), _lastAuctionIndex,withdrawAmount) => true
*/

// 5. Truffle test file for the splitSellOrder

// Import Contracts
const GelatoCore = artifacts.require("GelatoCore");
const gelatoDutchX = artifacts.require("GelatoDXSplitSellAndWithdraw");
const mockExchange = artifacts.require("DutchXMock");

let mockExchangeContract;
let gelatoDutchXContract;
let gelatoCore;

describe("deploy new dxInterface Contract and fetch address", async () => {
  // Deploy new instances
  before(async () => {
    mockExchangeContract = await mockExchange.new();
    gelatoDutchXContract = await gelatoDutchX.new(
      GelatoCore.address,
      mockExchange.address
    );
    gelatoCore = await GelatoCore.deployed();
  });

  it("Check if the Mock Contract is indeed listed as the dutchX on the gelatoDxInterface", async () => {
    assert.exists(mockExchangeContract.address);
    assert.exists(gelatoDutchXContract.address);
    let mockExchangeAddress;
    await gelatoDutchXContract.dutchExchange.then(
      response => (mockExchangeAddress = response.address)
    );
    assert.strictEqual(mockExchangeAddress, mockExchangeContract.address);
  });

//   it("List dxInterface on gelatoCore", async () => {
//     assert.exists(gelatoCore.address);
//     assert.strictEqual(gelatoCoreOwner, accounts[0]);
//   });
});
