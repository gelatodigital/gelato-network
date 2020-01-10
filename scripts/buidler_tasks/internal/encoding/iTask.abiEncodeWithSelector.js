import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask("abiEncodeWithSelector")
  .addParam("contractname")
  .addParam("functionname")
  .addOptionalVariadicPositionalParam("inputs")
  .addOptionalParam("log")
  .setAction(async ({ contractname, functionname, inputs, log }) => {
    try {
      const contract = await ethers.getContract(contractname);
      const abi = contract.interface.abi;
      const interFace = new utils.Interface(abi);
      const payloadWithSelector = interFace.functions[functionname].encode([
        ...inputs
      ]);
      if (log) {
        console.log(`\nContractName:  ${contractname}`);
        console.log(`Function Name: ${functionname}`);
        console.log(`Inputs:\n${inputs}`);
        console.log(`EncodedPayloadWithSelector:\n${payloadWithSelector}\n`);
      }
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
