import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gc-balancetrade",
  `Creates a gelato task that sells sellToken on Batch Exchange every time users sellToken Balance reaches a certain threshold on Rinkeby`
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
    "amount of buy token to purchase (default 1 => market order)",
    "1"
  )
  .addOptionalParam(
    "increaseAmount",
    "Amount in sellToken balance increase that should trigger the order placement - default: 0*10**18",
    "0",
    types.string
  )
  .addOptionalParam(
    "frequency",
    "how often it should be done, important for accurate approvals and expiry date",
    "5",
    types.string
  )
  .addOptionalParam(
    "seconds",
    "how many seconds between each order placement & withdrawRequest - default & min is 300 (1 batch) - must be divisible by 300",
    "300",
    types.string
  )
  .addOptionalParam(
    "gelatoprovider",
    "Gelato Provider who pays ETH on gelato for the users transaction, defaults to provider of gelato core team",
    "0x518eAa8f962246bCe2FA49329Fe998B66d67cbf8",
    types.string
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
      // [2]: provider,
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
      await gnosisSafe.getOwners();
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
      // signer: provider,
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

    // ############## Condition

    const conditionAddress = await run("bre-config", {
      deployments: true,
      contractname: "ConditionBalanceStateful",
    });

    // address _account, address _token, uint256 _refBalance, bool _greaterElseSmalle
    const conditionData = await run("abi-encode-withselector", {
      contractname: "ConditionBalanceStateful",
      functionname: "ok",
      inputs: [safeAddress, userAddress, taskArgs.sellToken, true],
    });

    const condition = new Condition({
      inst: conditionAddress,
      data: conditionData,
    });

    // Get Sell on batch exchange calldata
    const placeOrderBatchExchangeAddress = await run("bre-config", {
      deployments: true,
      contractname: "ActionPlaceOrderBatchExchangeWithSlippage",
    });

    const placeOrderBatchExchangeData = await run("abi-encode-withselector", {
      contractname: "ActionPlaceOrderBatchExchangeWithSlippage",
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

    const setConditionData = await run("abi-encode-withselector", {
      contractname: "ConditionBalanceStateful",
      functionname: "setRefBalance",
      inputs: [taskArgs.increaseAmount, taskArgs.sellToken, userAddress, true],
    });

    const setConditionBalanceAction = new Action({
      addr: conditionAddress,
      data: setConditionData,
      operation: Operation.Call,
      termsOkCheck: false,
    });

    const placeOrderTask = new Task({
      provider: gelatoProvider,
      conditions: [condition],
      actions: [placeOrderAction, setConditionBalanceAction],
      expiryDate: constants.HashZero,
      autoResubmitSelf: true,
    });

    // ######### Check if Provider has whitelisted TaskSpec #########
    const isProvided = await run("gc-check-if-provided", {
      task: placeOrderTask,
      provider: gelatoProvider.addr,
      // taskspecname: "balanceTrade",
    });

    if (!isProvided) {
      // await gelatoCore.provideTaskSpecs([taskSpec1]);
      throw Error(
        `Task Spec is not provided by provider: ${taskArgs.gelatoprovider}. Please provide it by running the gc-providetaskspec script`
      );
    } else console.log("already provided");

    // ############################################### Encode Submit Task on Gelato Core

    const submitTaskPayload = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "submitTask",
      inputs: [placeOrderTask],
    });

    const setConditionMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        Operation.Call, //operation => .Call
        conditionAddress, //to
        0, // value
        ethers.utils.hexDataLength(setConditionData), // data length
        setConditionData, // data
      ]
    );

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
            setConditionMultiSend,
            submitTaskMultiSend,
          ])
        ),
      ]);
    } else {
      encodedMultisendData = multiSend.interface.functions.multiSend.encode([
        ethers.utils.hexlify(
          ethers.utils.concat([setConditionMultiSend, submitTaskMultiSend])
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
  });
