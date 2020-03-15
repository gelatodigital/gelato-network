import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-providefunds",
  `Sends tx to GelatoCore.provideFunds(<) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "ethamount",
    "The amount of eth to add to the gelatoprovider's balance"
  )
  .addOptionalPositionalParam(
    "gelatoprovider",
    "The gelatoprovider to add balance to."
  )
  .addOptionalParam(
    "funderindex",
    "Index of tx Signer account generated from mnemonic available inside BRE",
    2,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ ethamount, gelatoprovider, funderindex, log }) => {
    try {
      gelatoprovider = await run("handleGelatoProvider", { gelatoprovider });
      const { [funderindex]: funder } = await ethers.signers();
      if (log) {
        console.log(`
          \n Funding from account with index: ${funderindex}\
          \n Funder:                          ${funder}\
          \n Funding Provider with Address:   ${gelatoprovider}\n
        `);
      }
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
        signer: funder
      });
      const tx = await gelatoCore.provideFunds(gelatoprovider, {
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
