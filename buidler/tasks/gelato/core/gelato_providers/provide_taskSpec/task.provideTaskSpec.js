import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-providetaskspec",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("condition", "0 for no condition")
  .addOptionalPositionalParam("gaspriceceil", "in Gwei (e.g. 20)")
  .addOptionalParam(
    "taskspecname",
    "name of taskspec task that returns default task spec"
  )
  .addFlag("auto", "if true, task is re-creating itself after execution")
  .addOptionalVariadicPositionalParam("actions")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      let taskSpec;

      // ###### Either use taskspecname
      if (taskArgs.taskspecname) {
        taskSpec = await run(`gc-return-taskspec-${taskArgs.taskspecname}`);
      }
      // ###### Or manually provide task spec
      else {
        // Condition
        if (taskArgs.condition !== "0") {
          const conditionAddress = await run("bre-config", {
            contractname: taskArgs.condition,
            deployments: true,
          });
          taskArgs.condition = conditionAddress;
        } else {
          taskArgs.condition = undefined;
        }

        // Action
        let actionAddresses = [];
        for (const action of taskArgs.actions) {
          try {
            const actionAddress = await run("bre-config", {
              contractname: action,
              deployments: true,
            });
            actionAddresses.push(actionAddress);
          } catch {
            // We assume if we fail, that user inputted address directly
            actionAddresses.push(action);
          }
        }

        // addr, data, operation, value, termsOkCheck
        const actionArray = [];
        for (const actionAddress of actionAddresses) {
          const action = new Action({
            addr: actionAddress,
            data: constants.HashZero,
            operation: Operation.Delegatecall,
            termsOkCheck: true,
          });
          actionArray.push(action);
        }

        const gasPriceCeil = utils.parseUnits(taskArgs.gaspriceceil, "gwei");
        // Create TaskSpec condition, actions, gasPriceCeil

        taskSpec = new TaskSpec({
          conditions: taskArgs.condition ? [taskArgs.condition] : undefined,
          actions: actionArray,
          gasPriceCeil,
          autoSubmitNextTask: taskArgs.auto ? true : false,
        });
      }

      // Gelato Provider is the 3rd signer account
      const { 2: gelatoProvider } = await ethers.getSigners();

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoProvider,
        write: true,
      });

      const tx = await gelatoCore.provideTaskSpecs([taskSpec], {
        gasLimit: 1000000,
      });
      if (taskArgs.log) console.log(`\n txHash provideTaskSpecs: ${tx.hash}\n`);
      await tx.wait();
      if (taskArgs.log) console.log(`\n ✅\n`);
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
