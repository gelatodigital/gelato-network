import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:payloadslicing")
  .addPositionalParam("contractname", "the contractname to debug for")
  .addOptionalPositionalParam("payload", "the payload to debug slicing for")
  .setAction(async taskArgs => {
    try {
      if (network.name != "buidlerevm") throw new Error("buidlerevm only");

      const contractname = taskArgs[0];
      if (!contractname.startsWith("Action"))
        throw new Error("Gelato Actions only");
      await run("checkContractName", { contractname });

      let payload;
      if (!taskArgs[1])
        payload = await run(`gc-mint:defaultpayload:${contractname}`);
      else payload = taskArgs[1];

      const contractaddress = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      const contract = await run("instantiateContract", {
        contractname,
        contractaddress,
        read: true
      });

      const result = await contract.actionConditionsCheck(payload);
      console.log(`Result:\n ${result}`);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
