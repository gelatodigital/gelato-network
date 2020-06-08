import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gelato-providefunds",
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
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ ethamount, gelatoprovider, log }) => {
    try {
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      const depositAmount = utils.parseEther(ethamount);
      if (!gelatoprovider) gelatoprovider = providerAddress;

      if (log) {
        console.log(`
          \n Funder:                          ${providerAddress}\
          \n Funding Provider with Address:   ${providerAddress}\n
          \n Amount:                          ${ethamount} ETH\n
        `);
      }
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
        signer: provider,
      });
      const tx = await gelatoCore.provideFunds(gelatoprovider, {
        value: depositAmount,
      });

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(`Link to transaction: \n ${etherscanLink}\n`);
      await tx.wait();
      console.log(`✅ Tx mined`);
      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
