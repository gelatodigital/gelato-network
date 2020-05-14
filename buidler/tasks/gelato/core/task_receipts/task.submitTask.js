import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-submittask",
  `Sends tx to GelatoCore.submitTask() on [--network] (default: ${defaultNetwork})`
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
  .addOptionalParam("gelatoprovidermodule", "Address must be passed ")
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
  .addOptionalParam("task", "Pass a complete class Task obj.")
  .addOptionalParam("gelatocoreaddress", "Supply if not in BRE-config")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
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
        // Provider.addr

        if (!taskArgs.gelatoprovider)
          taskArgs.gelatoprovider = await run("handleGelatoProvider", {
            gelatoprovider: taskArgs.gelatoprovider,
          });

        // Provider.module
        // GelatoProvider
        const gelatoProvider = new GelatoProvider({
          addr: taskArgs.gelatoprovider,
          module: taskArgs.gelatoprovidermodule,
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
        } else {
          taskArgs.conditionaddress = constants.AddressZero;
          taskArgs.conditiondata = constants.HashZero;
        }
        const condition = new Condition({
          inst: taskArgs.conditionaddress,
          data: taskArgs.conditiondata,
        });

        // Handle Actions
        const actions = [];
        for (const actionname of taskArgs.actionnames) {
          // Action.addr
          if (taskArgs.actionaddresses) {
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
              taskArgs.operations[actionname] = Operation.Delegatecall;

            // Action
            const action = new Action({
              addr: taskArgs.actionaddresses[actionname],
              data: taskArgs.actiondata[actionname],
              operation: taskArgs.operations[actionname],
            });
            // Task.actions
            actions.push(action);
          } else {
            const actionAddress = await run("bre-config", {
              deployments: true,
              contractname: actionname,
            });
            const defaultData = await run("handleGelatoData", {
              contractname: actionname,
            });

            // Action
            const action = new Action({
              addr: actionAddress,
              data: defaultData,
              operation: 1,
              termsOkCheck: true,
            });
            actions.push(action);
          }
        }

        // TASK
        taskArgs.task = new Task({
          conditions: [condition],
          actions,
          expiryDate: constants.HashZero,
        });
      }

      if (taskArgs.log)
        console.log("\n gc-submittask TaskArgs:\n", taskArgs, "\n");

      if (taskArgs.log) console.log("\n Task:\n", taskArgs.task);

      // GelatoCore write Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        write: true,
      });

      // Send Task Submission Tx
      let submitTaskTxHash;

      // Wrap Submit function in Gnosis Safe Transaction
      const safeAddress = await run("gc-determineCpkProxyAddress");
      submitTaskTxHash = await run("gsp-exectransaction", {
        gnosissafeproxyaddress: safeAddress,
        contractname: "GelatoCore",
        inputs: [gelatoProvider, taskArgs.task, taskArgs.expirydate],
        functionname: "submitTask",
        operation: 0,
        log: true,
      });

      // const tx = await gelatoCore.submitTask(task, {
      //   gasLimit: 1000000,
      // });
      // submitTaskTxHash = tx.hash;

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
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
