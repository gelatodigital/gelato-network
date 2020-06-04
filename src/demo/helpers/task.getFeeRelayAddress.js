import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gelato-get-fee-relay-address",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async () => {
    try {
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      // Check if Provider State Setter is already deployed
      const feeRelayFactory = await run("instantiateContract", {
        contractname: "ProviderFeeRelayFactory",
        signer: provider,
        write: true,
      });

      const isDeployed = await feeRelayFactory.isDeployed(providerAddress);

      if (isDeployed) return await feeRelayFactory.feeRelays(providerAddress);
      else return constants.AddressZero;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Error in script`);
      process.exit(1);
    }
  });
