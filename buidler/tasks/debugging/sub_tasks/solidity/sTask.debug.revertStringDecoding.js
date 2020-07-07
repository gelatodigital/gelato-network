import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:revertstringdecoding").setAction(
  async () => {
    try {
      if (network.name != "buidlerevm") throw new Error("\nbuidlerevm only");

      const actionAddress = await run("gc-deploy", {
        contractname: "Action",
        network: "buidlerevm",
      });

      const userProxyAddress = await run("gc-deploy", {
        contractname: "UserProxy",
        network: "buidlerevm",
      });

      const coreContract = await run("gc-deploy", {
        contractname: "Core",
        network: "buidlerevm",
      });

      await coreContract.catchErrorString(userProxyAddress, actionAddress);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  }
);
