import { task, types } from "@nomiclabs/buidler/config";

import sysAdminInitialState from "../../../test/gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";

export default task("deploy-gc")
  .addOptionalPositionalParam(
    "gelatogaspriceoracle",
    "Address of deployed oracle. Defaults to Chainlink network instance."
  )
  .addOptionalPositionalParam(
    "oraclerequestdata",
    "The payload for the oracle gas price request.",
    sysAdminInitialState.oracleRequestData
  )
  .addOptionalPositionalParam(
    "gelatomaxgas",
    "The payload for the oracle gas price request. Defaults to 'lastAnswer()' selector",
    sysAdminInitialState.gelatoMaxGas,
    types.int
  )
  .addOptionalPositionalParam(
    "internalgasrequirement",
    "The gas required by GelatoCore to handle execution reverts",
    sysAdminInitialState.internalGasRequirement,
    types.int
  )
  .addOptionalPositionalParam(
    "minexecutorstake",
    "BigNumber",
    sysAdminInitialState.minExecutorStake,
    types.json
  )
  .addOptionalPositionalParam(
    "executorsuccessshare",
    "BigNumber",
    sysAdminInitialState.executorSuccessShare,
    types.int
  )
  .addOptionalPositionalParam(
    "sysadminsuccessshare",
    "BigNumber",
    sysAdminInitialState.sysAdminSuccessShare,
    types.int
  )
  .addOptionalParam(
    "signerindex",
    "The Signer accounts index to use for deployment. This can be used for Ownable contracts.",
    0,
    types.int
  )
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.gelatogaspriceoracle) {
        taskArgs.gelatogaspriceoracle = await run("bre-config", {
          addressbookcategory: "gelatoGasPriceOracle",
          addressbookentry: "chainlink",
        });
      }

      // Calculate totalSuccessShare
      taskArgs.totalsuccessshare =
        taskArgs.executorsuccessshare + taskArgs.sysadminsuccessshare;

      if (taskArgs.log)
        console.log("\n deployGelatoCore TaskArgs:", taskArgs, "\n");

      const gelatoCoreConstructorArgs = {
        gelatoGasPriceOracle: taskArgs.gelatogaspriceoracle,
        oracleRequestData: taskArgs.oraclerequestdata,
        gelatoMaxGas: taskArgs.gelatomaxgas,
        internalGasRequirement: taskArgs.internalgasrequirement,
        minExecutorStake: taskArgs.minexecutorstake,
        executorSuccessShare: taskArgs.executorsuccessshare,
        sysAdminSuccessShare: taskArgs.sysadminsuccessshare,
        totalSuccessShare: taskArgs.totalsuccessshare,
      };

      await run("deploy", {
        contractname: "GelatoCore",
        constructorargs: [gelatoCoreConstructorArgs],
        signerindex: taskArgs.signerindex,
        log: taskArgs.log,
      });
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
