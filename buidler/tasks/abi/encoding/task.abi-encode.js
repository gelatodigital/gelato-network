import { task } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default task("abi-encode")
  .addPositionalParam("contractname")
  .addPositionalParam("functionname")
  .addVariadicPositionalParam("inputs")
  .addFlag("log")
  .setAction(async taskArgs => {
    try {
      const abi = await run("abi-get", { contractname: taskArgs.contractname });

      let functionABI;

      for (const obj of abi)
        if (obj.name == taskArgs.functionname) functionABI = obj;

      if (!functionABI) {
        throw new Error(
          `\n Function ${taskArgs.functionname} is not on ${taskArgs.contractname} abi\n`
        );
      }

      const abiCoder = utils.defaultAbiCoder;

      const encodedData = abiCoder.encode(functionABI.inputs, taskArgs.inputs);

      if (taskArgs.log) {
        console.log(taskArgs);
        console.log(`\n encodedData:\n${encodedData}\n`);
      }
      return encodedData;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
