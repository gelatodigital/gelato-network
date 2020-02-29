import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mint:defaultpayload:ConditionTimestampPassed",
  `Returns a hardcoded conditionPayload of ConditionTimestampPassed`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "ConditionTimestampPassed";
      // reached(_timestamp)
      const functionname = "reached";
      // Params
      const timestamp = (Math.floor(Date.now() / 1000)); // now
      const inputs = [timestamp];
      // Encoding
      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname,
        functionname,
        inputs,
        log
      });
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
