import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mint:defaultpayload:TriggerTimestampPassed",
  `Returns a hardcoded triggerPayloadWithSelector of TriggerTimestampPassed`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "TriggerTimestampPassed";
      // fired(_timestamp)
      const functionname = "fired";
      // Params
      const timestamp = (Math.floor(Date.now() / 1000) + 60); // 60 seconds from now
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
