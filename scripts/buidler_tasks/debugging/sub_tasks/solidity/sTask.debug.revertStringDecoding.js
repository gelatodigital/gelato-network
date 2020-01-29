import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("debug:revertstringdecoding").setAction(
  async () => {
    try {
      if (network.name != "buidlerevm") throw new Error("buidlerevm only");

      let contractname = "Action";
      const actionAddress = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      contractname = "UserProxy";
      const userProxyAddress = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      contractname = "Core";
      const coreAddress = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      const coreContract = await run("instantiateContract", {
        contractname,
        contractaddress: coreAddress,
        write: true
      });

      await coreContract.catchErrorString(userProxyAddress, actionAddress);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
);
