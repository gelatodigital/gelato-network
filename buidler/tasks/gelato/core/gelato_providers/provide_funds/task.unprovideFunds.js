import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-unprovidefunds",
  `Sends tx to GelatoCore.unprovideFunds([<amount>]) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("withdrawamount", "The amount to withdraw")
  .addFlag("log", "Logs return values to stdout")
  .addOptionalParam(
    "providerindex",
    "Index of tx Signer account generated from mnemonic available inside BRE",
    2,
    types.int
  )
  .setAction(async ({ withdrawamount, providerindex, log }) => {
    try {
      const availableFunds = await run("gc-providerfunds");
      if (availableFunds.toString() === "0")
        throw new Error(`\n Provider Out Of Funds\n`);
      if (!withdrawamount) withdrawamount = availableFunds;
      else if (withdrawamount > availableFunds)
        throw new Error(`\n Insufficient Provider Funds\n`);
      // Gelato Provider is the 3rd signer account
      const { [providerindex]: gelatoProvider } = await ethers.getSigners();
      if (log) {
        console.log(
          `\n Taking account with index: ${providerindex}\
		       \n Provider Address: ${gelatoProvider._address}\n`
        );
      }
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
      console.error(error, "\n");
      process.exit(1);
    }
  });
