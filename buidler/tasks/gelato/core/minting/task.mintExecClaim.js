import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-mintexecclaim",
  `Sends tx to GelatoCore.mintExecClaim() or --selfprovide to mintSelfProvidedExecClaim() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Supply '0' for AddressZero Conditions"
  )
  .addOptionalVariadicPositionalParam(
    "actionnames",
    "Actionname (must be inside buidler.config) OR --actionaddress MUST be supplied."
  )
  .addOptionalParam("gelatoprovider", "Defaults to network addressbook default")
  .addOptionalParam(
    "gelatoprovidermodule",
    "Address must be passed unless --selfprovide"
  )
  .addOptionalParam("conditionaddress")
  .addOptionalParam(
    "conditiondata",
    "If undefined, handleGelatoData() must work"
  )
  .addOptionalParam(
    "actionaddresses",
    "Multiple actions => JS object (np via CLI)."
  )
  .addOptionalParam(
    "actiondata",
    "Multiple actions => JS object (np via CLI). If undefined, handleGelatoData() must work"
  )
  .addOptionalParam(
    "operations",
    "Multiple actions => JS object (np via CLI). If undefined, defaults to delegatecall"
  )
  .addOptionalParam(
    "expirydate",
    "Defaults to Zero for gelatoexecutor's maximum"
  )
  .addOptionalParam("task", "Pass a complete class Task obj for minting.")
  .addFlag("selfprovide", "Calls gelatoCore.mintSelfProvidedExecClaim()")
  .addOptionalParam(
    "funds",
    "Optional ETH value to sent along with --selfprovide"
  )
  .addOptionalParam("gelatoexecutor", "Provide for --selfprovide")
  .addOptionalParam("gelatocoreaddress", "Supply if not in BRE-config")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.funds !== constants.Zero && !taskArgs.selfprovide)
        throw new Error("\n --funds only with --selfprovide");

      if (taskArgs.gelatoexecutor && !taskArgs.selfprovide)
        throw new Error("\n --gelatoexecutor only with --selfprovide");

      if (!taskArgs.task) {
        // Command Line Argument Checks
        if (!taskArgs.actionnames && !taskArgs.actionaddress)
          throw new Error(`\n Must supply <actionnames> or --actionaddress`);

        if (
          taskArgs.conditionname &&
          taskArgs.conditionname !== "0" &&
          !taskArgs.conditionname.startsWith("Condition")
        ) {
          throw new Error(
            `\nInvalid condition: ${taskArgs.conditionname}: 1.<conditionname> 2.<actionnames>\n`
          );
        }

        if (taskArgs.actionnames) {
          taskArgs.actionnames.forEach((action) => {
            if (!action.startsWith("Action"))
              throw new Error(
                `\nInvalid action: ${taskArgs.actionname}: 1.<conditionname> 2.<actionname>\n`
              );
          });
        }

        // Handle GelatoProvider
        // Provider.inst
        taskArgs.gelatoprovider = await run("handleGelatoProvider", {
          gelatoprovider: taskArgs.gelatoprovider,
        });
        // Provider.module
        if (!taskArgs.selfprovide && !taskArgs.gelatoprovidermodule)
          throw new Error(`\n gc-mintexecclaim: gelatoprovidermodule \n`);
        // GelatoProvider
        const gelatoProvider = new gelatoProvider({
          inst: taskArgs.gelatoprovider,
          module: taskArgs.providermodule,
        });

        // Condition and ConditionData (optional)
        if (taskArgs.conditionname !== "0") {
          if (!taskArgs.conditionaddress) {
            taskArgs.conditionaddress = await run("bre-config", {
              deployments: true,
              contractname: taskArgs.conditionname,
            });
          }
          if (!taskArgs.conditiondata) {
            taskArgs.task.conditionData = await run("handleGelatoData", {
              contractname: taskArgs.conditionname,
            });
          }
        }
        const condition = new Condition({
          inst: taskArgs.conditionaddress,
          data: taskArgs.conditiondata,
        });

        // Handle Actions
        const actions = [];
        for (const actionname of taskArgs.actionnames) {
          // Action.inst
          if (!taskArgs.actionaddresses[actionname]) {
            taskArgs.actionaddresses[actionname] = await run("bre-config", {
              deployments: true,
              contractname: actionname,
            });
          }
          // Action.data
          if (!taskArgs.actiondata[actionname]) {
            taskArgs.actiondata[actionname] = await run("handleGelatoData", {
              contractname: actionname,
            });
          }
          // Action.operation
          if (!taskArgs.operations[actionname])
            taskArgs.operations[actionname] = "delegatecall";

          // Action
          const action = new Action({
            inst: taskArgs.actionaddresses[actionname],
            data: taskArgs.actiondata[actionname],
            operation: taskArgs.operations[actionname],
          });
          // Task.actions
          actions.push(action);
        }

        // TASK
        taskArgs.task = new Task({
          provider: gelatoProvider,
          condition,
          actions,
          expiryDate: taskArgs.expirydate,
        });
      }

      if (taskArgs.log)
        console.log("\n gc-mintexecclaim TaskArgs:\n", taskArgs, "\n");

      if (taskArgs.log) console.log("\n Task:\n", taskArgs.task);

      // GelatoCore write Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        write: true,
      });

      // Send Minting Tx
      let mintTxHash;

      if (taskArgs.selfprovide) {
        mintTxHash = await gelatoCore.mintSelfProvidedExecClaim(
          task,
          taskArgs.gelatoexecutor
            ? taskArgs.gelatoexecutor
            : constants.AddressZero,
          { value: taskArgs.funds ? taskArgs.funds : constants.Zero }
        );
      } else {
        // Wrap Mint function in Gnosis Safe Transaction
        const safeAddress = await run("gc-determineCpkProxyAddress");
        mintTxHash = await run("gsp-exectransaction", {
          gnosissafeproxyaddress: safeAddress,
          contractname: "GelatoCore",
          inputs: [taskArgs.task],
          functionname: "mintExecClaim",
          operation: 0,
          log: true,
        });

        // const tx = await gelatoCore.mintExecClaim(task, {
        //   gasLimit: 1000000,
        // });
        // mintTxHash = tx.hash;
      }

      if (taskArgs.log) console.log(`\n mintTx Hash: ${mintTxHash}\n`);

      // // Wait for tx to get mined
      // const { blockHash: blockhash } = await mintTx.wait();

      // Event Emission verification
      if (taskArgs.events) {
        const parsedMintingLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          contractaddress: taskArgs.gelatocoreaddress,
          eventname: "LogExecClaimMinted",
          txhash: mintTxHash,
          values: true,
          stringify: true,
        });
        if (parsedMintingLog)
          console.log("\n✅ LogExecClaimMinted\n", parsedMintingLog);
        else console.log("\n❌ LogExecClaimMinted not found");
      }

      return mintTxHash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
