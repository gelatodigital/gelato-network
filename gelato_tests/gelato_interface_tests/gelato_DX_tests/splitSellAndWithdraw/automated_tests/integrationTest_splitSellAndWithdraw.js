/** Automated integration test for GelatoDxSplitSellAndWithdraw
 * default test suite
 *
 * GelatoDXSplitSellAndWithdraw.splitSellOrder() covers:
 * -----------------------------------------------------
 * -> GelatoCore.mintClaim()
 *
 *
 * -----------------------------------------------------
 *
 * GelatoCore.execute() covers:
 * -----------------------------------------------------------------
 * IcedOut(GelatoDXSplitSellAndWithdraw).execute()
 * -> GelatoDXSplitSellAndWithdraw.execute() test coverage:
 * automated withdrawals (on interface)
 * -> executore payout (on core)
 * -----------------------------------------------------------------
 *  */
// Big Number stuff
const BN = web3.utils.BN;

// Gelato-Core specific
const GelatoCore = artifacts.require("GelatoCore");
// Constants
// GELATO_GAS_PRICE:
//  This is a state variable that got deployed with truffle migrate
//  and was set inside 3_deploy_gelato.js. We should import this variable
//  instead of hardcoding it.
//  It should match the truffle.js specified DEFAULT_GAS_PRICE_GWEI = 5
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
// Gelato-Core specific END

// GDXSSAW specific
// Artifacts
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);
const SellToken = artifacts.require("EtherToken");
const BuyToken = artifacts.require("TokenRDN");
// Constants
const SELL_TOKEN = "0xAa588d3737B611baFD7bD713445b314BD453a5C8"; // WETH
const BUY_TOKEN = "0x8ACEe021a27779d8E98B9650722676B850b25E11"; // RDN
const TOTAL_SELL_VOLUME = 20; // 20 WETH
const TOTAL_SELL_VOLUME_UNIT = "ether";
const NUM_SUBORDERS = 2;
const SUBORDER_SIZE = 10; // 10 WETH
const SUBORDER_UNIT = "ether";
const INTERVAL_SPAN = 21600; // 6 hours
const GDXSSAW_MAXGAS = 400000;

// Big Number constants
const GDXSSAW_MAXGAS_BN = new BN(GDXSSAW_MAXGAS.toString()); // 400.000 must be benchmarked
const GELATO_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei
const NUM_SUBORDERS_BN = new BN(NUM_SUBORDERS.toString());
const MSG_VALUE = GELATO_PREPAID_FEE_BN.mul(NUM_SUBORDERS_BN).toString(); // wei
// To be set variables
let sellTokenContract;
let buyTokenContract;
let accounts;
let seller; // account[2]: 0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef
let totalSellVolume;
let subOrderSize;
let executionTime; // timestamp
let estimatedGasUsedGDXSSAWSplitSellOrder;
let acutalGasUsedGDXSSAWSplitSellOrder;
let estimatedGasUsedGCoreExecute;
let actualGasUsedGCoreExecute;
// GDXSSAW specific END

// State shared across the unit tests
// Deployed contract instances
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
// Deployed instances owners
let gelatoCoreOwner;
let gelatoDXSplitSellAndWithdrawOwner;
// Account used for non-ownership prevention tests
let notOwner; // account[1]
// tx hashes and receipts
let txHash;
let txReceipt;

// Default test suite
contract(
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
      assert.equal(gelatoCore.address, GelatoCore.address);
      assert.equal(
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

      assert.equal(gelatoCoreOwner, accounts[0]);
      assert.equal(gelatoDXSplitSellAndWithdrawOwner, accounts[0]);

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

// Test suite to end-to-end test the creation of a GDXSSAW style claims
describe("Listing GDXSSAW -> GDXSSAW.splitSellOrder() -> GelatoCore.mintClaim()", () => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    sellTokenContract = await SellToken.at(SELL_TOKEN);
    buyTokenContract = await BuyToken.at(BUY_TOKEN);

    accounts = await web3.eth.getAccounts();
    seller = accounts[2];

    totalSellVolume = web3.utils.toWei(
      TOTAL_SELL_VOLUME.toString(),
      TOTAL_SELL_VOLUME_UNIT
    );

    subOrderSize = web3.utils.toWei(SUBORDER_SIZE.toString(), SUBORDER_UNIT);

    const block = await web3.eth.getBlockNumber();
    const blockDetails = await web3.eth.getBlock(block);
    const timestamp = blockDetails.timestamp;

    executionTime = timestamp;
  });

  // ******** GDXSSAW default deployed instances checks ********
  it(`fetches the correct deployed sellToken and buyToken contracts`, async () => {
    assert.exists(sellTokenContract.address);
    assert.exists(buyTokenContract.address);
    assert.equal(sellTokenContract.address, SELL_TOKEN);
    assert.equal(buyTokenContract.address, BUY_TOKEN);
  });
  // ******** GDXSSAW default deployed instances checks END ********

  // ******** list GDXSSAW interface on Gelato Core and set its maxGas ********
  it(`lets Core-owner list gelatoDXSplitSellAndWithdraw on GelatoCore with its maxGas set
  Event LogNewInterfaceListed:
  expected indexed address:  ${GelatoDXSplitSellAndWithdraw.address}
  expected interface maxGas: ${GDXSSAW_MAXGAS}`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDXSplitSellAndWithdraw.address, GDXSSAW_MAXGAS)
      .send({ from: gelatoCoreOwner });

    const isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    const maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.equal(GDXSSAW_MAXGAS, maxGas);
  });
  // ******** list GDXSSAW interface on Gelato Core and set its maxGas END ********

  // ******** Seller ERC20 approves the GDXSSAW for TotalSellVolume ********
  it(`seller approves GelatoDXSplitsellAndWithdraw for the totalSellVolume`, async () => {
    await sellTokenContract.contract.methods
      .approve(gelatoDXSplitSellAndWithdraw.address, totalSellVolume)
      .send({ from: seller });

    const allowance = await sellTokenContract.contract.methods
      .allowance(seller, gelatoDXSplitSellAndWithdraw.address)
      .call();

    assert.equal(
      allowance,
      totalSellVolume,
      `The ERC20 ${
        sellTokenContract.address
      } allowance for the GelatoDXSplitsellAndWithdraw should be at ${totalSellVolume}`
    );
  });
  // ******** Seller ERC20 approves the GDXSSAW for TotalSellVolume END ********

  // ******** GDXSSAW.splitSellOrder() gasUsed estimates ********
  it(`estimates GelatoDXSplitsellAndWithdraw.splitSellOrder() gasUsed and logs gasLimit`, async () => {
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        totalSellVolume,
        NUM_SUBORDERS,
        subOrderSize,
        executionTime,
        INTERVAL_SPAN
      )
      .estimateGas(
        { from: seller, value: MSG_VALUE, gas: 400000 },
        (error, gasAmount) => {
          if (error) {
            console.error;
          } else {
            estimatedGasUsedGDXSSAWSplitSellOrder = gasAmount;
            console.log(
              `Estimated gasUsed by GDXSSAW.splitSellOrder(): ${gasAmount}`
            );
          }
        }
      );

    // Get and log gasLimit
    await web3.eth.getBlock("latest", false, (error, block) => {
      if (error) {
        console.error;
      } else {
        console.log(`gasLimit: ${block.gasLimit}`);
      }
    });

    assert(true);
  });
  // ******** GDXSSAW.splitSellOrder() gasUsed estimates END ********

  // ******** call GDXSSAW.splitSellOrder() and mint its execution claims on Core ********
  it(`lets seller/anyone execute GelatoDXSplitSellAndWithdraw.splitSellOrder()
  Event LogNewOrderCreated:
  expected indexed orderId:  1
  expected indexed seller:   ${process.env.SELLER}`, async () => {
    // benchmarked gasUsed = 520109
    await gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        totalSellVolume,
        NUM_SUBORDERS,
        subOrderSize,
        executionTime,
        INTERVAL_SPAN
      )
      .send({ from: seller, value: MSG_VALUE, gas: 1000000 })
      .once("transactionHash", hash => {
        txHash = hash;
        console.log(`txHashSplitSellOrder:\n${hash}`);
      })
      .once("receipt", receipt => {
        txReceipt = receipt;
        console.log(
          "txReceiptSplitSellOrder returned by transaction:\n",
          receipt
        );
      })
      .on("error", console.error);

    assert.exists(txReceipt.events.LogNewOrderCreated);
  });
  // ******** call GDXSSAW.splitSellOrder() and mint its execution claims on Core END********
});
