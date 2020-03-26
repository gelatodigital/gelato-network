import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("ethers-interface-parseLogs")
  .addParam("contractname")
  .addParam("eventlogs")
  .setAction(async ({ contractname, eventlogs }) => {
    try {
      const contractInterface = await run("ethers-interface-new", {
        contractname
      });
      if (Array.isArray(eventlogs))
        return eventlogs.map(log => contractInterface.parseLog(log));
      else return contractInterface.parseLog(eventlogs);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
