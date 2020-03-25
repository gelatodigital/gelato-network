import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:conditionkyberratepayloaddecoding")
  .addPositionalParam("conditionPayload")
  .setAction(async taskArgs => {
    try {
      if (network.name != "buidlerevm") throw new Error("buidlerevm only");

      const contract = await run("deploy", {
        contractname: "ConditionKyberRatePayloadDecoding",
        network: "buidlerevm"
      });

      await contract.decodePayload(taskArgs[0]);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
