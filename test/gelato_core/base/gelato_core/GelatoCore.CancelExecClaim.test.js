// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect, assert } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
const OPERATION = {
  call: 0,
  delegatecall: 1,
};
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
  let tx;
  let txResponse;
  let providerModuleGelatoUserProxy;
  let gelatoCore;
  let mockActionDummy;
  let execClaim;
  let execClaim2;
  let mintPayload;

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

    // Call proxyExtcodehash on Factory and deploy ProviderModuleGelatoUserProxy with constructorArgs
    const proxyExtcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy([
      proxyExtcodehash,
    ]);

    // Provide CAM
    const MockActionDummy = await ethers.getContractFactory(
      "MockActionDummy",
      sysAdmin
    );

    mockActionDummy = await MockActionDummy.deploy();
    await mockActionDummy.deployed();

    const mockActionDummyGelato = new Action({
      inst: mockActionDummy.address,
      data: constants.HashZero,
      operation: "delegatecall",
      value: 0,
      termsOkCheck: true,
    });

    // Provider registers new acttion

    const newCam2 = new CAM({
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
        [newCam2],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    tx = await gelatoUserProxyFactory.connect(seller).create();
    txResponse = await tx.wait();

    const executionEvent = await run("event-getparsedlog", {
      contractname: "GelatoUserProxyFactory",
      contractaddress: gelatoUserProxyFactory.address,
      eventname: "LogCreation",
      txhash: txResponse.transactionHash,
      blockhash: txResponse.blockHash,
      values: true,
      stringify: true,
    });

    userProxyAddress = executionEvent.userProxy;

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
      operation: "delegatecall",
      value: 0,
      termsOkCheck: true,
    });

    const task = new Task({
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

    mintPayload = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "mintExecClaim",
      inputs: [task],
    });

    await userProxy.callAction(gelatoCore.address, mintPayload, 0);
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore.cancelExecClaim", function () {
    it("#1: Cancel execution claim succesfully as user", async function () {
      const cancelPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "cancelExecClaim",
        inputs: [execClaim],
      });

      await expect(userProxy.callAction(gelatoCore.address, cancelPayload, 0))
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

    it("#4: Cancel execution claim succesfully as random third party IF Expiry date is NOT 0 and expired", async function () {
      // Mint execClaim with expiry != 0

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
        operation: "delegatecall",
        value: 0,
        termsOkCheck: true,
      });

      let oldBlock = await ethers.provider.getBlock();

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: oldBlock.timestamp + 1000000,
      });

      execClaim = {
        id: 2,
        userProxy: userProxyAddress,
        task,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      await userProxy.callAction(gelatoCore.address, mintPayload, 0);

      await expect(
        gelatoCore.connect(executor).cancelExecClaim(execClaim)
      ).to.be.revertedWith("GelatoCore.cancelExecClaim: sender");

      await ethers.provider.send("evm_increaseTime", [1000000]);

      await expect(gelatoCore.connect(executor).cancelExecClaim(execClaim))
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim.id);
    });

    it("#5: Cancel execution claim unsuccesfully due to wrong execClaim input", async function () {
      await expect(
        gelatoCore.connect(provider).cancelExecClaim(execClaim2)
      ).to.be.revertedWith(
        "VM Exception while processing transaction: revert GelatoCore.cancelExecClaim: invalid execClaimHash"
      );
    });

    it("#6: Batch Cancel execution claim succesfully as user", async function () {
      // mint second Claim
      await userProxy.callAction(gelatoCore.address, mintPayload, 0);

      const cancelPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "batchCancelExecClaim",
        inputs: [[execClaim, execClaim2]],
      });

      await expect(userProxy.callAction(gelatoCore.address, cancelPayload, 0))
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim.id)
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim2.id);
    });

    it("#6: Batch Cancel execution claim succesfully as provider", async function () {
      // mint second Claim
      await userProxy.callAction(gelatoCore.address, mintPayload, 0);

      await expect(
        gelatoCore
          .connect(provider)
          .batchCancelExecClaim([execClaim, execClaim2])
      )
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim.id)
        .to.emit(gelatoCore, "LogExecClaimCancelled")
        .withArgs(execClaim2.id);
    });
  });
});
