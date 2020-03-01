import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-executorclaimlifespan",
  `Return (or --log) GelatoCore.executorClaimLifespan([<executor>: defaults to default executor]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalPositionalParam(
    "executor",
    "The address of the executor, whose price we query"
  )
  .setAction(async ({ executor, log }) => {
    try {
      let executorAddress;
      if (executor) executorAddress = executor;
      else
        executorAddress = await run("bre-config", {
          addressbookcategory: "executor",
          addressbookentry: "default"
        });

      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const executorClaimLifespan = await gelatoCoreContract.executorClaimLifespan(
        executorAddress
      );
      const executorClaimLifespanDays = executorClaimLifespan / 86400;
      if (log)
        console.log(
          `\nExecutor: ${executorAddress}\
           \nExecutorClaimLifespan: ${executorClaimLifespanDays} days\
           \nNetwork: ${network.name}\n`
        );
      return executorClaimLifespan;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
