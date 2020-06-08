import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-submittask:defaultpayload:ConditionTime",
  `Returns a hardcoded conditionData of ConditionTime`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      // Params
      const timestamp = Math.floor(Date.now() / 1000); // now
      const inputs = [timestamp];
      // Encoding
      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname: "ConditionTime",
        functionname: "ok",
        inputs,
        log
      });
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
