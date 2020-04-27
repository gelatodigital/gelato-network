import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-createCpkProxyAndSwap",
  `Creates Cpk proxy for user, sells on batch exchange and tasks a gelato bot to withdraw the funds later and send them back to the users EOA on ${defaultNetwork})`
)
  .addOptionalParam(
    "mnemonicIndex",
    "index of mnemonic in .env that will be used for the user address",
    "0"
  )
  .addOptionalParam(
    "sellToken",
    "address of token to sell (default DAIP)",
    "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa"
  )
  .addOptionalParam(
    "buyToken",
    "address of token to buy (default USDC)",
    "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b"
  )
  .addOptionalParam(
    "sellAmount",
    "amount to sell on batch exchange (default 4*10**18)",
    "4000000000000000000"
  )
  .addOptionalParam(
    "buyAmount",
    "amount of buy token to purchase (default 3.8*10**6)",
    "3800000"
  )
  .addOptionalParam(
    "batchId",
    "Batch Exchange Batch Id after which which the funds will be automatically withdrawn"
  )
  .addOptionalParam(
    "gelatoprovider",
    "Gelato Provider who pays ETH on gelato for the users transaction, defaults to provider of gelato core team",
    "0x8187B4cb7B82132363DCE0BC9e16E47a04f175F6"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    // 1. Determine CPK proxy address of user (mnemoric index 0 by default)
    const { [taskArgs.mnemonicIndex]: user } = await ethers.getSigners();
    const userAddress = await user.getAddress();
    const safeAddress = await run("gc-determineCpkProxyAddress", {
      useraddress: userAddress,
    });

    console.log(safeAddress);

    // 2. Approve proxy address to move X amount of DAI

    const dai = await run("instantiateContract", {
      contractaddress: taskArgs.sellToken,
      contractname: "ERC20",
      write: true,
    });

    // Check if user has sufficient balance
    const sellTokenBalance = await dai.balanceOf(userAddress);
    if (sellTokenBalance < taskArgs.sellAmount)
      throw new Error("Insufficient sellToken to conduct enter stableswap");

    console.log(
      `Approve gnosis safe for ${taskArgs.sellAmount} ${taskArgs.sellToken}`
    );
    // await dai.approve(safeAddress, taskArgs.sellAmount);

    // check if Proxy is already deployed
    const gnosisSafe = await run("instantiateContract", {
      contractname: "IGnosisSafe",
      contractaddress: safeAddress,
      write: true,
      signer: user,
    });

    let safeDeployed = false;
    try {
      const response = await gnosisSafe.NAME();
      safeDeployed = true;
    } catch (error) {
      console.log("safe not deployed, deploy safe");
    }

    // deploy safe
    // if(!safeDeployed)

    // Check if gelato core is a whitelisted module

    let gelatoIsWhitelisted = false;

    const gelatoCore = await run("instantiateContract", {
      contractname: "GelatoCore",
      write: true,
    });

    const whitelistedModules = await gnosisSafe.getModules();
    for (const module of whitelistedModules) {
      if (
        ethers.utils.getAddress(module) ==
        ethers.utils.getAddress(gelatoCore.address)
      ) {
        gelatoIsWhitelisted = true;
        break;
      }
    }

    // Get enable gelatoCore as module calldata
    const enableGelatoData = await run("abi-encode-withselector", {
      contractname: "IGnosisSafe",
      functionname: "enableModule",
      inputs: [gelatoCore.address],
    });

    // encode for Multi send
    const enableGelatoDataMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        0, //operation
        gelatoCore.address, //to
        0, // value
        ethers.utils.hexDataLength(enableGelatoData), // data length
        enableGelatoData, // data
      ]
    );

    // Fetch BatchId if it was not passed
    const batchExchangeAddress = await run("bre-config", {
      addressbook: true,
      addressbookcategory: "gnosisProtocol",
      addressbookentry: "batchExchange",
    });
    const batchExchange = await run("instantiateContract", {
      contractname: "BatchExchange",
      contractaddress: batchExchangeAddress,
      read: true,
    });
    const currentBatchId = await batchExchange.getCurrentBatchId();
    const currentBatchIdBN = ethers.utils.bigNumberify(currentBatchId);
    console.log(`Current Batch Id: ${currentBatchIdBN}`);

    if (!taskArgs.batchId) {
      // Withdraw in 1 batch
      taskArgs.batchId = currentBatchIdBN.add(ethers.utils.bigNumberify("1"));
    }

    console.log(
      `
      Action will withdraw in Batch Id: ${taskArgs.batchId}\n
      Current Batch id: ${currentBatchId}\n
      `
    );

    // Get Sell on batch exchange calldata
    const placeOrderBatchExchangeData = await run("abi-encode-withselector", {
      contractname: "ActionPlaceOrderBatchExchange",
      functionname: "action",
      inputs: [
        userAddress,
        safeAddress,
        taskArgs.sellToken,
        taskArgs.buyToken,
        taskArgs.sellAmount,
        taskArgs.buyAmount,
        taskArgs.batchId,
      ],
    });

    // encode for Multi send
    const placeOrderBatchExchangeDataMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        0, //operation
        batchExchange.address, //to
        0, // value
        ethers.utils.hexDataLength(placeOrderBatchExchangeData), // data length
        placeOrderBatchExchangeData, // data
      ]
    );

    // Get submit task to withdraw from batchExchange on gelato calldata
    const gnosisSafeProviderModuleAddress = await run("bre-config", {
      deployments: true,
      contractname: "ProviderModuleGnosisSafeProxy",
    });

    const gelatoProvider = new GelatoProvider({
      addr: taskArgs.gelatoprovider,
      module: gnosisSafeProviderModuleAddress,
    });

    const condition = new Condition({
      inst: constants.AddressZero,
      data: constants.HashZero,
    });

    const actionWithdrawFromBatchExchangePayload = await run(
      "abi-encode-withselector",
      {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          userAddress,
          safeAddress,
          taskArgs.sellToken,
          taskArgs.buyToken,
        ],
      }
    );

    const actionAddress = await run("bre-config", {
      contractname: "ActionWithdrawBatchExchange",
    });

    const actionWithdrawBatchExchange = new Action({
      inst: actionAddress,
      data: actionWithdrawFromBatchExchangePayload,
      operation: 1,
      value: 0,
      termsOkCheck: true,
    });

    const taskWithdrawBatchExchange = {
      provider: gelatoProvider,
      condition: condition,
      actions: [actionWithdrawBatchExchange],
      expiryDate: constants.HashZero,
    };

    console.log("1");

    const submitTaskData = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "submitTask",
      inputs: [taskWithdrawBatchExchange],
    });

    // encode for Multi send
    const submitTaskDataMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        0, //operation
        gelatoCore.address, //to
        0, // value
        ethers.utils.hexDataLength(submitTaskData), // data length
        submitTaskData, // data
      ]
    );

    // Encode into MULTI SEND
    let encodedMultisendData;
    if (!gelatoIsWhitelisted)
      encodedMultisendData = multisend.interface.functions.multiSend.encode([
        ethers.utils.hexlify(
          ethers.utils.concat([
            enableGelatoDataMultiSend,
            placeOrderBatchExchangeDataMultiSend,
            submitTaskDataMultiSend,
          ])
        ),
      ]);
    else
      encodedMultisendData = multisend.interface.functions.multiSend.encode([
        ethers.utils.hexlify(
          ethers.utils.concat([
            placeOrderBatchExchangeDataMultiSend,
            submitTaskDataMultiSend,
          ])
        ),
      ]);

    //

    // 4. If proxy was deployed, only execTx, if not, createProxyAndExecTx
  });
