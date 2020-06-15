import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { constants } from "ethers";

export default task(
  "invokeviewfunction",
  `Invokes view finction on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("contractname", "The contract whose abi has the function")
  .addPositionalParam("functionname", "The function we want to call")
  .addPositionalParam(
    "to",
    "The address which to call. Defaults to <contractname>"
  )
  .addOptionalVariadicPositionalParam(
    "inputs",
    "The parameters for --functionname or for the defaultpayloadscript for <contractname>"
  )

  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      // taskArgs sanitzation
      if (taskArgs.functionname && taskArgs.data)
        throw new Error("Provide EITHER --functionname OR --data");

      if (!taskArgs.inputs) taskArgs.inputs = [];

      // --to address defaults to Contractname
      //   if (!taskArgs.to) {
      //     taskArgs.to = await run("bre-config", {
      //       deployments: true,
      //       contractname: taskArgs.contractname
      //     });
      //   }

      if (taskArgs.log) console.log(taskArgs);

      let data = await run("abi-encode-withselector", {
        contractname: taskArgs.contractname,
        functionname: taskArgs.functionname,
        inputs: taskArgs.inputs,
      });

      // let data = ethers.utils.hexDataSlice(ethers.utils.id(`${taskArgs.functionname}()`), ...taskArgs.inputs);

      const txObject = {
        to: taskArgs.to,
        data: data,
      };

      let provider = ethers.getDefaultProvider(network.name);

      let returndata;
      try {
        returndata = await provider.call(txObject);
      } catch (error) {
        console.error(`Error Invoke View Function\n`, error);
        process.exit(1);
      }
      if (taskArgs.log) console.log(returndata);

      return returndata;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
