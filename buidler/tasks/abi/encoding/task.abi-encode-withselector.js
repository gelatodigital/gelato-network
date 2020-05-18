import { task, types } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default task("abi-encode-withselector")
  .addPositionalParam("contractname")
  .addPositionalParam("functionname")
  .addOptionalVariadicPositionalParam(
    "inputs",
    "Array of function params",
    undefined,
    types.json
  )
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log(taskArgs);

      const abi = await run("abi-get", { contractname: taskArgs.contractname });
      const interFace = new utils.Interface(abi);

      if (!checkNestedObj(interFace, "functions", taskArgs.functionname))
        throw new Error("\nfunctionname is not on contract's interface");

      let payloadWithSelector;

      if (taskArgs.inputs) {
        let iterableInputs;
        try {
          iterableInputs = [...taskArgs.inputs];
        } catch (error) {
          iterableInputs = [taskArgs.inputs];
        }
        payloadWithSelector = interFace.functions[taskArgs.functionname].encode(
          iterableInputs
        );
      } else {
        payloadWithSelector = interFace.functions[taskArgs.functionname].encode(
          []
        );
      }

      if (taskArgs.log)
        console.log(`\nEncodedPayloadWithSelector:\n${payloadWithSelector}\n`);
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
