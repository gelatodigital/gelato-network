// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
const FEE_USD = 2;
const FEE_ETH = 9000000000000000;

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("Gnosis - ActionWithdrawBatchExchange - Action", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.

  let Multisend;
  let multisend;
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

  beforeEach(async function () {
    // Setup Gelato System
    const result = await run("setupgelato-gelatouserproxies");
    gelatoCore = result.gelatoCore;
    gelatoUserProxyFactory = result.gelatoUserProxyFactory;
    providerModuleGelatoUserProxy = result.providerModuleGelatoUserProxy;
    providerModuleGelatoUserProxyAddress =
      providerModuleGelatoUserProxy.address;

    // Get the ContractFactory and Signers here.
    MockBatchExchange = await ethers.getContractFactory("MockBatchExchange");
    ActionWithdrawBatchExchange = await ethers.getContractFactory(
      "ActionWithdrawBatchExchange"
    );
    MockERC20 = await ethers.getContractFactory("MockERC20");
    GelatoUserProxyFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );

    [seller, executor, provider] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();

    // Deploy MockBatchExchange action
    mockBatchExchange = await MockBatchExchange.deploy();
    await mockBatchExchange.deployed();

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

    // address _batchExchange, address _weth, address _gelatoProvider
    // Deploy Withdraw action
    actionWithdrawBatchExchange = await ActionWithdrawBatchExchange.deploy(
      mockBatchExchange.address,
      WETH.address,
      providerAddress
    );
    await actionWithdrawBatchExchange.deployed();

    // Create User Proxy

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

    // Whitelist action by provider
    await gelatoCore.connect(provider).provideActions([
      {
        addresses: [actionWithdrawBatchExchange.address],
        gasPriceCeil: ethers.utils.parseUnits("100", "gwei"),
      },
    ]);

    Multisend = await ethers.getContractFactory("Multisend");
    multisend = await Multisend.deploy();
    await multisend.deployed();
  });

  it("Test", async () => {
    const payload = await run("abi-encode-withselector", {
      contractname: "MockBatchExchange",
      functionname: "setValidWithdrawRequest",
      inputs: ["0x038B86d9d8FAFdd0a02ebd1A476432877b0107C8"],
    });

    console.log(`Payload:

      Payload: ${payload}

    `);

    const encodedData = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        0, //operation
        mockBatchExchange.address, //to
        0, // value
        ethers.utils.hexDataLength(payload), // data length
        payload, // data
      ]
    );

    console.log(`:

      Encoded Data: ${encodedData}\n

      Multisend: ${ethers.utils.hexlify(
        ethers.utils.concat([encodedData, encodedData])
      )}

    `);

    const encodedMultisendData = multisend.interface.functions.multiSend.encode(
      [ethers.utils.hexlify(ethers.utils.concat([encodedData, encodedData]))]
    );

    // console.log(encodedData);
    // console.log();
    // console.log(encodedMultisendData);
    // console.log();
    // console.log(
    //   ethers.utils.hexlify(ethers.utils.concat([encodedData, encodedData]))
    // );

    await expect(
      userProxy.delegatecallAction(multisend.address, encodedMultisendData)
    )
      .to.emit(mockBatchExchange, "LogWithdrawRequest")
      .to.emit(mockBatchExchange, "LogCounter");
  });
});
