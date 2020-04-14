// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

describe("Gelato Core - Minting ", function () {
  let seller;
  let provider;
  let executor;
  let userProxy;
  let sellerAddress;
  let providerAddress;
  let executorAddress;
  let userProxyAddress;
  let sellToken; //DAI
  let MockERC20;
  let gelatoUserProxyFactory;
  let sellDecimals;
  let tx;
  let txResponse;
  let gelatoCore;
  let providerModuleGelatoUserProxy;
  let providerModuleGelatoUserProxyAddress;
  let actionsWithGasPriceCeil;
  let user2;
  let user2address;

  beforeEach(async function () {
    // Setup Gelato System
    const result = await run("setupgelato-gelatouserproxies", {
      actions: ["ActionERC20TransferFrom", "ActionERC20TransferFrom"],
    });
    gelatoCore = result.gelatoCore;
    gelatoUserProxyFactory = result.gelatoUserProxyFactory;
    providerModuleGelatoUserProxy = result.providerModuleGelatoUserProxy;
    providerModuleGelatoUserProxyAddress =
      providerModuleGelatoUserProxy.address;
    actionsWithGasPriceCeil = result.actionsWithGasPriceCeil;

    [seller, executor, provider, user2] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
    user2address = await user2.getAddress();
    MockERC20 = await ethers.getContractFactory("MockERC20");

    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    tx = await gelatoUserProxyFactory.create();
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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

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

      // #######

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: "delegatecall",
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // #######

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

      //   const encoder = await ethers.utils.defaultAbiCoder;

      //   let execClaimHash = await encoder.encode(
      //     [
      //       "uint256",
      //       "address",
      //       "address",
      //       "address",
      //       "address",
      //       "address[]",
      //       "bytes",
      //       "bytes[]",
      //       "uint256",
      //     ],
      //     [
      //       execClaim.id,
      //       execClaim.userProxy,
      //       task.provider,
      //       task.providerModule,
      //       task.condition,
      //       task.actions,
      //       task.conditionPayload,
      //       task.actionsPayload,
      //       task.expiryDate,
      //     ]
      //   );

      //   execClaimHash = ethers.utils.solidityKeccak256(
      //     ["bytes"],
      //     [execClaimHash]
      //   );

      // emit LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);

      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.emit(gelatoCore, "LogExecClaimMinted");

      // CouldNt get the execClaimHash to be computed off-chain
      // .withArgs(executorAddress, 1, execClaimHash, execClaim);
    });

    it("Minting reverts => Action not whitelisted", async function () {
      const notWhitelistedAction = actionsWithGasPriceCeil.addresses[0];
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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

      // Mint ExexClaim
      let task = {
        provider: providerAddress,
        providerModule: providerModuleGelatoUserProxyAddress,
        condition: ethers.constants.AddressZero,
        actions: [notWhitelistedAction],
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
        "GelatoCore.mintExecClaim.isProvided:ActionNotProvided"
      );

      // CouldNt get the execClaimHash to be computed off-chain
      // .withArgs(executorAddress, 1, execClaimHash, execClaim);
    });

    it("Minting reverts => Condition not whitelisted", async function () {
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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

      // Mint ExexClaim
      let task = {
        provider: providerAddress,
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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(noActionPayload);

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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

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

      const taskPayloads = [];
      for (const action of actionsWithGasPriceCeil.addresses)
        taskPayloads.push(actionPayload);

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
