import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-isprovidedmodule",
  `Return (or --log) GelatoCore.isProvidedCondition([<gelatoprovider>: defaults to default gelatoprovider], conditionname) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("modulename")
  .addOptionalPositionalParam(
    "gelatoprovider",
    "The address of the gelatoprovider, whose condition provision we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ modulename, gelatoprovider, log }) => {
    try {
      gelatoprovider = await run("handleGelatoProvider", { gelatoprovider });
      const moduleAddress = await run("bre-config", {
        deployments: true,
        contractname: modulename,
      });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const isProviderModule = await gelatoCore.isProviderModule(
        gelatoprovider,
        moduleAddress
      );
      if (log) {
        console.log(
          `\n Provider:        ${gelatoprovider}\
           \n Module:          ${modulename} at ${moduleAddress}\
           \n Network:         ${network.name}\
           \n IsProvided?:     ${isProviderModule ? "✅" : "❌"}\n`
        );
      }
      return isProviderModule;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
