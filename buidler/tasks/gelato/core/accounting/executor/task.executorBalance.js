import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
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
      let executorAddress;
      if (executor) executorAddress = executor;
      else {
        executorAddress = await run("bre-config", {
          addressbookcategory: "executor",
          addressbookentry: "default"
        });
      }

      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const executorBalance = await gelatoCoreContract.executorBalance(
        executorAddress
      );
      const executorBalanceETH = utils.formatEther(executorBalance);
      if (log) {
        console.log(
          `\nExecutor: ${executorAddress}\
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
