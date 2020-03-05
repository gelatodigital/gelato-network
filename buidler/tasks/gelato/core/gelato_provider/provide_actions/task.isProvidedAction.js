import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-isprovidedaction",
  `Return (or --log) GelatoCore.isProvidedAction([<provider>: defaults to default provider], actionname) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("actionname")
  .addOptionalPositionalParam(
    "provider",
    "The address of the provider, whose action provision we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ actionname, provider, log }) => {
    try {
      provider = await run("handleProvider", { provider });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: actionname
      });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const isProvidedAction = await gelatoCore.isProvidedAction(
        provider,
        actionAddress
      );
      if (log) {
        console.log(
          `\n Provider:        ${provider}\
           \n Condition:       ${actionname} at ${actionAddress}\
           \n Network:         ${network.name}\
           \n IsProvided?:     ${isProvidedAction ? "✅" : "❌"}\n`
        );
      }
      return isProvidedAction;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
