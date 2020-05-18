import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "g-cfeargreedindex-set",
  `Sends tx to ConditionFearGreedIndex.set(<newOracleValue>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("newvalue", "Value between 0 and 100", 50, types.int)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ newvalue, log }) => {
    try {
      const { [0]: provider } = await ethers.getSigners();
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        write: true,
        signer: provider
      });
      const tx = await condition.set(newvalue);
      if (log) console.log(`\ntxHash set: ${tx.hash}\n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
