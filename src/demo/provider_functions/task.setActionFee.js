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
  .setAction(async ({ actionaddress, feenumerator }) => {
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

      console.log(`
      \nFee relay contract already deployed? ${isDeployed}
      `);

      if (!isDeployed) await feeRelayFactory.create();

      const feeRelayAddress = await feeRelayFactory.feeRelays(providerAddress);

      const globalState = await run("instantiateContract", {
        contractname: "GlobalState",
        signer: provider,
        write: true,
      });

      console.log(`
      \n Setting fee for action: ${actionaddress}
      \n Numerator: ${feenumerator}
      \n Denominator: 1000
      --------------------------
      \n Fee: ${parseFloat(feenumerator / 1000)}

      \n Your FeeRelay Contract to call before the action: ${feeRelayAddress}
      `);

      const tx = await globalState.setActionFee(
        actionaddress,
        feenumerator,
        1000,
        {
          gasLimit: 300000,
        }
      );

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(etherscanLink);
      await tx.wait();
      console.log(`✅ Tx mined - Fee updated`);
      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
