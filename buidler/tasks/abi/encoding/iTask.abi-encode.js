import { internalTask, types } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask("abi-encode")
  .addOptionalParam("contractname")
  .addOptionalParam("functionname")
  .addOptionalParam(
    "types",
    "Array of types for each input value",
    undefined,
    types.json
  )
  .addParam("values", "Array of values for each type", undefined, types.json)
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      const contractSupplied = taskArgs.contractname ? true : false;

      if (contractSupplied && !taskArgs.functionname)
        throw new Error("\n abi-encode: must supply functionname");

      if (contractSupplied && taskArgs.types) {
        throw new Error(
          "\n abi-encode: either --contractname --functionname OR --types"
        );
      }

      if (!contractSupplied && !taskArgs.types) {
        throw new Error(
          "\n abi-encode: neither contractname nor types supplied"
        );
      }

      if (taskArgs.log) console.log("\n abi-encode: TaskArgs:\n", taskArgs);

      const abiCoder = utils.defaultAbiCoder;
      let encodedData;
      if (contractSupplied) {
        const abi = await run("abi-get", {
          contractname: taskArgs.contractname,
        });
        let functionABI;
        for (const obj of abi)
          if (obj.name == taskArgs.functionname) functionABI = obj;
        if (!functionABI) {
          throw new Error(
            `\n abi-encode: Function ${taskArgs.functionname} is not on ${taskArgs.contractname} abi\n`
          );
        }
        encodedData = abiCoder.encode(functionABI.inputs, taskArgs.values);
      } else {
        encodedData = abiCoder.encode(taskArgs.types, taskArgs.values);
      }

      if (taskArgs.log) console.log(`\n encodedData:\n${encodedData}\n`);

      return encodedData;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
