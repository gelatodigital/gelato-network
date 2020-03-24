import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";

export default task(
  "gc-isprovidedcondition",
  `Return (or --log) GelatoCore.isProvidedCondition([<gelatoprovider>: defaults to default gelatoprovider], conditionname) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname")
  .addOptionalPositionalParam(
    "gelatoprovider",
    "The address of the gelatoprovider, whose condition provision we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ conditionname, gelatoprovider, log }) => {
    try {
      gelatoprovider = await run("handleGelatoProvider", { gelatoprovider });
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: conditionname
      });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const isProvidedCondition = await gelatoCore.isProvidedCondition(
        gelatoprovider,
        conditionAddress
      );
      if (log) {
        console.log(
          `\n Provider:        ${gelatoprovider}\
           \n Condition:       ${conditionname} at ${conditionAddress}\
           \n Network:         ${network.name}\
           \n IsProvided?:     ${isProvidedCondition ? "✅" : "❌"}\n`
        );
      }
      return isProvidedCondition;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
