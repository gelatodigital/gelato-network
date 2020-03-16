import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-createproxyandmint",
  `Sends tx to GelatoCore.createProxyAndMint() or if --createtwo to .createTwoProxyAndMint()  on [--network] (default: ${defaultNetwork})`
)
  // GelatoCore.mintExecutionClaim params
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Defaults to address 0 for self-conditional actions"
  )
  .addOptionalPositionalParam(
    "actionname",
    "Actionname (must be inside buidler.config) OR --actionaddress MUST be supplied."
  )
  .addOptionalParam("gelatoprovider", "Defaults to network addressbook default")
  .addOptionalParam("gelatoexecutor", "Defaults to network addressbook default")
  .addOptionalParam("conditionaddress", "", constants.AddressZero)
  .addOptionalParam("actionaddress", "Must be supplied if not <actionname>")
  .addOptionalParam("conditionpayload", "Payload for optional condition")
  .addOptionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalParam(
    "executionclaimexpirydate",
    "Defaults to 0 for gelatoexecutor's maximum",
    constants.HashZero
  )
  // GnosisSafeProxy Setup
  .addFlag("createtwo", "Call gelatoCore.createTwoProxyAndMint()")
  .addOptionalParam(
    "mastercopy",
    "The deployed implementation code the created proxy should point to"
  )
  .addOptionalParam("initializer", "Payload for gnosis safe proxy setup tasks")
  .addOptionalParam(
    "saltnonce",
    "Supply for createTwoProxyAndMint()",
    42069,
    types.int
  )
  .addFlag("setup", "Initialize gnosis safe by calling its setup function")
  .addOptionalVariadicPositionalParam(
    "owners",
    "Supply with --setup: List of owners. Defaults to ethers signer."
  )
  .addOptionalParam(
    "threshold",
    "Supply with --setup: number of required confirmations for a Safe Tx.",
    1,
    types.int
  )
  .addOptionalParam(
    "to",
    "Supply with --setup: to address.",
    constants.AddressZero
  )
  .addOptionalParam(
    "data",
    "Supply with --setup: payload for optional delegate call",
    constants.HashZero
  )
  .addOptionalParam(
    "defaultpayloadscript",
    "Deployed contract Script's (also --to if no --to) default --data"
  )
  .addOptionalParam(
    "fallbackhandler",
    "Supply with --setup:  Handler for fallback calls to this contract",
    constants.AddressZero
  )
  .addOptionalParam(
    "paymenttoken",
    "Supply with --setup:  Token that should be used for the payment (0 is ETH)",
    constants.AddressZero
  )
  .addOptionalParam(
    "payment",
    "Supply with --setup:  Value that should be paid",
    0,
    types.int
  )
  .addOptionalParam(
    "paymentreceiver",
    "Supply with --setup:  Adddress that should receive the payment (or 0 if tx.origin)t",
    constants.AddressZero
  )
  .addOptionalParam(
    "funding",
    "ETH value to be sent to newly created gelato user proxy",
    "0",
    types.string
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // Command Line Argument Checks
      // Condition and Action for minting
      if (!taskArgs.actionname && !taskArgs.actionaddress)
        throw new Error(`\n Must supply <actionname> or --actionaddress`);
      if (
        taskArgs.conditionname &&
        !taskArgs.conditionname.startsWith("Condition")
      ) {
        throw new Error(
          `\nInvalid condition: ${taskArgs.conditionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }
      if (taskArgs.actionname && !taskArgs.actionname.startsWith("Action")) {
        throw new Error(
          `\nInvalid action: ${taskArgs.actionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }
      // Gnosis Safe creation
      if (!taskArgs.initializer && !taskArgs.setup)
        throw new Error("Must provide initializer payload or --setup args");
      else if (taskArgs.initializer && taskArgs.setup)
        throw new Error("Provide EITHER initializer payload OR --setup args");
      if (taskArgs.data !== constants.HashZero && taskArgs.defaultpayloadscript)
        throw new Error("Provide EITHER --data OR --defaultpayloadscript");

      // Gelato User Proxy (GnosisSafeProxy) creation params
      if (!taskArgs.mastercopy) {
        taskArgs.mastercopy = await run("bre-config", {
          addressbookcategory: "gnosisSafe",
          addressbookentry: "mastercopy"
        });
      }

      if (!taskArgs.mastercopy)
        throw new Error("No taskArgs.mastercopy for proxy defined");

      if (taskArgs.setup && !taskArgs.owners) {
        const signerAddress = await run("ethers", {
          signer: true,
          address: true
        });
        taskArgs.owners = [signerAddress];
        if (!Array.isArray(taskArgs.owners))
          throw new Error("Failed to convert taskArgs.owners into Array");
      }

      if (taskArgs.setup && taskArgs.defaultpayloadscript) {
        taskArgs.data = await run(
          `gsp:scripts:defaultpayload:${taskArgs.defaultpayloadscript}`
        );
        if (taskArgs.to === constants.AddressZero) {
          taskArgs.to = await run("bre-config", {
            deployments: true,
            contractname: taskArgs.defaultpayloadscript
          });
        }
      }

      if (taskArgs.setup) {
        const inputs = [
          taskArgs.owners,
          taskArgs.threshold,
          taskArgs.to,
          taskArgs.data,
          taskArgs.fallbackhandler,
          taskArgs.paymenttoken,
          taskArgs.payment,
          taskArgs.paymentreceiver
        ];
        taskArgs.initializer = await run("abi-encode-withselector", {
          contractname: "IGnosisSafe",
          functionname: "setup",
          inputs
        });
      }
      // ============

      // ==== GelatoCore.mintExecutionClaim Params ====
      // Selected Provider and Executor
      taskArgs.gelatoprovider = await run("handleGelatoProvider", {
        gelatoprovider: taskArgs.gelatoprovider
      });
      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor
      });

      // Condition and ConditionPayload (optional)
      if (taskArgs.conditionname) {
        if (taskArgs.conditionaddress === constants.AddressZero) {
          taskArgs.conditionaddress = await run("bre-config", {
            deployments: true,
            contractname: taskArgs.conditionname
          });
        }
        if (!taskArgs.conditionpayload) {
          taskArgs.conditionpayload = await run("handleGelatoPayload", {
            contractname: taskArgs.conditionname
          });
        }
      }

      // Action and ActionPayload
      if (!taskArgs.actionaddress) {
        taskArgs.actionaddress = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.actionname
        });
      }
      if (!taskArgs.actionpayload) {
        taskArgs.actionpayload = await run("handleGelatoPayload", {
          contractname: taskArgs.actionname,
          payload: taskArgs.actionpayload
        });
      }
      // ============

      if (taskArgs.log) console.log("\nTaskArgs:\n", taskArgs, "\n");

      // GelatoCore interaction
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      let creationTx;
      if (taskArgs.createtwo) {
        creationTx = await gelatoCore.createTwoProxyAndMint(
          taskArgs.mastercopy,
          taskArgs.initializer,
          taskArgs.saltnonce,
          [taskArgs.gelatoprovider, taskArgs.gelatoexecutor],
          [taskArgs.conditionaddress, taskArgs.actionaddress],
          taskArgs.conditionpayload,
          taskArgs.actionpayload,
          taskArgs.executionclaimexpirydate,
          { value: utils.parseEther(taskArgs.funding), gasLimit: 3000000 }
        );
      } else {
        creationTx = await gelatoCore.createProxyAndMint(
          taskArgs.mastercopy,
          taskArgs.initializer,
          [taskArgs.gelatoprovider, taskArgs.gelatoexecutor],
          [taskArgs.conditionaddress, taskArgs.actionaddress],
          taskArgs.conditionpayload,
          taskArgs.actionpayload,
          taskArgs.executionclaimexpirydate,
          { value: utils.parseEther(taskArgs.funding), gasLimit: 3000000 }
        );
      }

      if (taskArgs.log)
        console.log(`\n Creation Tx Hash: ${creationTx.hash}\n`);

      const { blockHash } = await creationTx.wait();

      // Event Emission verification
      if (taskArgs.log) {
        const parsedCreateLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogGnosisSafeProxyCreation",
          txhash: creationTx.hash,
          blockHash,
          values: true,
          stringify: true
        });
        if (parsedCreateLog)
          console.log("\n✅ LogGnosisSafeProxyCreation\n", parsedCreateLog);
        else console.log("\n❌ LogGnosisSafeProxyCreation not found");

        const parsedMintingLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecutionClaimMinted",
          txhash: creationTx.hash,
          blockHash,
          values: true,
          stringify: true
        });
        if (parsedMintingLog)
          console.log("\n✅ LogExecutionClaimMinted\n", parsedMintingLog);
        else console.log("\n❌ LogExecutionClaimMinted not found");
      }

      return creationTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
