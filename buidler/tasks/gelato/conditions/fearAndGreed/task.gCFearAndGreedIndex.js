import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
// import { Contract } from 'ethers';

export default task(
  "g-cfeargreedindex-fearAndGreedIndex",
  `Sends tx to ConditionFearGreedIndex.fearAndGreedIndex() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        read: true
      });
      const fearAndGreedIndexValue = await condition.fearAndGreedIndex();
      if (log)
        console.log(
          `\n ConditionFearGreedIndex.fearAndGreedIndex: ${fearAndGreedIndexValue}\n`
        );
      return fearAndGreedIndexValue;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
