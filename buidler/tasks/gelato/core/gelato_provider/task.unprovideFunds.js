import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-unprovidefunds",
  `Sends tx to GelatoCore.unprovideFunds([<amount>]) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("withdrawamount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ withdrawamount, log }) => {
    try {
      // Provider is the 3rd signer account
      const { 2: signer3 } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: signer3,
        write: true
      });
      const tx = await gelatoCore.unprovideFunds(withdrawamount);
      if (log) console.log(`\n\ntxHash unprovideFunds: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
