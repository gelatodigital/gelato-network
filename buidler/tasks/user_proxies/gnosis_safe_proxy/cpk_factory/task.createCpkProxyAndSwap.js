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
    "address of token to sell (default DAI)",
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
    "5000000000000000000"
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
    // 1. Determine CPK proxy address of user (mnemoric index 0 by default)
    const { [taskArgs.mnemonicIndex]: user } = await ethers.getSigners();
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

    // Check if user has sufficient balance
    const sellTokenBalance = await sellToken.balanceOf(userAddress);
    if (
      parseInt(sellTokenBalance.toString()) <
      parseInt(taskArgs.sellAmount.toString())
    )
      throw new Error("Insufficient sellToken to conduct enter stableswap");

    if (taskArgs.log)
      console.log(
        `Approve gnosis safe for ${taskArgs.sellAmount} ${taskArgs.sellToken}`
      );

    await sellToken.approve(safeAddress, taskArgs.sellAmount);

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
      const name = await gnosisSafe.getOwners();
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

    if (!taskArgs.batchId) {
      // Withdraw in 1 batch
      taskArgs.batchId = currentBatchIdBN.add(ethers.utils.bigNumberify("1"));
    }

    if (taskArgs.log)
      console.log(
        `
      Action will withdraw in Batch Id: ${taskArgs.batchId}\n
      Current Batch id: ${currentBatchId}\n
      `
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
        inputs: [taskArgs.sellToken, taskArgs.buyToken],
      }
    );

    const actionAddress = await run("bre-config", {
      contractname: "ActionWithdrawBatchExchange",
      deployments: true,
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

    // Get Sell on batch exchange calldata
    const placeOrderBatchExchangeData = await run("abi-encode-withselector", {
      contractname: "ActionPlaceOrderBatchExchangeWithWithdraw",
      functionname: "action",
      inputs: [
        userAddress,
        taskArgs.sellToken,
        taskArgs.buyToken,
        taskArgs.sellAmount,
        taskArgs.buyAmount,
        taskArgs.batchId,
        // Withdraw action inputs
        gelatoCore.address,
        taskWithdrawBatchExchange,
      ],
    });

    // encode for Multi send
    const actionPlaceOrderBatchExchangeWithWithdraw = await run("bre-config", {
      deployments: true,
      contractname: "ActionPlaceOrderBatchExchangeWithWithdraw",
    });

    const placeOrderBatchExchangeDataMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        1, //operation
        actionPlaceOrderBatchExchangeWithWithdraw, //to
        0, // value
        ethers.utils.hexDataLength(placeOrderBatchExchangeData), // data length
        placeOrderBatchExchangeData, // data
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
          ])
        ),
      ]);
    } else {
      encodedMultisendData = multiSend.interface.functions.multiSend.encode([
        ethers.utils.hexlify(
          ethers.utils.concat([placeOrderBatchExchangeDataMultiSend])
        ),
      ]);
      console.log("only placeOrder");
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
        log: true,
        saltnonce: taskArgs.saltnonce,
        fallbackhandler: "0x40A930851BD2e590Bd5A5C981b436de25742E980", // default
        value: 0,
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
