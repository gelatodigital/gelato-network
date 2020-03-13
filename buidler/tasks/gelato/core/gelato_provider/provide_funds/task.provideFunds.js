import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-providefunds",
  `Sends tx to GelatoCore.provideFunds(<) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "ethamount",
    "The amount of eth to add to the provider's balance"
  )
  .addOptionalPositionalParam("provider", "The provider to add balance to.")
  .addOptionalParam(
    "funderindex",
    "Index of tx Signer account generated from mnemonic available inside BRE",
    2,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ ethamount, provider, funderindex, log }) => {
    try {
      if (!provider) provider = await run("handleProvider", { provider });
      const { [funderindex]: gelatoProvider } = await ethers.signers();
      if (log) {
        console.log(
          `\n Funding from account with index: ${funderindex}\
		       \n Funding Provider with Address:   ${provider}\n`
        );
      }
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
        signer: gelatoProvider
      });
      const tx = await gelatoCore.provideFunds(provider, {
        value: utils.parseEther(ethamount)
      });
      if (log) console.log(`\n\ntxHash providefunds: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
