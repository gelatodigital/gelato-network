import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-executorbalance",
  `Return (or --log) GelatoCore.executorBalance([<executor>: defaults to default executor]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalPositionalParam(
    "executor",
    "The address of the executor, whose balance we query"
  )
  .setAction(async ({ executor, log }) => {
    try {
      executor = await run("handleExecutor", { executor });
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const executorBalance = await gelatoCoreContract.executorBalance(
        executor
      );
      const executorBalanceETH = utils.formatEther(executorBalance);
      if (log) {
        console.log(
          `\nExecutor: ${executor}\
           \nExecutorBalance: ${executorBalanceETH} ETH\
           \nNetwork: ${network.name}\n`
        );
      }
      return executorBalance;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
