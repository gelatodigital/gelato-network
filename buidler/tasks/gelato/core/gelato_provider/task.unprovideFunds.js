import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-unprovidefunds",
  `Sends tx to GelatoCore.unprovideFunds([<amount>]) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("withdrawamount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ withdrawamount, log }) => {
    try {
      if (!withdrawamount) withdrawamount = await run("gc-providerfunds");
      // Gelato Provider is the 3rd signer account
      const { 2: gelatoProvider } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoProvider,
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
