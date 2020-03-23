import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("g")
  .addPositionalParam("actionPayload")
  .setAction(async (taskArgs) => {
    try {
      if (network.name != "buidlerevm") throw new Error("buidlerevm only");

      let contractname = "ActionKyberTradePayloadDecoding";

      const actionAddress = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      const contract = await run("instantiateContract", {
        contractname,
        contractaddress: actionAddress,
        write: true
      });

      await contract.decodePayload(taskArgs[0]);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
