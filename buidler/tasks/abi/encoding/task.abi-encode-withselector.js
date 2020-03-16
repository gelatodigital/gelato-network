import { task } from "@nomiclabs/buidler/config";
import { utils } from "ethers";
import checkNestedObj from "../../../../scripts/helpers/nestedObjects/checkNestedObj";

export default task("abi-encode-withselector")
  .addPositionalParam("contractname")
  .addPositionalParam("functionname")
  .addOptionalVariadicPositionalParam("inputs")
  .addFlag("log")
  .setAction(async taskArgs => {
    try {
      const abi = await run("abi-get", { contractname: taskArgs.contractname });
      const interFace = new utils.Interface(abi);

      if (!checkNestedObj(interFace, "functions", taskArgs.functionname))
        throw new Error("functionname is not on contract's interface");

      const payloadWithSelector = interFace.functions[
        taskArgs.functionname
      ].encode([...taskArgs.inputs]);

      if (taskArgs.log) {
        console.log(taskArgs);
        console.log(`\nEncodedPayloadWithSelector:\n${payloadWithSelector}\n`);
      }
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
