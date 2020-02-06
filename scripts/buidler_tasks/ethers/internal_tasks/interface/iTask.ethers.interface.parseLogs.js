import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("ethers-interface-parseLogs")
  .addParam("contractname")
  .addParam("logs")
  .setAction(async ({ contractname, logs }) => {
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
