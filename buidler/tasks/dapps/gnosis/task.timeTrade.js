import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gc-timetrade",
  `Creates a gelato task that sells sellToken on Batch Exchange every X mintues/hours/days on Rinkeby`
)
  .addOptionalParam(
    "mnemonicIndex",
    "index of mnemonic in .env that will be used for the user address",
    "0"
  )
  .addOptionalParam(
    "sellToken",
    "address of token to sell (default DAI)",
    "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa"
  )
  .addOptionalParam(
    "buyToken",
    "address of token to buy (default WETH)",
    "0xc778417e063141139fce010982780140aa0cd5ab"
  )
  .addOptionalParam(
    "sellAmount",
    "amount to sell on batch exchange (default 5*10**18)",
    "5000000000000000000"
  )
  .addOptionalParam(
    "buyAmount",
    "amount of buy token to purchase (default 0.005*10**18)",
    "5000000000000000"
  )
  .addOptionalParam(
    "frequency",
    "how often it should be done, important for accurate approvals and expiry date",
    "5"
  )
  .addOptionalParam(
    "seconds",
    "how many seconds between each trade - default & min is 300 (1 batch) - must be divisible by 300",
    "300",
    types.string
  )
  .addOptionalParam(
    "gelatoprovider",
    "Gelato Provider who pays ETH on gelato for the users transaction, defaults to provider of gelato core team"
  )
  .addOptionalParam(
    "saltnonce",
    "CPK factory faltnonce, defaults to standard",
    "0xcfe33a586323e7325be6aa6ecd8b4600d232a9037e83c8ece69413b777dabe65",
    types.string
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    if (parseInt(taskArgs.seconds) % 300 !== 0)
      throw new Error(
        `Passed seconds must be divisible by 300 seconds (duration of one batch)`
      );

    // Batch Exchange Batch duration after which which the funds will be automatically withdrawn (e.g. 1 after one batch
    const batchDuration = ethers.utils
      .bigNumberify(taskArgs.seconds)
      .div(ethers.utils.bigNumberify("300"));

    // 1. Determine CPK proxy address of user (mnemoric index 0 by default)
    const {
      [taskArgs.mnemonicIndex]: user,
      [2]: provider,
    } = await ethers.getSigners();
    const userAddress = await user.getAddress();
    const safeAddress = await run("gc-determineCpkProxyAddress", {
      useraddress: userAddress,
      saltnonce: taskArgs.saltnonce,
    });

    // Deterimine provider
    if (!taskArgs.gelatoprovider)
      taskArgs.gelatoprovider = await run("handleGelatoProvider", {
        gelatoprovider: taskArgs.gelatoprovider,
      });

    if (taskArgs.log) console.log(`Safe Address: ${safeAddress}`);

    // 2. Approve proxy address to move X amount of DAI

    const sellToken = await run("instantiateContract", {
      contractaddress: taskArgs.sellToken,
      contractname: "ERC20",
      write: true,
    });

    // Get the required fee from the providers Fee Contract
    const feeExtractor = await run("instantiateContract", {
      deployments: true,
      contractname: "FeeExtractor",
      read: true,
    });

    const requiredFee = await feeExtractor.getFeeAmount(taskArgs.sellToken);
    if (requiredFee.eq(constants.Zero))
      throw Error(
        "Sell Token not accepted by provider, choose a different token"
      );

    // Check if user has sufficient balance (sell Amount plus required Fee)
    const sellTokenBalance = await sellToken.balanceOf(userAddress);

    if (sellTokenBalance.lte(ethers.utils.bigNumberify(taskArgs.sellAmount)))
      throw new Error("Insufficient sellToken to conduct enter stableswap");

    const totalSellAmount = ethers.utils
      .bigNumberify(taskArgs.sellAmount)
      .mul(ethers.utils.bigNumberify(taskArgs.frequency));

    if (taskArgs.log)
      console.log(`
          Approve gnosis safe to move ${totalSellAmount} of token: ${taskArgs.sellToken}\n`);

    await sellToken.approve(safeAddress, totalSellAmount);

    let safeDeployed = false;
    let gnosisSafe;
    try {
      // check if Proxy is already deployed
      gnosisSafe = await run("instantiateContract", {
        contractname: "IGnosisSafe",
        contractaddress: safeAddress,
        write: true,
        signer: user,
      });
      // Do a test call to see if contract exist
      gnosisSafe.getOwners();
      // If instantiated, contract exist
      safeDeployed = true;
      console.log("User already has safe deployed");
    } catch (error) {
      console.log("safe not deployed, deploy safe and execute tx");
    }

    // Check if gelato core is a whitelisted module

    let gelatoIsWhitelisted = false;

    const gelatoCore = await run("instantiateContract", {
      contractname: "GelatoCore",
      write: true,
      signer: provider,
    });

    if (safeDeployed) {
      const whitelistedModules = await gnosisSafe.getModules();
      for (const module of whitelistedModules) {
        if (
          ethers.utils.getAddress(module) ===
          ethers.utils.getAddress(gelatoCore.address)
        ) {
          gelatoIsWhitelisted = true;
          break;
        }
      }
    }
    if (taskArgs.log)
      console.log(`Is gelato an enabled module? ${gelatoIsWhitelisted}`);

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
        safeAddress, //to
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

    // Batch when we will withdraw the funds
    const withdrawBatch = currentBatchIdBN.add(
      ethers.utils.bigNumberify(batchDuration)
    );

    if (taskArgs.log)
      console.log(
        `Current Batch id: ${currentBatchId}\nAction is expected to withdraw after Batch Id: ${withdrawBatch}\n`
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

    // ############## Condition #####################

    const conditionAddress = await run("bre-config", {
      deployments: true,
      contractname: "ConditionBatchExchangeFundsWithdrawable",
    });

    const conditionData = await run("abi-encode-withselector", {
      contractname: "ConditionBatchExchangeFundsWithdrawable",
      functionname: "ok",
      inputs: [safeAddress, taskArgs.sellToken, taskArgs.buyToken],
    });

    const condition = new Condition({
      inst: conditionAddress,
      data: conditionData,
    });

    // ############## Condition END #####################

    const placeOrderBatchExchangeAddress = await run("bre-config", {
      deployments: true,
      contractname: "ActionPlaceOrderBatchExchange",
    });

    const placeOrderBatchExchangeData = await run("abi-encode-withselector", {
      contractname: "ActionPlaceOrderBatchExchange",
      functionname: "action",
      inputs: [
        userAddress,
        taskArgs.sellToken,
        taskArgs.buyToken,
        taskArgs.sellAmount,
        taskArgs.buyAmount,
        batchDuration,
      ],
    });

    const placeOrderAction = new Action({
      addr: placeOrderBatchExchangeAddress,
      data: placeOrderBatchExchangeData,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    const placeOrderTask = new Task({
      provider: gelatoProvider,
      conditions: [condition],
      actions: [placeOrderAction],
      expiryDate: constants.HashZero,
      autoSubmitNextTask: true,
    });

    // ######### Check if Provider has whitelisted TaskSpec #########
    // 1. Cast Task to TaskSpec
    const taskSpec = new TaskSpec({
      conditions: [condition.inst],
      actions: [placeOrderAction],
      autoSubmitNextTask: true,
      gasPriceCeil: 0, // Placeholder
    });

    // 2. Hash Task Spec
    const taskSpecHash = await gelatoCore.hashTaskSpec(taskSpec);

    // Check if taskSpecHash's gasPriceCeil is != 0
    const isProvided = await gelatoCore.taskSpecGasPriceCeil(
      gelatoProvider.addr,
      taskSpecHash
    );

    // Revert if task spec is not provided
    if (isProvided == 0) {
      // await gelatoCore.provideTaskSpecs([taskSpec]);
      throw Error("Task Spec is not whitelisted by provider");
    } else console.log("already provided");

    // encode for Multi send
    const placeOrderBatchExchangeDataMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        1, //operation
        placeOrderBatchExchangeAddress, //to
        0, // value
        ethers.utils.hexDataLength(placeOrderBatchExchangeData), // data length
        placeOrderBatchExchangeData, // data
      ]
    );

    const submitTaskPayload = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "submitTask",
      inputs: [placeOrderTask],
    });

    const submitTaskMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        Operation.Call, //operation => .Call
        gelatoCore.address, //to
        0, // value
        ethers.utils.hexDataLength(submitTaskPayload), // data length
        submitTaskPayload, // data
      ]
    );

    // Encode into MULTI SEND
    // Get Multisend address
    const multiSendAddress = await run("bre-config", {
      contractaddress: "MultiSend",
      addressbookcategory: "gnosisSafe",
      addressbookentry: "multiSend",
    });

    const multiSend = await run("instantiateContract", {
      contractname: "MultiSend",
      contractaddress: multiSendAddress,
      write: true,
    });

    let encodedMultisendData;
    if (!gelatoIsWhitelisted) {
      encodedMultisendData = multiSend.interface.functions.multiSend.encode([
        ethers.utils.hexlify(
          ethers.utils.concat([
            enableGelatoDataMultiSend,
            placeOrderBatchExchangeDataMultiSend,
            submitTaskMultiSend,
          ])
        ),
      ]);
    } else {
      encodedMultisendData = multiSend.interface.functions.multiSend.encode([
        ethers.utils.hexlify(
          ethers.utils.concat([
            placeOrderBatchExchangeDataMultiSend,
            submitTaskMultiSend,
          ])
        ),
      ]);
    }

    let submitTaskTxHash;
    if (safeDeployed) {
      console.log("Exec Tx");
      submitTaskTxHash = await run("gsp-exectransaction", {
        gnosissafeproxyaddress: safeAddress,
        to: multiSendAddress,
        data: encodedMultisendData,
        operation: 1,
        log: true,
      });
    } else {
      submitTaskTxHash = await run("gc-submitgelatouserproxyoncpk", {
        gnosissafeproxyaddress: safeAddress,
        to: multiSendAddress,
        data: encodedMultisendData,
        operation: 1,
        saltnonce: taskArgs.saltnonce,
        fallbackhandler: "0x40A930851BD2e590Bd5A5C981b436de25742E980", // default
        value: 0,
        log: true,
      });
    }

    if (taskArgs.log)
      console.log(`\n submitTaskTx Hash: ${submitTaskTxHash}\n`);

    // // Wait for tx to get mined
    // const { blockHash: blockhash } = await submitTaskTx.wait();

    // Event Emission verification
    if (taskArgs.events) {
      const parsedSubmissionLog = await run("event-getparsedlog", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        eventname: "LogTaskSubmitted",
        txhash: submitTaskTxHash,
        values: true,
        stringify: true,
      });
      if (parsedSubmissionLog)
        console.log("\n✅ LogTaskSubmitted\n", parsedSubmissionLog);
      else console.log("\n❌ LogTaskSubmitted not found");
    }

    return submitTaskTxHash;

    // 4. If proxy was deployed, only execTx, if not, createProxyAndExecTx
  });
