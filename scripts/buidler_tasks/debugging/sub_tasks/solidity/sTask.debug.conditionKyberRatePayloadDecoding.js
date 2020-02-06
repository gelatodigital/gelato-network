import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:conditionkyberratepayloaddecoding")
  .addPositionalParam("conditionPayloadWithSelector")
  .setAction(async (taskArgs) => {
    try {
      if (network.name != "buidlerevm") throw new Error("buidlerevm only");

      let contractname = "ConditionKyberRatePayloadDecoding";
      const conditionAddress = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      const contract = await run("instantiateContract", {
        contractname,
        contractaddress: conditionAddress,
        write: true
      });

      await contract.decodePayload(taskArgs[0]);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
