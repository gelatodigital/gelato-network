import { task } from "@nomiclabs/buidler/config";
import { Interface, utils } from "ethers";

export default task("iface-encode")
  .addVariadicPositionalParam("inputs")
  .addOptionalParam("abi")
  .addOptionalParam("contractname")
  .addOptionalParam("functionname")
  .addFlag("log")
  .setAction(async taskArgs => {
    try {
      if (!taskArgs.abi && (!taskArgs.contractname || !taskArgs.functionname)) {
        throw new Error(
          `\n iface-encode: must provide abi OR contractname & functionname\n`
        );
      }

      if (!taskArgs.abi) {
        taskArgs.abi = await run("abi-get", {
          contractname: taskArgs.contractname
        });
      }

      const iFace = new Interface(taskArgs.abi);

      

      if (taskArgs.log) {
        console.log("\n iface-encode:\n", taskArgs);
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
