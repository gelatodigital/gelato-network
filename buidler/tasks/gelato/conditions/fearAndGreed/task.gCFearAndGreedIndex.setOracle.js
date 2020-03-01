import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "g-cfeargreedindex-setoracle",
  `Sends tx to ConditionFearGreedIndex.setFearAndGreedIndex(<newOracleValue>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("newvalue", "Value between 0 and 100", 50, types.int)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ newvalue, log }) => {
    try {
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        write: true
      });
      const tx = await condition.setFearAndGreedIndex(newvalue);
      if (log) console.log(`\ntxHash setFearAndGreedIndex: ${tx.hash}\n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
