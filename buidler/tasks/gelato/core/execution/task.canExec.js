import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-canexec",
  `Calls GelatoCore.canExec() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("taskreceiptid")
  .addOptionalParam("contractaddress", "Address of GelatoCore")
  .addOptionalPositionalParam(
    "executorindex",
    "Mnenomic generated account to sign the tx",
    1,
    types.int
  )
  .addOptionalParam(
    "taskreceipt",
    "Supply LogTaskSubmitted values in an obj",
    undefined,
    types.json
  )
  .addOptionalParam(
    "fromblock",
    "Search for event logs from block number.",
    undefined,
    types.number
  )
  .addOptionalParam(
    "toblock",
    "Search for event logs to block number.",
    "latest",
    types.number
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.taskreceipt) {
        taskArgs.taskreceipt = await run("fetchTaskReceipt", {
          taskreceiptid: taskArgs.taskreceiptid,
          contractaddress: taskArgs.contractaddress,
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          txhash: taskArgs.txhash,
          stringify: taskArgs.stringify,
        });
      }
      if (!taskArgs.taskreceipt)
        throw new Error("\nUnable to fetch taskReceipt from events");

      const actions = [];
      for (const action of taskArgs.taskreceipt[2][2]) {
        actions.push({
          addr: action[0],
          data: action[1],
          operation: action[2],
          value: action[3],
          termsOkCheck: action[4],
        });
      }
      const conditions = [];
      for (const condition of taskArgs.taskreceipt[2][1]) {
        conditions.push({
          inst: condition[0],
          data: condition[1],
        });
      }

      const {
        [taskArgs.executorindex]: gelatoExecutor,
      } = await ethers.getSigners();

      if (taskArgs.log) {
        console.log(taskArgs);
        console.log(`\n Executor: ${await gelatoExecutor.getAddress}\n`);
      }

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.contractaddress,
        signer: gelatoExecutor,
        write: true,
      });

      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      const gelatoGasPrice = await run("fetchGelatoGasPrice");

      try {
        const canExecResult = await gelatoCore.canExec(
          taskArgs.taskreceipt,
          gelatoMaxGas,
          gelatoGasPrice
        );
        if (taskArgs.log) console.log(`\n Can Exec Result: ${canExecResult}\n`);
        return canExecResult;
      } catch (error) {
        console.error(`\n canExec error`, error);
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
