import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

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
      executor = await run("handleExecutor", { executor });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const executorClaimLifespan = await gelatoCore.executorClaimLifespan(
        executor
      );
      const executorClaimLifespanDays = executorClaimLifespan / 86400;
      if (log) {
        console.log(
          `\nExecutor: ${executor}\
           \nExecutorClaimLifespan: ${executorClaimLifespanDays} days\
           \nNetwork: ${network.name}\n`
        );
      }
      return executorClaimLifespan;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
