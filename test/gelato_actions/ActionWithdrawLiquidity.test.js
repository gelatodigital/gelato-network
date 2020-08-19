// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers, utils } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../gelato_core/base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";
import DataFlow from "../../src/enums/gelato/DataFlow";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

const NUM = 100;
const DEN = 10000;
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
// => Fee = 1%

describe("Action Withdraw Liquidity Tests", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let seller;
  let provider;
  let executor;
  let sysAdmin;
  let userProxy;
  let sellerAddress;
  let providerAddress;
  let executorAddress;
  let sysAdminAddress;
  let userProxyAddress;
  let providerModuleGelatoUserProxy;
  let gelatoCore;
  let gelatoGasPriceOracle;
  let gelatoProvider;
  let gelatoActionPipeline;
  let collateralToken;
  let collateralDecimals;
  let weth;

  let actionTransferFrom;
  let actionTransfer;

  let mockConditionalTokens;
  let actionWithdrawLiquidity;

  let liquidityPoolTokens;

  // ###### GelatoCore Setup ######
  beforeEach(async function () {
    // Get signers
    [seller, provider, executor, sysAdmin] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
    sysAdminAddress = await sysAdmin.getAddress();

    // Deploy Gelato Core with SysAdmin + Stake Executor
    const GelatoCore = await ethers.getContractFactory("GelatoCore", sysAdmin);
    gelatoCore = await GelatoCore.deploy(gelatoSysAdminInitialState);
    await gelatoCore.deployed();
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(GELATO_GAS_PRICE);
    await gelatoGasPriceOracle.deployed();

    // Set gas price oracle on core
    await gelatoCore
      .connect(sysAdmin)
      .setGelatoGasPriceOracle(gelatoGasPriceOracle.address);

    // Deploy GelatoUserProxyFactory with SysAdmin
    const GelatoUserProxyFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory",
      sysAdmin
    );
    const gelatoUserProxyFactory = await GelatoUserProxyFactory.deploy(
      gelatoCore.address
    );
    await gelatoUserProxyFactory.deployed();

    const GelatoActionPipeline = await ethers.getContractFactory(
      "GelatoActionPipeline",
      sysAdmin
    );
    gelatoActionPipeline = await GelatoActionPipeline.deploy();

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address,
      gelatoActionPipeline.address
    );
    await providerModuleGelatoUserProxy.deployed();

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Register new provider TaskSpec on core with provider EDITS NEED ä#######################

    // Call multiProvide for mockConditionDummy + actionTransferFrom
    // Provider registers new condition
    const ActionERC20TransferFrom = await ethers.getContractFactory(
      "ActionERC20TransferFrom",
      sysAdmin
    );

    actionTransferFrom = await ActionERC20TransferFrom.deploy();
    await actionTransferFrom.deployed();

    const ActionTransfer = await ethers.getContractFactory(
      "ActionTransfer",
      sysAdmin
    );

    actionTransfer = await ActionTransfer.deploy();
    await actionTransfer.deployed();

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory.connect(seller).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    collateralDecimals = 18;
    collateralToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** collateralDecimals).toString(),
      sellerAddress,
      collateralDecimals
    );
    await collateralToken.deployed();

    liquidityPoolTokens = await MockERC20.deploy(
      "LPTKN",
      (100 * 10 ** collateralDecimals).toString(),
      userProxy.address,
      18
    );
    await liquidityPoolTokens.deployed();

    weth = await MockERC20.deploy(
      "WETH",
      (100 * 10 ** 18).toString(),
      userProxy.address,
      18
    );
    await weth.deployed();

    const MockConditionalTokens = await ethers.getContractFactory(
      "MockConditionaltokens",
      provider
    );

    mockConditionalTokens = await MockConditionalTokens.deploy(
      liquidityPoolTokens.address
    );
    await mockConditionalTokens.deployed();

    // So Mock Conditional Token Contract is prefilled with collateral Tokens
    await collateralToken.transfer(
      mockConditionalTokens.address,
      ethers.utils.parseEther("100")
    );

    const MockUniswapRouterV2 = await ethers.getContractFactory(
      "MockUniswapRouterV2",
      provider
    );
    // Provider Inputs
    const mockUniswapRouterV2 = await MockUniswapRouterV2.deploy();
    await mockUniswapRouterV2.deployed();

    const ActionWithdrawLiquidity = await ethers.getContractFactory(
      "ActionWithdrawLiquidity",
      provider
    );
    // Provider Inputs
    actionWithdrawLiquidity = await ActionWithdrawLiquidity.deploy(
      gelatoCore.address,
      providerAddress,
      weth.address,
      mockUniswapRouterV2.address
    );
    await actionWithdrawLiquidity.deployed();
  });

  it("#1: Check provider payouts, when EOA has to pay fee and ERC20 token is used", async function () {
    // 1. Set Mock to how much lpTokenBalance the proxy has
    const lpTokenBalanceToApprove = await liquidityPoolTokens.balanceOf(
      userProxy.address
    );

    // Proxy needs to improve the MockConditionalTokens contract as we delegeta call into ActionWithdrawLqiuidity which calls MockConditionalTokens
    const actionApproveToken = new Action({
      addr: liquidityPoolTokens.address,
      data: await run("abi-encode-withselector", {
        contractname: "MockERC20",
        functionname: "approve",
        inputs: [mockConditionalTokens.address, lpTokenBalanceToApprove],
      }),
      operation: Operation.Call,
    });

    const outcomeTokenBalances = [
      ethers.utils.parseEther("5"),
      ethers.utils.parseEther("8"),
      ethers.utils.parseEther("2"),
    ];

    const actionWithdrawLiquidityInputy = [
      mockConditionalTokens.address,
      mockConditionalTokens.address,
      [1, 2, 3], //_positionIds,
      ethers.constants.HashZero, //bytes32 _conditionId
      ethers.constants.HashZero, //bytes32 _parentCollectionId
      collateralToken.address, // address _collateralToken,
      sellerAddress, // _Receiver
    ];

    const actionWithdrawLiquidityAction = new Action({
      addr: actionWithdrawLiquidity.address,
      data: await run("abi-encode-withselector", {
        contractname: "ActionWithdrawLiquidity",
        functionname: "action",
        inputs: actionWithdrawLiquidityInputy,
      }),
      operation: Operation.Delegatecall,
    });

    // LP token Pre as to be checked on Proxy
    const lpTokenBalancePre = await liquidityPoolTokens.balanceOf(
      userProxy.address
    );
    const collateralBalancePre = await collateralToken.balanceOf(sellerAddress);
    console.log(`LP: ${lpTokenBalancePre.toString()}`);
    console.log(`CO: ${collateralBalancePre.toString()}`);

    expect(collateralBalancePre).to.be.equal(0);

    expect(
      await userProxy.multiExecActions([
        actionApproveToken,
        actionWithdrawLiquidityAction,
      ])
    );

    const lpTokenBalancePost = await liquidityPoolTokens.balanceOf(
      userProxy.address
    );
    const collateralBalancePost = await collateralToken.balanceOf(
      sellerAddress
    );

    const collateralBalancePostProvider = await collateralToken.balanceOf(
      providerAddress
    );

    console.log(`LP: ${lpTokenBalancePost.toString()}`);
    console.log(`CO: ${collateralBalancePost.toString()}`);
    console.log(`CO Provider: ${collateralBalancePostProvider.toString()}`);

    // const expectedReturnAmountUser = outcomeTokenBalances[2].sub(outcomeTokenBalances[2].mul())

    // CollaterealBalance of EOA should be equal to the smallest Balance
    // "LP should have received collateral tokens back equal to the smallest amount of conditional tokens available"
    expect(
      collateralBalancePost.add(collateralBalancePostProvider)
    ).to.be.equal(outcomeTokenBalances[2]);
    // Should have burned all LP Tokens
    expect(lpTokenBalancePost).to.be.equal(0);
  });
});
