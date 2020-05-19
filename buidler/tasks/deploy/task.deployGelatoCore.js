import { task, types } from "@nomiclabs/buidler/config";

import sysAdminInitialState from "../../../test/gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";

export default task("deploy-gc")
  .addOptionalParam(
    "gelatogaspriceoracle",
    "Address of deployed oracle. Defaults to Chainlink network instance."
  )
  .addOptionalParam(
    "oraclerequestdata",
    "The payload for the oracle gas price request.",
    sysAdminInitialState.oracleRequestData
  )
  .addOptionalParam(
    "gelatomaxgas",
    "The payload for the oracle gas price request. Defaults to 'lastAnswer()' selector",
    sysAdminInitialState.gelatoMaxGas,
    types.int
  )
  .addOptionalParam(
    "internalgasrequirement",
    "The gas required by GelatoCore to handle execution reverts",
    sysAdminInitialState.internalGasRequirement,
    types.int
  )
  .addOptionalParam(
    "minexecutorstake",
    "BigNumber",
    sysAdminInitialState.minExecutorStake,
    types.json
  )
  .addOptionalParam(
    "executorsuccessshare",
    "BigNumber",
    sysAdminInitialState.executorSuccessShare,
    types.int
  )
  .addOptionalParam(
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

      const sysAdmin = getSysAdmin();

      await run("deploy", {
        contractname: "GelatoCore",
        constructorargs: [gelatoCoreConstructorArgs],
        signer: sysAdmin,
        log: taskArgs.log,
      });
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
