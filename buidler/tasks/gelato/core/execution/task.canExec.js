import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { ethers } from "ethers";

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
    0,
    types.int
  )
  .addOptionalParam(
    "toblock",
    "Search for event logs to block number.",
    undefined,
    types.int
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.taskreceipt) {
        taskArgs.taskreceipt = await run("fetchTaskReceipt", {
          taskreceiptid: taskArgs.taskreceiptid,
          obj: true,
          contractaddress: taskArgs.contractaddress,
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          txhash: taskArgs.txhash,
        });
      }
      if (!taskArgs.taskreceipt)
        throw new Error("\nUnable to fetch taskReceipt from events");

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.contractaddress,
        read: true,
      });

      const excecutorAddress = await gelatoCore.executorByProvider(
        taskArgs.taskreceipt.provider.addr
      );
      if (taskArgs.log) {
        console.log(taskArgs);
        console.log(`\n Executor: ${excecutorAddress}\n`);
      }

      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      const gelatoGasPrice = await run("fetchGelatoGasPrice");

      try {
        const canExecResult = await gelatoCore.canExec(
          taskArgs.taskreceipt,
          gelatoMaxGas,
          gelatoGasPrice
        );

        if (taskArgs.log)
          console.log(
            `\n Can Exec Result: ${
              canExecResult === "InvalidExecutor" ? "OK" : canExecResult
            }\n`
          );
        return canExecResult;
      } catch (error) {
        console.error(`\n canExec error`, error);
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
