import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("ethers-interface-parseTransaction")
  .addParam("contractname")
  .addParam("logs")
  .setAction(async ({ contractname, transaction }) => {
    try {
      const contractInterface = await run("ethers-interface-new", {
        contractname
      });
      const parsedLogs = logs.map(log => contractInterface.parseLog(log));
      return parsedLogs;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
