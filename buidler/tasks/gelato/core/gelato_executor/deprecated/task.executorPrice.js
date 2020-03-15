import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-executorprice",
  `Return (or --log) GelatoCore.executorPrice([<gelatoexecutor>: defaults to default gelatoexecutor]) on [--network] (default: ${defaultNetwork})`
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
      const executorPrice = await gelatoCore.executorPrice(gelatoexecutor);
      const executorPriceGwei = utils.formatUnits(executorPrice, "gwei");
      if (log) {
        console.log(`
          \nExecutor:      ${gelatoexecutor}\
          \nExecutorPrice: ${executorPriceGwei} gwei\
          \nNetwork:       ${network.name}\n
        `);
      }
      return executorPrice;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
