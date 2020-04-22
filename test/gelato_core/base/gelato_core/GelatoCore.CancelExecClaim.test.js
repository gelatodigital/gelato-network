// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect, assert } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
//
const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("GelatoCore.CancelExecClaim", function () {
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
  let mockActionDummy;

  let task;

  let execClaim;
  let execClaim2;

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
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    const gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(
      gelatoCore.address,
      GELATO_GAS_PRICE
    );
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

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address
    );
    await providerModuleGelatoUserProxy.deployed();

    // Provide IceCream
    const MockActionDummy = await ethers.getContractFactory(
      "MockActionDummy",
      sysAdmin
    );

    mockActionDummy = await MockActionDummy.deploy();
    await mockActionDummy.deployed();

    const mockActionDummyGelato = new Action({
      inst: mockActionDummy.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    // Provider registers new acttion

    const newIceCream2 = new IceCream({
      condition: constants.AddressZero,
      actions: [mockActionDummyGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Instantiate ProviderModule that reverts in execPayload()

    await gelatoCore
      .connect(provider)
      .batchProvide(
        executorAddress,
        [newIceCream2],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory
      .connect(seller)
      .create([], []);
    await createTx.wait();
    userProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    const abi = ["function action(bool)"];
    const interFace = new utils.Interface(abi);

    const actionData = interFace.functions.action.encode([true]);

    const gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    const condition = new Condition({
      inst: constants.AddressZero,
      data: constants.HashZero,
    });

    const action = new Action({
      inst: mockActionDummy.address,
      data: actionData,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    task = new Task({
      provider: gelatoProvider,
      condition,
      actions: [action],
      expiryDate: constants.HashZero,
    });

    execClaim = {
      id: 1,
      userProxy: userProxyAddress,
      task,
    };

    execClaim2 = {
      id: 2,
      userProxy: userProxyAddress,
      task,
    };

    const mintTx = await userProxy.mintExecClaim(task);
    await mintTx.wait();
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore.cancelExecClaim", function () {
    it("#1: Cancel execution claim succesfully as user", async function () {
      await expect(userProxy.cancelExecClaim(execClaim))
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim.id);
    });

    it("#2: Cancel execution claim succesfully as provider", async function () {
      await expect(gelatoCore.connect(provider).cancelExecClaim(execClaim))
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim.id);
    });

    it("#3: Cancel execution claim unsuccesfully as random third party", async function () {
      await expect(
        gelatoCore.connect(executor).cancelExecClaim(execClaim)
      ).to.be.revertedWith("GelatoCore.cancelExecClaim: sender");
    });

    it("#4: Cancel execution claim unsuccesfully due to wrong execClaim input", async function () {
      await expect(
        gelatoCore.connect(provider).cancelExecClaim(execClaim2)
      ).to.be.revertedWith(
        "VM Exception while processing transaction: revert GelatoCore.cancelExecClaim: invalid execClaimHash"
      );
    });

    it("#5: Batch Cancel execution claim succesfully as user", async function () {
      // mint second Claim
      const mintTx = await userProxy.mintExecClaim(task);
      await mintTx.wait();

      await expect(userProxy.batchCancelExecClaims([execClaim, execClaim2]))
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim.id)
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim2.id);
    });

    it("#6: Batch Cancel execution claim succesfully as provider", async function () {
      // mint second Claim
      const mintTx = await userProxy.mintExecClaim(task);
      await mintTx.wait();

      await expect(
        gelatoCore
          .connect(provider)
          .batchCancelExecClaims([execClaim, execClaim2])
      )
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim.id)
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim2.id);
    });
  });
});
