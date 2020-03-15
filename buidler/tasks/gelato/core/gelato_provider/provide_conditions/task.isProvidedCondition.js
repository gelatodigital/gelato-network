import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-isprovidedcondition",
  `Return (or --log) GelatoCore.isProvidedCondition([<provider>: defaults to default provider], conditionname) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname")
  .addOptionalPositionalParam(
    "provider",
    "The address of the provider, whose condition provision we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ conditionname, provider, log }) => {
    try {
      provider = await run("handleGelatoProvider", { provider });
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: conditionname
      });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const isProvidedCondition = await gelatoCore.isProvidedCondition(
        provider,
        conditionAddress
      );
      if (log) {
        console.log(
          `\n Provider:        ${provider}\
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
