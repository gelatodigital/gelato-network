import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-providerfunds",
  `Return (or --log) GelatoCore.providerFunds([<provider>: defaults to default provider]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalPositionalParam(
    "provider",
    "The address of the provider, whose balance we query"
  )
  .setAction(async ({ provider, log }) => {
    try {
      if (!provider) {
        provider = await run("bre-config", {
          addressbookcategory: "provider",
          addressbookentry: "default"
        });
      }

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      const providerFunds = await gelatoCore.providerFunds(provider);
      const providerBalanceETH = utils.formatEther(providerFunds);

      if (log) {
        console.log(
          `\n Provider:        ${provider}\
           \n ProviderBalance: ${providerBalanceETH} ETH\
           \n Network:        ${network.name}\n`
        );
      }
      return providerFunds;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
