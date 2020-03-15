import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "handleGelatoPayload",
  "Returns default payload for Condition or Action <contractname>, if no payload is passed"
)
  .addPositionalParam("contractname")
  .addOptionalParam("payload")
  .setAction(async ({ contractname, payload }) => {
    try {
      if (payload) return payload;
      payload = await run(`gc-mint:defaultpayload:${contractname}`);
      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
