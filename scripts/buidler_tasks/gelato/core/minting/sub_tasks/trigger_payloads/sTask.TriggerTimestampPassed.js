import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gelato-core-mint:payloads:TriggerTimestampPassed",
  `Returns a hardcoded triggerPayloadWithSelector of TriggerTimestampPassed`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "TriggerTimestampPassed";
      // fired(address _coin, address _account, uint256 _refBalance)
      const functionname = "fired";
      // Params
      const timestamp = Math.floor(Date.now() / 1000);
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
