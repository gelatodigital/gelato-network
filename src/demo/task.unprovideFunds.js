import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../buidler.config";

export default task(
  "gelato-unprovidefunds",
  `Sends tx to GelatoCore.unprovideFunds([<amount>]) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "ethamount",
    "The amount of eth to add to the gelatoprovider's balance"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ ethamount, log }) => {
    try {
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      const withdrawAmount = utils.parseEther(ethamount);

      const availableFunds = await run("gc-providerfunds", {
        gelatoprovider: providerAddress,
      });

      if (availableFunds.toString() === "0")
        throw new Error(`\n Provider Out Of Funds\n`);

      // Gelato Provider is the 3rd signer account
      if (log) {
        console.log(`
           \n Provider Address: ${providerAddress}\n
           \n Withdraw Amount: ${
             withdrawAmount > availableFunds ? availableFunds : withdrawAmount
           }\n`);
      }
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: provider,
        write: true,
      });

      const tx = await gelatoCore.unprovideFunds(withdrawAmount);

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });

      console.log(etherscanLink);

      await tx.wait();

      console.log(`✅ Tx mined`);
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
