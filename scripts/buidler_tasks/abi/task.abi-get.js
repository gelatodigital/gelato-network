import { task } from "@nomiclabs/buidler/config";
import { readArtifact } from "@nomiclabs/buidler/plugins";

export default task("abi-get")
  .addPositionalParam("contractname")
  .addFlag("log")
  .setAction(async ({ contractname, log }) => {
    try {
      const { abi } = await readArtifact(config.paths.artifacts, contractname);
      if (log) {
        console.log(`\nContractName:  ${contractname}`);
        console.log("ABI:\n", abi, "\n");
      }
      return abi;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
