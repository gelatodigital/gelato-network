import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-execute",
  `Calls GelatoCore.execute() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("executionclaimid")
  .addOptionalPositionalParam(
    "executorindex",
    "Which mnemonic index should be selected for executor msg.sender (default index 1)",
    1,
    types.int
  )
  .addOptionalParam(
    "executionclaim",
    "Supply LogExecutionClaimMinted values in an obj"
  )
  .addOptionalParam(
    "fromblock",
    "The block number to search for event logs from",
    undefined, // default
    types.number
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // default
    types.number
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      executionclaimid,
      executorindex,
      fromblock,
      toblock,
      blockhash,
      txhash,
      executionclaim,
      log
    }) => {
      try {
        if (!executionclaim) {
          // Fetch Execution Claim from LogExecutionClaimMinted values
          executionclaim = await run("gc-fetchparsedexecutionclaimevent", {
            executionclaimid,
            contractname: "GelatoCore",
            eventname: "LogExecutionClaimMinted",
            fromblock,
            toblock,
            blockhash,
            txhash,
            values: true,
            log
          });
        }

        const { [executorindex]: executor } = await ethers.signers();
        const gelatoCore = await run("instantiateContract", {
          contractname: "GelatoCore",
          signer: executor,
          write: true
        });

        let gelatoGasPrice;
        try {
          gelatoGasPrice = await gelatoCore.gelatoGasPrice();
        } catch (error) {
          console.error(`gelatoCore.gelatoGasPrice() error\n`, error);
        }

        const gelatoGasPriceGwei = utils.formatUnits(gelatoGasPrice, "gwei");
        let gelatoMAXGAS;
        try {
          gelatoMAXGAS = await gelatoCore.MAXGAS();
        } catch (error) {
          console.error(`gelatoCore.MAXGAS() error\n`, error);
        }

        if (log) {
          console.log(
            `\n Gelato Gas Price:  ${gelatoGasPriceGwei} gwei\
             \n Gelato MAX GAS:    ${gelatoMAXGAS}\
             \n UserProxy Address: ${executionclaim.userProxy}\n`
          );
        }

        let executeTx;
        try {
          executeTx = await gelatoCore.execute(
            executionclaim.selectedProviderAndExecutor,
            executionclaim.executionClaimId,
            executionclaim.userProxy,
            executionclaim.conditionAndAction,
            executionclaim.conditionPayload,
            executionclaim.actionPayload,
            executionclaim.executionClaimExpiryDate,
            {
              gasPrice: gelatoGasPrice,
              gasLimit: gelatoMAXGAS
            }
          );
        } catch (error) {
          console.error(`gelatoCore.execute() PRE-EXECUTION error\n`, error);
        }

        if (log) console.log(`\ntxHash execTransaction: ${executeTx.hash}\n`);

        let executeTxReceipt;
        try {
          executeTxReceipt = await executeTx.wait();
        } catch (error) {
          console.error(`gelatoCore.execute() EXECUTION error\n`, error);
        }

        // if (executeTxReceipt && log) {
        //   const eventNames = [
        //     "LogCanExecuteSuccess",
        //     "LogCanExecuteFailure",
        //     "LogExecutionSuccess",
        //     "LogExecutionFailure"
        //   ];

        //   const executionEvents = [];

        //   for (const eventname of eventNames) {
        //     const executionEvent = await run(
        //       "gc-fetchparsedexecutionclaimevent",
        //       {
        //         executionclaimid,
        //         contractname: "GelatoCore",
        //         eventname,
        //         blockhash: executeTxReceipt.blockHash,
        //         values: true
        //       }
        //     );
        //     executionEvents.push(executionEvent);
        //   }
        //   console.log(
        //     `\nExecution Events emitted for execute-tx: ${executeTx.hash}:`
        //   );
        //   for (const event of executionEvents) console.log(event);
        // }

        return executeTx.hash;
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
