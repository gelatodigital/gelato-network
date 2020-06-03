import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "gelato-set-action-fee",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "actionaddress",
    "address of action to register a fee for"
  )
  .addPositionalParam(
    "feenumerator",
    "numerator of fee. denominator is always 1000 =>  E.g. numerator = 20 for 2%"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      // Check if Provider State Setter is already deployed
      const feeRelayFactory = await run("instantiateContract", {
        contractname: "ProviderFeeRelayFactoryFactory",
        signer: provider,
        write: true,
      });

      const isDeployed = await feeRelayFactory.isDeployed(providerAddress);

      if (!isDeployed) await feeRelayFactory.create();

      const feeRelayAddress = await feeRelayFactory.feeRelays(providerAddress);

      const providerFeeStore = await run("instantiateContract", {
        contractname: "ProviderFeeStore",
        signer: provider,
        write: true,
      });

      const tx = await gelatoCore.provideTaskSpecs([taskSpec], {
        gasLimit: 1000000,
      });

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(etherscanLink);
      await tx.wait();
      console.log(`✅ Tx mined - Task Spec provided`);
      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
