import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:conditionkyberratepayloaddecoding")
  .addPositionalParam("conditionData")
  .setAction(async taskArgs => {
    try {
      if (network.name != "buidlerevm") throw new Error("\nbuidlerevm only");

      const contract = await run("deploy", {
        contractname: "ConditionKyberRatePayloadDecoding",
        network: "buidlerevm"
      });

      await contract.decodePayload(taskArgs[0]);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
