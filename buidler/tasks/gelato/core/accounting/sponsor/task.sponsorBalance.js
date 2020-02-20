import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-executorbalance",
  `Return (or --log) GelatoCore.providerFunding([<provider>: defaults to default provider]) on [--network] (default: ${defaultNetwork})`
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

      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      const providerFunding = await gelatoCoreContract.providerFunding(provider);
      const providerBalanceETH = utils.formatEther(providerFunding);

      if (log) {
        console.log(
          `\n Provider:        ${provider}\
           \n ProviderBalance: ${providerBalanceETH} ETH\
           \n Network:        ${network.name}\n`
        );
      }
      return providerFunding;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
