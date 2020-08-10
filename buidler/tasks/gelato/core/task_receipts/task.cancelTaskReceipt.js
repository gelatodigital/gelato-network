import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-cancel-task",
  `Sends tx to GelatoCore.cancelTask() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("taskreceiptid", "Id of the task receipt")
  .addPositionalParam("proxytype", "Type of the proxy")
  .addOptionalParam("proxyaddress", "address of proxy", undefined, types.json)
  .addOptionalParam(
    "saltnonce",
    "proxy salt, if created with create2",
    undefined,
    types.json
  )
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      console.log(taskArgs);
      const user = getUser();
      const userAddress = await user.getAddress();

      const taskReceipt = await run("fetchTaskReceipt", {
        taskreceiptid: taskArgs.taskreceiptid,
        obj: true,
        contractaddress: taskArgs.contractaddress,
        fromblock: taskArgs.fromblock,
        toblock: taskArgs.toblock,
        blockhash: taskArgs.blockhash,
        txhash: taskArgs.txhash,
      });

      console.log(taskReceipt);

      let proxy;
      let cancelTaskTx;
      switch (taskArgs.proxytype) {
        case "GnosisSafe":
          if (!taskArgs.proxyaddress)
            taskArgs.proxyaddress = await run("gc-determineCpkProxyAddress", {
              useraddress: userAddress,
              saltnonce: taskArgs.saltnonce,
            });
          // proxy = await run("instantiateContract", {
          //   contractname: "IGnosisSafe",
          //   contractaddress: taskArgs.proxyaddress,
          //   write: true,
          //   signer: user,
          // });
          cancelTaskTx = await run("gsp-exectransaction", {
            gnosissafeproxyaddress: taskArgs.proxyaddress,
            contractname: "GelatoCore",
            inputs: [taskReceipt],
            functionname: "cancelTask",
            operation: 0,
            log: true,
          });
          break;
        case "GelatoUserProxy":
          if (!taskArgs.proxyaddress)
            taskArgs.proxyaddress = await run("gc-determinegelatouserproxy", {
              useraddress: userAddress,
              saltnonce: taskArgs.saltnonce,
            });
          proxy = await run("instantiateContract", {
            contractname: "IGelatoUserProxy",
            contractaddress: taskArgs.proxyaddress,
            write: true,
            signer: user,
          });
          cancelTaskTx = await proxy.cancelTask(taskReceipt);
          break;
      }

      // const tx = await gelatoCore.submitTask(task, {
      //   gasLimit: 1000000,
      // });
      // submitTaskTxHash = tx.hash;

      if (taskArgs.log)
        console.log(`\n cancelTaskTx Hash: ${cancelTaskTx.hash}\n`);

      // // Wait for tx to get mined
      // const { blockHash: blockhash } = await submitTaskTx.wait();
      await cancelTaskTx.wait();
      const gelatoCoreAddress = await run("bre-config", {
        contractaddress: "GelatoCore",
        deployments: true,
      });

      console.log(`Task Successfully cancelled!`);

      // Event Emission verification
      if (taskArgs.events) {
        const parsedSubmissionLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          contractaddress: gelatoCoreAddress,
          eventname: "LogTaskCancelled",
          txhash: cancelTaskTx.hash,
          values: true,
          stringify: true,
        });
        if (parsedSubmissionLog)
          console.log("\n✅ LogTaskCancelled\n", parsedSubmissionLog);
        else console.log("\n❌ LogTaskCancelled not found");
      }

      return cancelTaskTx;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
