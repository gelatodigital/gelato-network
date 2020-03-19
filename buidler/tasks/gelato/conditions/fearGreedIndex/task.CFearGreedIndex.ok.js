import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "g-cfeargreedindex-ok",
  `Sends tx to ConditionFearGreedIndex.ok(<oldFearAndGreedIndex>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("previndex", "is the condition activated")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ oldfearandgreedindex, log }) => {
    try {
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        write: true
      });
      const trueOrFalse = await condition.ok(oldfearandgreedindex);
      if (log)
        console.log(`\n ConditionFearGreedIndex.ok: ${trueOrFalse}\n`);
      return trueOrFalse;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
