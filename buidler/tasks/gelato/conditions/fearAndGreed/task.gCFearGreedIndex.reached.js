import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "g-cfeargreedindex-reached",
  `Sends tx to ConditionFearGreedIndex.reached(<oldFearAndGreedIndex>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("oldfearandgreedindex", "is the condition activated")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ oldfearandgreedindex, log }) => {
    try {
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        write: true
      });
      const trueOrFalse = await condition.reached(oldfearandgreedindex);
      if (log)
        console.log(`\n ConditionFearGreedIndex.reached: ${trueOrFalse}\n`);
      return trueOrFalse;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
