import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-providermodules",
  `Return (or --log) GelatoCore.executorFunds([<gelatoprovider>: defaults to default gelatoprovider]) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "gelatoprovider",
    "The address of the gelatoprovider, whose balance we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gelatoprovider, log }) => {
    try {
      gelatoprovider = await run("handleGelatoProvider", { gelatoprovider });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const providerModules = await gelatoCore.providerModules(gelatoprovider);
      if (log) console.log(providerModules);
      return providerModules;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
