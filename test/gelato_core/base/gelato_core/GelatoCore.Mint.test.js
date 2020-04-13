// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("Gelato Core - Minting ", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let actionWithdrawBatchExchange;
  let seller;
  let provider;
  let executor;
  let userProxy;
  let sellerAddress;
  let providerAddress;
  let executorAddress;
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
  let gelatoCore;
  let providerModuleGelatoUserProxy;
  let providerModuleGelatoUserProxyAddress;
  let actionsWithGasPriceCeil;

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

    [seller, executor, provider] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
    MockERC20 = await ethers.getContractFactory("MockERC20");

    // string memory _name, uint256 _mintAmount, address _to, uint8 _decimals
    // Deploy Sell Token
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    // Deploy Buy Token
    buyDecimals = 6;
    buyToken = await MockERC20.deploy(
      "USDC",
      (100 * 10 ** buyDecimals).toString(),
      sellerAddress,
      buyDecimals
    );
    await buyToken.deployed();

    // Deploy WETH
    wethDecimals = 18;
    WETH = await MockERC20.deploy(
      "WETH",
      (100 * 10 ** wethDecimals).toString(),
      sellerAddress,
      wethDecimals
    );
    await WETH.deployed();

    // 2. Create Proxy for seller
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

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore.Mint Tests", function () {
    it("Successfully mint whitelisted executionClaim", async function () {
      /*

        struct ActionPayload {
            address user;
            address userProxy;
            address sendToken;
            address destination;
            uint256 sendAmount;
        }
    */

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

      //   console.log(execClaimHash);

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

    it("Minting reverts => Invalid expiryDate", async function () {
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

    it("Minting reverts => No action Payload", async function () {
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
        providerModule: providerModuleGelatoUserProxyAddress.address,
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

    // DO THE CHECK WITH REVERTING PAYLOAD AND MOVE THE PAYLOAD CHECK FROM EXEC TO MINT
  });
});
