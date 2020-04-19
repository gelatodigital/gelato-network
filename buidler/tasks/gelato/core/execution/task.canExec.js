import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-canexec",
  `Calls GelatoCore.canExec() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("execclaimid")
  .addOptionalPositionalParam(
    "executorindex",
    "Mnenomic generated account to sign the tx",
    1,
    types.int
  )
  .addOptionalParam("execclaim", "Supply LogExecClaimMinted values in an obj")
  .addOptionalParam("fromblock", "Search for event logs from block number.")
  .addOptionalParam("toblock", "Search for event logs to block number.")
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.execclaim) {
        taskArgs.execclaim = await run("fetchExecClaim", {
          execclaimid: taskArgs.execclaimid,
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          txhash: taskArgs.txhash,
          stringify: taskArgs.stringify,
        });
      }
      if (!taskArgs.execclaim)
        throw new Error("\nUnable to fetch execClaim from events");

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

      // const { execClaimHash } = await run("event-getparsedlog", {
      //   execclaimid: taskArgs.execclaimid,
      //   fromblock: taskArgs.fromblock,
      //   toblock: taskArgs.toblock,
      //   blockhash: taskArgs.blockhash,
      //   txhash: taskArgs.txhash,
      //   stringify: taskArgs.stringify,
      // });
      // const gelatoGasPrice = await gelatoCore.gelatoGasPrice();
      // const gelatoMaxGas = await gelatoCore.gelatoMaxGas();

      const execClaim = {
        id: taskArgs.execclaim[0],
        userProxy: taskArgs.execclaim[1],
        task: {
          provider: {
            addr: taskArgs.execclaim[2][0][0],
            module: taskArgs.execclaim[2][0][1],
          },
          condition: {
            inst: taskArgs.execclaim[2][1][0],
            data: taskArgs.execclaim[2][1][1],
          },
          actions: [
            {
              inst: taskArgs.execclaim[2][2][0][0],
              data: taskArgs.execclaim[2][2][0][1],
              operation: taskArgs.execclaim[2][2][0][2],
              value: taskArgs.execclaim[2][2][0][3],
              termsOkCheck: taskArgs.execclaim[2][2][0][4],
            },
          ],
          expiryDate: taskArgs.execclaim[2][3],
        },
      };
      if (taskArgs.log) console.log(execClaim);

      const GAS_PRICE = utils.parseUnits("9", "gwei");
      const GELATO_MAX_GAS = 7000000;

      try {
        const canExecResult = await gelatoCore.canExec(
          execClaim,
          GELATO_MAX_GAS,
          GAS_PRICE
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
