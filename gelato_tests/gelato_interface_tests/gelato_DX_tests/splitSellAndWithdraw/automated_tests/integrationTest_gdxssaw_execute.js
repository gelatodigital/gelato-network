/** GelatoCore.execute() covers:
* -----------------------------------------------------------------
* IcedOut(GelatoDXSplitSellAndWithdraw).execute()
* -----------------------------------------------------------------
* -> GelatoDXSplitSellAndWithdraw.execute() test coverage:
* -----------------------------------------------------------------
* dutchExchange.depositAndSell() (on interface)
* automated withdrawals (on interface)
* -----------------------------------------------------------------
* -> executore payout (on core)
* -----------------------------------------------------------------
 * */


// Do NOT redeploy contracts, we need the state of the contracts from
//  truffle test integrationTest_gdxssaw_splitSellOrder.js
// --> We use describe() NOT truffle's cleanroom contract()

// Default test suite
describe(
    "default test suite: correct deployed instances and owners",
    async accounts => {
      // suite root-level pre-hook: set the test suite variables to be shared among all tests
      before(async () => {
        gelatoCore = await GelatoCore.deployed();
        gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();
      });

      // ******** Default deployed instances tests ********
      it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
        assert.exists(gelatoCore.address);
        assert.exists(gelatoDXSplitSellAndWithdraw.address);
        assert.strictEqual(gelatoCore.address, GelatoCore.address);
        assert.strictEqual(
          gelatoDXSplitSellAndWithdraw.address,
          GelatoDXSplitSellAndWithdraw.address
        );
      });
      // ******** Default deployed instances tests END ********

      // ******** Default ownership tests ********
      it("has accounts[0] as owners of Core and Interface and accounts[1] is not owner", async () => {
        gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
        gelatoDXSplitSellAndWithdrawOwner = await gelatoDXSplitSellAndWithdraw.contract.methods
          .owner()
          .call();

        assert.strictEqual(gelatoCoreOwner, accounts[0]);
        assert.strictEqual(gelatoDXSplitSellAndWithdrawOwner, accounts[0]);

        assert.notEqual(
          gelatoCoreOwner,
          accounts[1],
          "accounts[1] was expected not to be gelatoCoreOwner"
        );
        assert.notEqual(
          gelatoDXSplitSellAndWithdrawOwner,
          accounts[1],
          "accounts[1] was not expected to be gelatoDXSplitSellAndWithdrawOwner"
        );

        notOwner = accounts[1];
      });
      // ******** Default ownership tests END ********
    }
  );
