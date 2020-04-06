import { task } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default task("abi-encode-withselector")
  .addPositionalParam("contractname")
  .addPositionalParam("functionname")
  .addOptionalVariadicPositionalParam("inputs")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log(taskArgs);

      const abi = await run("abi-get", { contractname: taskArgs.contractname });
      const interFace = new utils.Interface(abi);

      if (!checkNestedObj(interFace, "functions", taskArgs.functionname))
        throw new Error("\nfunctionname is not on contract's interface");

      const payloadWithSelector = interFace.functions[
        taskArgs.functionname
      ].encode([...taskArgs.inputs]);

      if (taskArgs.log)
        console.log(`\nEncodedPayloadWithSelector:\n${payloadWithSelector}\n`);
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
