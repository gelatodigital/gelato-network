// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
const FEE_USD = 2;
const FEE_ETH = 9000000000000000;
const OPERATION = {
  call: 0,
  delegatecall: 1,
};
const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

describe("Gelato Core - Minting ", function () {
  let actionWithdrawBatchExchange;
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
  let sellToken; //DAI
  let buyToken; //USDC
  let ActionWithdrawBatchExchange;
  let MockERC20;
  let MockBatchExchange;
  let mockBatchExchange;
  let WETH;
  let GelatoUserProxyFactory;
  let gelatoUserProxyFactory;
  let sellDecimals;
  let buyDecimals;
  let wethDecimals;
  let tx;
  let txResponse;
  let providerModuleGelatoUserProxy;
  let providerModuleGelatoUserProxyAddress;
  let gelatoCore;
  let user2;
  let user2address;

  beforeEach(async function () {
    // Get signers
    [seller, provider, executor, sysAdmin, user2] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
    sysAdminAddress = await sysAdmin.getAddress();
    user2address = await user2.getAddress();

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

    // Deploy Condition (if necessary)

    // Deploy Actions
    // // ERCTransferFROM
    const ActionERC20TransferFrom = await ethers.getContractFactory(
      "ActionERC20TransferFrom",
      sysAdmin
    );
    const actionERC20TransferFrom = await ActionERC20TransferFrom.deploy();
    await actionERC20TransferFrom.deployed();

    // // #### ActionWithdrawBatchExchange Start ####
    const MockBatchExchange = await ethers.getContractFactory(
      "MockBatchExchange"
    );
    mockBatchExchange = await MockBatchExchange.deploy();
    await mockBatchExchange.deployed();

    MockERC20 = await ethers.getContractFactory("MockERC20");
    wethDecimals = 18;
    WETH = await MockERC20.deploy(
      "WETH",
      (100 * 10 ** wethDecimals).toString(),
      sellerAddress,
      wethDecimals
    );
    await WETH.deployed();

    const ActionWithdrawBatchExchange = await ethers.getContractFactory(
      "ActionWithdrawBatchExchange"
    );
    actionWithdrawBatchExchange = await ActionWithdrawBatchExchange.deploy(
      mockBatchExchange.address,
      WETH.address,
      providerAddress
    );
    // // #### ActionWithdrawBatchExchange End ####

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Register new provider CAM on core with provider EDITS NEED ä#######################

    const condition = new Condition({
      inst: constants.AddressZero,
      data: constants.HashZero,
    });

    const actionERC20TransferFromGelato = new Action({
      inst: actionERC20TransferFrom.address,
      data: constants.HashZero,
      operation: "delegatecall",
      termsOkCheck: true,
    });

    const actionWithdrawBatchExchangeGelato = new Action({
      inst: actionWithdrawBatchExchange.address,
      data: constants.HashZero,
      operation: "delegatecall",
      termsOkCheck: true,
    });

    const newCam = new CAM({
      condition: condition.inst,
      actions: [actionWithdrawBatchExchangeGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call batchProvider(executor, CAMS[], providerModules[])
    await gelatoCore
      .connect(provider)
      .batchProvide(
        executorAddress,
        [newCam],
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

    // DEPLOY DUMMY ERC20s
    // // Deploy Sell Token
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    // //  Deploy Buy Token
    buyDecimals = 6;
    buyToken = await MockERC20.deploy(
      "USDC",
      (100 * 10 ** buyDecimals).toString(),
      sellerAddress,
      buyDecimals
    );
    await buyToken.deployed();

    // Pre-fund batch Exchange
    await buyToken.mint(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", buyDecimals)
    );
    await sellToken.mint(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", sellDecimals)
    );
    await WETH.mint(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", wethDecimals)
    );
  });

  describe("GelatoCore.Mint Tests", function () {
    it("Successfully mint whitelisted executionClaim", async function () {
      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // Mint ExexClaim
      // let task = {
      //   provider: providerAddress,
      //   providerModule: providerModuleGelatoUserProxyAddress,
      //   condition: ethers.constants.AddressZero,
      //   actions: actionsWithGasPriceCeil.addresses,
      //   conditionPayload: ethers.constants.HashZero,
      //   actionsPayload: taskPayloads,
      //   expiryDate: 0,
      // };

      // #######

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: "delegatecall",
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      const camHash = await gelatoCore.camHash(condition.inst, [action]);

      await expect(userProxy.callAction(gelatoCore.address, mintPayload))
        .to.emit(gelatoCore, "LogExecClaimMinted")
        .withArgs(executorAddress, 1, camHash, execClaim);

      // CouldNt get the execClaimHash to be computed off-chain
      // .withArgs(executorAddress, 1, execClaimHash, execClaim);
    });

    it("Minting reverts => Action not whitelisted", async function () {
      const notWhitelistedAction = actionERC20TransferFromGelato.address;
      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: notWhitelistedAction,
        data: actionPayload,
        operation: "delegatecall",
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.be.revertedWith(
        "GelatoCore.mintExecClaim.isProvided:ActionNotProvided"
      );

      // CouldNt get the execClaimHash to be computed off-chain
      // .withArgs(executorAddress, 1, execClaimHash, execClaim);
    });

    it("Minting reverts => Condition not whitelisted", async function () {
      const notWhitelistedCondition = actionWithdrawBatchExchange.address;

      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: notWhitelistedCondition,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: "delegatecall",
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.be.revertedWith(
        "GelatoCore.mintExecClaim.isProvided:ConditionNotProvided"
      );
    });

    it("Minting reverts => Selected Provider with Executor that is not min staked", async function () {
      const revertingProviderAddress = sellerAddress;
      const notWhitelistedCondition = actionsWithGasPriceCeil.addresses[0];
      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // Mint ExexClaim
      let task = {
        provider: revertingProviderAddress,
        providerModule: providerModuleGelatoUserProxyAddress,
        condition: notWhitelistedCondition,
        actions: actionsWithGasPriceCeil.addresses,
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: taskPayloads,
        expiryDate: 0,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.be.revertedWith(
        "GelatoCore.mintExecClaim: executorByProvider's stake is insufficient"
      );
    });

    it("Minting reverts => Invalid expiryDate", async function () {
      const revertingProviderAddress = sellerAddress;
      const notWhitelistedCondition = actionsWithGasPriceCeil.addresses[0];
      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // Mint ExexClaim
      let task = {
        provider: providerAddress,
        providerModule: providerModuleGelatoUserProxyAddress,
        condition: ethers.constants.AddressZero,
        actions: actionsWithGasPriceCeil.addresses,
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: taskPayloads,
        expiryDate: 1586776139,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.be.revertedWith("GelatoCore.mintExecClaim: Invalid expiryDate");
    });

    it("Minting reverts => InvalidProviderModule", async function () {
      const revertingProviderMouleAddress = sellerAddress;
      const notWhitelistedCondition = actionsWithGasPriceCeil.addresses[0];
      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // Mint ExexClaim
      let task = {
        provider: providerAddress,
        providerModule: revertingProviderMouleAddress,
        condition: ethers.constants.AddressZero,
        actions: actionsWithGasPriceCeil.addresses,
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: taskPayloads,
        expiryDate: 0,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // GelatoCore.mintExecClaim.isProvided:InvalidProviderModule
      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.be.revertedWith(
        "GelatoCore.mintExecClaim.isProvided:InvalidProviderModule"
      );
    });

    it("Minting successful => No action Payload", async function () {
      const noActionPayload = ethers.constants.AddressZero;

      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      // Mint ExexClaim
      let task = {
        provider: providerAddress,
        providerModule: providerModuleGelatoUserProxyAddress,
        condition: ethers.constants.AddressZero,
        actions: actionsWithGasPriceCeil.addresses,
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: taskPayloads,
        expiryDate: 0,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // GelatoCore.mintExecClaim.isProvided:InvalidProviderModule
      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.emit(gelatoCore, "LogExecClaimMinted");
    });

    it("mintSelfProvidedExecClaim success (Self-provider), not whitelisted action, assigning new executor and staking", async function () {
      const actionInputs = {
        user: user2address,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // 2. Create Proxy for seller
      tx = await gelatoUserProxyFactory.connect(user2).create();
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

      const user2addressProxyAddress = executionEvent.userProxy;

      const user2addressProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        user2addressProxyAddress
      );

      // Mint ExexClaim
      let task = {
        provider: user2addressProxyAddress,
        providerModule: ethers.constants.AddressZero,
        condition: ethers.constants.AddressZero,
        actions: actionsWithGasPriceCeil.addresses,
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: taskPayloads,
        expiryDate: 0,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintSelfProvidedExecClaim",
        inputs: [task, executorAddress],
      });

      let execClaim = {
        id: 1,
        userProxy: user2addressProxyAddress,
        task,
      };

      // GelatoCore.mintExecClaim.isProvided:InvalidProviderModule
      await expect(
        user2addressProxy
          .connect(user2)
          .callAction(gelatoCore.address, mintPayload, {
            value: ethers.utils.parseUnits("1", "ether"),
          })
      ).to.emit(gelatoCore, "LogExecClaimMinted");
    });

    it("mintSelfProvidedExecClaim reverts (Self-provider), not staking and hence cannot assign executor", async function () {
      const actionInputs = {
        user: user2address,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // 2. Create Proxy for seller
      tx = await gelatoUserProxyFactory.connect(user2).create();
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

      const user2addressProxyAddress = executionEvent.userProxy;

      const user2addressProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        user2addressProxyAddress
      );

      // Mint ExexClaim
      let task = {
        provider: user2addressProxyAddress,
        providerModule: ethers.constants.AddressZero,
        condition: ethers.constants.AddressZero,
        actions: actionsWithGasPriceCeil.addresses,
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: taskPayloads,
        expiryDate: 0,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintSelfProvidedExecClaim",
        inputs: [task, executorAddress],
      });

      let execClaim = {
        id: 1,
        userProxy: user2addressProxyAddress,
        task,
      };

      // GelatoCore.mintExecClaim.isProvided:InvalidProviderModule
      await expect(
        user2addressProxy
          .connect(user2)
          .callAction(gelatoCore.address, mintPayload)
      ).to.revertedWith(
        "GelatoProviders.providerAssignsExecutor: isProviderMinStaked()"
      );
    });

    it("mintSelfProvidedExecClaim reverts (Self-provider), inputting other address as provider", async function () {
      const actionInputs = {
        user: user2address,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // 2. Create Proxy for seller
      tx = await gelatoUserProxyFactory.connect(user2).create();
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

      const user2addressProxyAddress = executionEvent.userProxy;

      const user2addressProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        user2addressProxyAddress
      );

      // Mint ExexClaim
      let task = {
        provider: ethers.constants.AddressZero,
        providerModule: ethers.constants.AddressZero,
        condition: ethers.constants.AddressZero,
        actions: actionsWithGasPriceCeil.addresses,
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: taskPayloads,
        expiryDate: 0,
      };

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintSelfProvidedExecClaim",
        inputs: [task, executorAddress],
      });

      let execClaim = {
        id: 1,
        userProxy: user2addressProxyAddress,
        task,
      };

      // GelatoCore.mintExecClaim.isProvided:InvalidProviderModule
      await expect(
        user2addressProxy
          .connect(user2)
          .callAction(gelatoCore.address, mintPayload)
      ).to.revertedWith(
        "GelatoCore.mintSelfProvidedExecClaim: sender not provider"
      );
    });
  });
});
