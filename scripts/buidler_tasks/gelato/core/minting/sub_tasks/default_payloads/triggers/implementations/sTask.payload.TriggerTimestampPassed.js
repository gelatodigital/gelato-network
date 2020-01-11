import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gelato-core-mint:payload:TriggerTimestampPassed",
  `Returns a hardcoded triggerPayloadWithSelector of TriggerTimestampPassed`
)
  .addParam("timestamp", "defaults to Date.now()")
  .addFlag("log")
  .setAction(async ({ timestamp, log }) => {
    try {
      const contractname = "TriggerTimestampPassed";
      // fired(_timestamp)
      const functionname = "fired";
      // Params
      if (!timestamp) timestamp = Math.floor(Date.now() / 1000);
      const inputs = [timestamp];
      // Encoding
      const payloadWithSelector = await run("abiEncodeWithSelector", {
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
