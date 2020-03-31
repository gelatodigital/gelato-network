import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";

export default task(
  "gc-isprovidedaction",
  `Return (or --log) GelatoCore.isProvidedAction([<gelatoprovider>: defaults to default gelatoprovider], actionname) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("actionname")
  .addOptionalPositionalParam(
    "gelatoprovider",
    "The address of the gelatoprovider, whose action provision we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ actionname, gelatoprovider, log }) => {
    try {
      gelatoprovider = await run("handleGelatoProvider", { gelatoprovider });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: actionname
      });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const isProvidedAction = await gelatoCore.isProvidedAction(
        gelatoprovider,
        actionAddress
      );
      if (log) {
        console.log(
          `\n Provider:        ${gelatoprovider}\
           \n Condition:       ${actionname} at ${actionAddress}\
           \n Network:         ${network.name}\
           \n IsProvided?:     ${isProvidedAction ? "✅" : "❌"}\n`
        );
      }
      return isProvidedAction;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
