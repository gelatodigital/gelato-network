import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "g-cfeargreedindex-current",
  `Sends tx to ConditionFearGreedIndex.current() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        read: true
      });
      const fearAndGreedIndexValue = await condition.current();
      if (log) {
        console.log(
          `\n ConditionFearGreedIndex.fearAndGreedIndex: ${fearAndGreedIndexValue}\n`
        );
      }
      return fearAndGreedIndexValue;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
