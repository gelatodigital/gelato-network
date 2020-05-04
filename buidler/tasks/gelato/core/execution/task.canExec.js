import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-canexec",
  `Calls GelatoCore.canExec() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("taskreceiptid")
  .addOptionalPositionalParam(
    "executorindex",
    "Mnenomic generated account to sign the tx",
    1,
    types.int
  )
  .addOptionalParam("taskreceipt", "Supply LogTaskSubmitted values in an obj")
  .addOptionalParam("fromblock", "Search for event logs from block number.")
  .addOptionalParam("toblock", "Search for event logs to block number.")
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.taskreceipt) {
        taskArgs.taskreceipt = await run("fetchTaskReceipt", {
          taskreceiptid: taskArgs.taskreceiptid,
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          txhash: taskArgs.txhash,
          stringify: taskArgs.stringify,
        });
      }
      if (!taskArgs.taskreceipt)
        throw new Error("\nUnable to fetch taskReceipt from events");

      const {
        [taskArgs.executorindex]: gelatoExecutor,
      } = await ethers.getSigners();

      if (taskArgs.log) {
        console.log(taskArgs);
        console.log(`\n Executor: ${gelatoExecutor._address}\n`);
      }

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoExecutor,
        write: true,
      });

      // const { taskReceiptHash } = await run("event-getparsedlog", {
      //   taskreceiptid: taskArgs.taskreceiptid,
      //   fromblock: taskArgs.fromblock,
      //   toblock: taskArgs.toblock,
      //   blockhash: taskArgs.blockhash,
      //   txhash: taskArgs.txhash,
      //   stringify: taskArgs.stringify,
      // });
      // const gelatoGasPrice = await gelatoCore.gelatoGasPrice();
      // const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
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

      const taskReceipt = {
        id: taskArgs.taskreceipt[0],
        userProxy: taskArgs.taskreceipt[1],
        task: {
          provider: {
            addr: taskArgs.taskreceipt[2][0][0],
            module: taskArgs.taskreceipt[2][0][1],
          },
          conditions,
          actions,
          expiryDate: taskArgs.taskreceipt[2][3],
          autoSubmitNextTask: taskArgs.taskreceipt[2][4],
        },
      };
      if (taskArgs.log) console.log(taskReceipt);

      const GELATO_MAX_GAS = 7000000;

      const gelatoGasPrice = await run("fetchGelatoGasPrice");

      try {
        const canExecResult = await gelatoCore.canExec(
          taskReceipt,
          GELATO_MAX_GAS,
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
