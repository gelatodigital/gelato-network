import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("ethers-interface-parseLogs")
  .addParam("contractname")
  .addParam("logs")
  .setAction(async ({ contractname, logs }) => {
    try {
      const contractInterface = await run("ethers-interface-new", {
        contractname
      });
      if (Array.isArray(logs))
        return logs.map(log => contractInterface.parseLog(log));
      else return contractInterface.parseLog(logs);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
