import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:ActionRebalancePortfolio",
  `Returns a hardcoded actionPayload of ActionRebalancePortfolio`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionRebalancePortfolio",
        functionname: "action",
        inputs: []
      });
      if (log) console.log(actionPayload);
      return actionPayload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
