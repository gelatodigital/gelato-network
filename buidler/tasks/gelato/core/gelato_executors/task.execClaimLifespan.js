import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-execclaimlifespan",
  `Return (or --log) GelatoCore.execClaimLifespan([<gelatoexecutor>: defaults to default gelatoexecutor]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalPositionalParam(
    "gelatoexecutor",
    "The address of the gelatoexecutor, whose price we query"
  )
  .setAction(async ({ gelatoexecutor, log }) => {
    try {
      gelatoexecutor = await run("handleGelatoExecutor", { gelatoexecutor });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const execClaimLifespan = await gelatoCore.execClaimLifespan(
        gelatoexecutor
      );
      const executorClaimLifespanDays = execClaimLifespan / 86400;
      if (log) {
        console.log(
          `\nExecutor:              ${gelatoexecutor}\
           \nExecutorClaimLifespan: ${executorClaimLifespanDays} days\
           \nNetwork:               ${network.name}\n`
        );
      }
      return execClaimLifespan;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
