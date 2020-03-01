import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mint:defaultpayload:ConditionFearGreedIndex",
  `Returns a hardcoded conditionPayload of ConditionFearGreedIndex`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const conditionPayload = await run("abi-encode-withselector", {
        contractname: "ConditionFearGreedIndex",
        functionname: "reached",
        inputs: [50]
      });
      if (log) console.log(conditionPayload);
      return conditionPayload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
