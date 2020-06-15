import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-withdraw-batch-exchange",
  `Withdraws funds from batch exchange`
)
  .addOptionalParam(
    "token",
    "address of token to sell (default DAI)",
    "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa"
  )

  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    const user = getUser();
    const userAddress = await user.getAddress();
    const safeAddress = await run("gc-determineCpkProxyAddress", {
      useraddress: userAddress,
      saltnonce:
        "0xcfe33a586323e7325be6aa6ecd8b4600d232a9037e83c8ece69413b777dabe69",
    });

    if (taskArgs.log) console.log(`Safe Address: ${safeAddress}`);

    let safeDeployed = false;
    let gelatoIsWhitelisted = false;
    try {
      // check if Proxy is already deployed
      const gnosisSafe = await run("instantiateContract", {
        contractname: "IGnosisSafe",
        contractaddress: safeAddress,
        write: true,
        signer: user,
      });
      // Do a test call to see if contract exist
      await gnosisSafe.getOwners();
      // If instantiated, contract exist
      safeDeployed = true;
      if (taskArgs.log) console.log("User already has safe deployed");

      // Check if gelato is whitelisted module
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
      if (taskArgs.log)
        console.log(`Is gelato an enabled module? ${gelatoIsWhitelisted}`);
    } catch (error) {
      console.log("safe not deployed, deploy safe and execute tx");
    }

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

    // ##### Actions
    const actionAddress = await run("bre-config", {
      contractname: "ActionWithdrawBatchExchange",
      deployments: true,
    });

    const actionWithdrawFromBatchExchangePayload = await run(
      "abi-encode-withselector",
      {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [taskArgs.token],
      }
    );

    const withdrawMultiSend = ethers.utils.solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        1, //operation
        actionAddress, //to
        0, // value
        ethers.utils.hexDataLength(actionWithdrawFromBatchExchangePayload), // data length
        actionWithdrawFromBatchExchangePayload, // data
      ]
    );

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

    const encodedMultisendData = multiSend.interface.functions.multiSend.encode(
      [ethers.utils.hexlify(ethers.utils.concat([withdrawMultiSend]))]
    );

    let submitTaskTxHash;
    if (safeDeployed) {
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
