import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-providerfunds",
  `Return (or --log) GelatoCore.providerFunds([<gelatoprovider>: defaults to default gelatoprovider]) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "gelatoprovider",
    "The address of the gelatoprovider, whose balance we query"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gelatoprovider, log }) => {
    try {
      const provider = getProvider();
      if (!gelatoprovider) gelatoprovider = await provider.getAddress();

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const providerFunds = await gelatoCore.providerFunds(gelatoprovider);
      const providerBalanceETH = utils.formatEther(providerFunds);
      if (log) {
        console.log(`
          \n Provider:        ${gelatoprovider}\
          \n ProviderBalance: ${providerBalanceETH} ETH\
          \n Network:         ${network.name}\n
        `);
      }
      return providerFunds;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
