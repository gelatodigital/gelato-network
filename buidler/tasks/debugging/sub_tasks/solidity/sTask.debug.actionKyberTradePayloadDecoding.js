import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:actionkybertradepayloaddecoding")
  .addPositionalParam("actionData")
  .setAction(async (taskArgs) => {
    try {
      if (network.name != "buidlerevm") throw new Error("\nbuidlerevm only");

      const contract = await run("gc-deploy", {
        contractname: "ActionKyberTradePayloadDecoding",
        network: "buidlerevm",
      });

      await contract.decodePayload(taskArgs[0]);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
