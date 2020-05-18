import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:revertstringdecoding").setAction(
  async () => {
    try {
      if (network.name != "buidlerevm") throw new Error("\nbuidlerevm only");

      const actionAddress = await run("deploy", {
        contractname: "Action",
        network: "buidlerevm"
      });

      const userProxyAddress = await run("deploy", {
        contractname: "UserProxy",
        network: "buidlerevm"
      });

      const coreContract = await run("deploy", {
        contractname: "Core",
        network: "buidlerevm"
      });

      await coreContract.catchErrorString(userProxyAddress, actionAddress);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  }
);
