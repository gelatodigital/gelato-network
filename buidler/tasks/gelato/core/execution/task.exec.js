import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-exec",
  `Calls GelatoCore.exec() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("taskreceiptid")
  .addOptionalPositionalParam(
    "executorindex",
    "Which mnemonic index should be selected for gelatoExecutor msg.sender (default index 1)",
    1,
    types.int
  )
  .addOptionalParam("taskreceipt", "Supply LogTaskSubmitted values in an obj")
  .addOptionalParam(
    "fromblock",
    "The block number to search for event logs from",
    undefined, // default
    types.number
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    "latest", // default
    types.number
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      taskreceiptid,
      executorindex,
      taskreceipt,
      fromblock,
      toblock,
      blockhash,
      txhash,
      log,
    }) => {
      try {
        if (!taskreceipt) {
          taskreceipt = await run("fetchTaskReceipt", {
            taskreceiptid,
            taskreceipt,
            fromblock,
            toblock,
            blockhash,
            txhash,
            log,
          });
        }

        const { [executorindex]: gelatoExecutor } = await ethers.getSigners();

        const gelatoCore = await run("instantiateContract", {
          contractname: "GelatoCore",
          signer: gelatoExecutor,
          write: true,
        });

        const gelatoGasPrice = await run("fetchGelatoGasPrice");

        const gelatoGasPriceGwei = utils.formatUnits(gelatoGasPrice, "gwei");
        let gelatoMAXGAS;
        try {
          gelatoMAXGAS = await gelatoCore.gelatoMaxGas();
        } catch (error) {
          console.error(`gelatoCore.MAXGAS() error\n`, error);
        }

        if (log) {
          console.log(
            `\n Gelato Gas Price:  ${gelatoGasPriceGwei} gwei\
             \n Gelato MAX GAS:    ${gelatoMAXGAS}\
             \n UserProxy Address: ${taskreceipt[3]}\n
             \n Executor Address: ${gelatoExecutor._address}\n`
          );
        }

        const actions = [];
        for (const action of taskreceipt[2][2]) {
          actions.push({
            addr: action[0],
            data: action[1],
            operation: action[2],
            value: action[3],
            termsOkCheck: action[4],
          });
        }
        const conditions = [];
        for (const condition of taskreceipt[2][1]) {
          conditions.push({
            inst: condition[0],
            data: condition[1],
          });
        }

        const taskReceipt = {
          id: taskreceipt[0],
          userProxy: taskreceipt[1],
          task: {
            provider: {
              addr: taskreceipt[2][0][0],
              module: taskreceipt[2][0][1],
            },
            conditions: conditions,
            actions,
            expiryDate: taskreceipt[2][3],
            autoResubmitSelf: taskreceipt[2][4],
          },
        };

        let executeTx;
        try {
          executeTx = await gelatoCore.exec(taskReceipt, {
            gasPrice: gelatoGasPrice,
            // gasLimit: gelatoMAXGAS,
            gasLimit: 1500000,
          });
        } catch (error) {
          console.error(`gelatoCore.exec() PRE-EXECUTION error\n`, error);
        }

        if (log) console.log(`\ntxHash execTransaction: ${executeTx.hash}\n`);

        let executeTxReceipt;
        try {
          executeTxReceipt = await executeTx.wait();
        } catch (error) {
          console.error(`gelatoCore.exec() EXECUTION error\n`, error);
        }

        if (executeTxReceipt && log) {
          const eventNames = [
            "LogCanExecSuccess",
            "LogCanExecFailed",
            "LogExecSuccess",
            "LogExecReverted",
          ];

          const executionEvents = [];

          for (const eventname of eventNames) {
            const executionEvent = await run("event-getparsedlog", {
              contractname: "GelatoCore",
              eventname,
              txhash: executeTxReceipt.transactionHash,
              blockhash: executeTxReceipt.blockHash,
              values: true,
              stringify: true,
            });
            if (executionEvent)
              executionEvents.push({ [eventname]: executionEvent });
          }
          console.log(
            `\nExecution Events emitted for exec-tx: ${executeTx.hash}:`
          );
          for (const event of executionEvents) console.log(event);
        }

        return executeTx.hash;
      } catch (error) {
        console.error(error, "\n");
        process.exit(1);
      }
    }
  );
