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

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
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
