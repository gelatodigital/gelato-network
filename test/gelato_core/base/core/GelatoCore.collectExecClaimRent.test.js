// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect, assert } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
//
import initialStateSysAdmin from "../gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;
const EXEC_CLAIM_TENANCY = initialStateSysAdmin.execClaimTenancy;
const EXEC_CLAIM_RENT = initialStateSysAdmin.execClaimRent;

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("GelatoCore.collectExecClaimRent", function () {
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
  let newCam2;

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
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    // Provider registers new acttion

    newCam2 = new CAM({
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
      operation: Operation.Delegatecall,
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

    let oldBlock = await ethers.provider.getBlock();

    const task2 = new Task({
      provider: gelatoProvider,
      condition,
      actions: [action],
      expiryDate: oldBlock.timestamp + 1000000,
    });

    execClaim2 = {
      id: 2,
      userProxy: userProxyAddress,
      task: task2,
    };

    mintPayload = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "mintExecClaim",
      inputs: [task],
    });

    const mintPayload2 = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "mintExecClaim",
      inputs: [task2],
    });

    await userProxy.callAction(gelatoCore.address, mintPayload, 0);
    await userProxy.callAction(gelatoCore.address, mintPayload2, 0);
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore.collectExecClaimRent", function () {
    it("#1: Collect Exec Claim Rent successfully by Executor after skipping time", async function () {
      // Skip the execClaimTenancy
      await ethers.provider.send("evm_increaseTime", [EXEC_CLAIM_TENANCY]);

      const executorBalanceBefore = await gelatoCore.executorStake(
        executorAddress
      );

      const providerBalanceBefore = await gelatoCore.providerFunds(
        providerAddress
      );

      await expect(gelatoCore.connect(executor).collectExecClaimRent(execClaim))
        .to.emit(gelatoCore, "LogCollectExecClaimRent")
        .withArgs(
          executorAddress,
          providerAddress,
          execClaim.id,
          EXEC_CLAIM_RENT
        );

      const executorBalanceAfter = await gelatoCore.executorStake(
        executorAddress
      );

      const providerBalanceAfter = await gelatoCore.providerFunds(
        providerAddress
      );

      // Provider Funds has decreased
      expect(providerBalanceAfter).to.equal(
        ethers.utils
          .bigNumberify(providerBalanceBefore)
          .sub(ethers.utils.bigNumberify(EXEC_CLAIM_RENT)),
        "Provider Funds on gelato increased by EXEC CLAIM RENT"
      );

      // Executor Stake has increased
      expect(executorBalanceAfter).to.equal(
        ethers.utils
          .bigNumberify(executorBalanceBefore)
          .add(ethers.utils.bigNumberify(EXEC_CLAIM_RENT)),
        "Executor Stake on gelato increased by EXEC CLAIM RENT"
      );
    });

    it("#2: Revert when collecting Exec Claim Rent successfully by Executor after NOT skipping time", async function () {
      // Skip the execClaimTenancy

      await expect(
        gelatoCore.connect(executor).collectExecClaimRent(execClaim)
      ).to.be.revertedWith("GelatoCore.collectExecClaimRent:RentNotDue");
    });

    it("#3: Revert when collecting Exec Claim Rent successfully by anyone else than executor", async function () {
      // Skip the execClaimTenancy

      await expect(
        gelatoCore.connect(provider).collectExecClaimRent(execClaim)
      ).to.be.revertedWith("GelatoCore.collectExecClaimRent:NotAssigned");
    });

    it("#4: Revert when collecting Exec Claim Rent due to expired execClaim", async function () {
      // Skip the execClaimTenancy
      await ethers.provider.send("evm_increaseTime", [1000000]);

      await expect(
        gelatoCore.connect(executor).collectExecClaimRent(execClaim2)
      ).to.be.revertedWith("GelatoCore.collectExecClaimRent:ExecClaimExpired");
    });

    it("#5: Revert when collecting Exec Claim Rent due to provider having unprovided CAM (only for non-self providers)", async function () {
      // Unprovide CAM
      await gelatoCore.connect(provider).unprovideCAMs([newCam2]);

      await ethers.provider.send("evm_increaseTime", [EXEC_CLAIM_TENANCY]);

      await expect(
        gelatoCore.connect(executor).collectExecClaimRent(execClaim)
      ).to.be.revertedWith("GelatoCore.collectExecClaimRent:CAMnotProvided");
    });

    it("#6: Revert when collecting Exec Claim Rent due to provider having unprovided Funds ", async function () {
      // get current provider funds
      let currentProviderFunds = await gelatoCore.providerFunds(
        providerAddress
      );

      const withdrawAmount = ethers.utils
        .bigNumberify(currentProviderFunds)
        .sub(ethers.utils.bigNumberify(EXEC_CLAIM_RENT))
        .add(ethers.utils.bigNumberify("1"));

      // Withdraw exccess funds to have below EXEC_CLAIM_RENT
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(constants.AddressZero);
      await gelatoCore.connect(provider).unprovideFunds(withdrawAmount);
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);

      currentProviderFunds = await gelatoCore.providerFunds(providerAddress);

      await ethers.provider.send("evm_increaseTime", [EXEC_CLAIM_TENANCY]);

      await expect(
        gelatoCore.connect(executor).collectExecClaimRent(execClaim)
      ).to.be.revertedWith("GelatoCore.collectExecClaimRent:ProviderIlliquid");
    });

    it("#7: Revert when collecting Exec Claim Rent due to wrong execCLaim ", async function () {
      // Change min. stake of providers to below 1 finney

      execClaim.id = 100;

      await expect(
        gelatoCore.connect(executor).collectExecClaimRent(execClaim)
      ).to.be.revertedWith(
        "GelatoCore.collectExecClaimRent:InvalidExecClaimHash"
      );
    });

    it("#8: BATCH Collect Exec Claim Rent successfully by Executor after skipping time", async function () {
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
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const tempTask = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const tempExecClaim = {
        id: 3,
        userProxy: userProxyAddress,
        task: tempTask,
      };

      mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [tempTask],
      });

      await userProxy.callAction(gelatoCore.address, mintPayload, 0);

      await ethers.provider.send("evm_increaseTime", [EXEC_CLAIM_TENANCY]);

      await expect(
        gelatoCore
          .connect(executor)
          .batchCollectExecClaimRent([execClaim, tempExecClaim])
      )
        .to.emit(gelatoCore, "LogCollectExecClaimRent")
        .withArgs(
          executorAddress,
          providerAddress,
          execClaim.id,
          EXEC_CLAIM_RENT
        )
        .to.emit(gelatoCore, "LogCollectExecClaimRent")
        .withArgs(
          executorAddress,
          providerAddress,
          tempExecClaim.id,
          EXEC_CLAIM_RENT
        );
    });
  });
});
