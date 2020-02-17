import { task } from "@nomiclabs/buidler/config";
import { utils } from "ethers";
import checkNestedObj from "../../../../scripts/helpers/nestedObjects/checkNestedObj";

export default task("abi-encode-withselector")
  .addPositionalParam("contractname")
  .addPositionalParam("functionname")
  .addOptionalVariadicPositionalParam("inputs")
  .addFlag("log")
  .setAction(async ({ contractname, functionname, inputs, log }) => {
    try {
      const abi = await run("abi-get", { contractname });
      const interFace = new utils.Interface(abi);

      if (!checkNestedObj(interFace, "functions", functionname))
        throw new Error("functionname is not on contract's interface");

      const payloadWithSelector = interFace.functions[functionname].encode([
        ...inputs
      ]);
      if (log) {
        console.log(`\nContractName:  ${contractname}`);
        console.log(`FunctionName:    ${functionname}`);
        console.log(`Inputs:\n${inputs}`);
        console.log(`EncodedPayloadWithSelector:\n${payloadWithSelector}\n`);
      }
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
