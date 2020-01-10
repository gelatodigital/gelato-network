import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gelato-core-mintexecutionclaim",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("selectedexecutor", "address")
  .addPositionalParam("triggername", "must exist inside buidler.config")
  .addPositionalParam("triggerPayloadWithSelector", "abi.encoded bytes")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addPositionalParam("actionPayloadWithSelector", "abi.encoded bytes")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      const { GelatoCore: gelatoCoreAdddress } = await run("bre-config", {
        deployments: true
      });
      const gelatoCoreABI = await run("getContractABI", {
        contractname: "GelatoCore"
      });
      const [signer] = await ethers.signers();
      const gelatoCoreContract = new Contract(
        gelatoCoreAdddress,
        gelatoCoreABI,
        signer
      );

      const triggerAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.triggername
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      const mintTx = await gelatoCoreContract.mintExecutionClaim(
        taskArgs.selectedexecutor,
        triggerAddress,
        taskArgs.triggerPayloadWithSelector,
        actionAddress,
        taskArgs.actionPayloadWithSelector
      );

      if (log)
        console.log(
          `\n\ntxHash gelatoCore.mintExectuionClaim: ${mintTx.hash}\n`
        );
      await mintTx.wait();
      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
