import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-providetaskspec",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("condition", "0 for no condition")
  .addPositionalParam("gaspriceceil", "in Gwei (e.g. 20)")
  .addVariadicPositionalParam("actions")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      /*
      struct TaskSpec {
        IGelatoCondition condition;   // Address: optional AddressZero for self-conditional actions
        Action[] actions;
        uint256 gasPriceCeil;  // GasPriceCeil
      }
      */

      // Condition
      if (taskArgs.condition !== "0") {
        const conditionInstance = await run("config", {
          contractname: taskArgs.condition,
          deployments: true,
        });
        taskArgs.condition = conditionInstance.address;
      } else {
        taskArgs.condition = constants.AddressZero;
      }

      // Action
      let actionAddresses = [];
      for (const action of taskArgs.actions) {
        const actionAddress = await run("bre-config", {
          contractname: action,
          deployments: true,
        });

        actionAddresses.push(actionAddress);
      }

      // inst, data, operation, value, termsOkCheck
      const actionArray = [];
      for (const actionAddress of actionAddresses) {
        const action = new Action({
          inst: actionAddress,
          data: constants.HashZero,
          operation: Operation.Delegatecall,
          termsOkCheck: true,
        });
        actionArray.push(action);
      }

      // Gelato Provider is the 3rd signer account
      const { 2: gelatoProvider } = await ethers.getSigners();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoProvider,
        write: true,
      });

      const gasPriceCeil = utils.parseUnits(taskArgs.gaspriceceil, "gwei");
      // Create TaskSpec condition, actions, gasPriceCeil
      const taskSpec = new TaskSpec({
        condition: taskArgs.condition,
        actions: actionArray,
        gasPriceCeil,
      });

      const tx = await gelatoCore.provideTaskSpecs([taskSpec], {
        gasLimit: 1000000,
      });
      if (taskArgs.log) console.log(`\n txHash provideTaskSpecs: ${tx.hash}\n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });