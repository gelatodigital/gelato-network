import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:payloadslicing")
  .addPositionalParam("contractname", "the contractname to debug for")
  .addOptionalPositionalParam("payload", "the payload to debug slicing for")
  .setAction(async taskArgs => {
    try {
      if (network.name != "buidlerevm") throw new Error("\nbuidlerevm only");

      const contractname = taskArgs[0];
      if (!contractname.startsWith("Action"))
        throw new Error("\nGelato Actions only");
      await run("checkContractName", { contractname });

      let payload;
      if (!taskArgs[1])
        payload = await run(`gc-createexecclaim:defaultpayload:${contractname}`);
      else payload = taskArgs[1];

      const contract = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      const result = await contract.ok(payload);
      console.log(`Result:\n ${result}`);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
