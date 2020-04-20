import { internalTask } from "@nomiclabs/buidler/config";
import { constants } from "ethers";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptEnterStableSwap",
  `Returns a hardcoded payload for EnterStableSwap`
)
  .addOptionalPositionalParam(
    "sellToken",
    "Token to sell on BatchExchange -default USDC",
    "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b"
  )
  .addOptionalPositionalParam(
    "buyToken",
    "Token to buy on BatchExchange -default DAI",
    "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea"
  )
  .addOptionalPositionalParam(
    "sellAmount",
    "Amount to sell -default 4 (4000000 USDC) (4)",
    "4000000"
  )
  .addOptionalPositionalParam(
    "buyAmount",
    "Amount to buy -default 3.8 (3800000000000000000 DAI (3.8))",
    "3800000000000000000"
  )
  .addOptionalParam(
    "orderExpirationBatchId",
    "will be +2 batches from current batch"
  )
  .addOptionalParam("gelatoprovider", "handleGelatoProvider default")
  .addOptionalParam("gelatoprovidermodule", "bre config")
  .addOptionalParam("gelatoexecutor", "handleGelatoExecutor default")
  .addOptionalVariadicPositionalParam("inputs")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      // @DEV Check EOA approval for Gnosis Safe
      taskArgs.log = true;

      const proxyAddress = await run("gc-determineCpkProxyAddress");

      const signers = await ethers.getSigners();
      const user = signers[0];
      const useraddress = await user.getAddress();

      if (!taskArgs.orderExpirationBatchId) {
        const currentBatchId = await run("invokeviewfunction", {
          contractname: "BatchExchange",
          functionname: "getCurrentBatchId",
          to: "0xC576eA7bd102F7E476368a5E98FA455d1Ea34dE2",
        });
        const currentBatchIdBN = ethers.utils.bigNumberify(currentBatchId);
        console.log(`Current Batch Id: ${currentBatchIdBN}`);

        // Withdraw in 2 batches
        taskArgs.orderExpirationBatchId = currentBatchIdBN.add(
          ethers.utils.bigNumberify("2")
        );
        console.log(
          `Action will withdraw in Batch Id: ${taskArgs.orderExpirationBatchId}`
        );
      }

      if (!taskArgs.gelatoprovider)
        taskArgs.gelatoprovider = await run("handleGelatoProvider", {
          gelatoprovider: taskArgs.gelatoprovider,
        });

      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor,
      });

      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionWithdrawBatchExchange",
      });

      if (!taskArgs.gelatoprovidermodule) {
        taskArgs.gelatoprovidermodule = await run("bre-config", {
          deployments: true,
          contractname: "ProviderModuleGnosisSafeProxy",
        });
      }

      const gelatoCoreAddress = await run("bre-config", {
        deployments: true,
        contractname: "GelatoCore",
      });

      /*
      address _user,
      address _sellToken,
      address _buyToken,
      uint128 _sellAmount,
      uint128 _buyAmount,
      uint32 _orderExpirationBatchId,
      // ChainedMintingParams
      ExecClaim memory _execClaim
      */

      if (!taskArgs.sellAmount) taskArgs.sellAmount = "4000000";
      if (!taskArgs.buyAmount) taskArgs.buyAmount = "3800000000000000000";
      if (!taskArgs.sellToken)
        taskArgs.sellToken = "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b";
      if (!taskArgs.buyToken)
        taskArgs.buyToken = "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea";

      // if (!taskArgs.sellAmount) taskArgs.sellAmount = "4000000000000000000"
      // if (!taskArgs.buyAmount) taskArgs.buyAmount = "3800000"
      // if (!taskArgs.sellToken) taskArgs.sellToken = "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea"
      // if (!taskArgs.buyToken) taskArgs.buyToken = "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b"

      const gelatoProvider = new GelatoProvider({
        addr: taskArgs.gelatoprovider,
        module: taskArgs.gelatoprovidermodule,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const actionWithdrawFromBatchExchangePayload = await run(
        "abi-encode-withselector",
        {
          contractname: "ActionWithdrawBatchExchange",
          functionname: "action",
          inputs: [
            useraddress,
            proxyAddress,
            taskArgs.sellToken,
            taskArgs.buyToken,
          ],
        }
      );

      const actionWithdrawFromBatchExchange = new Action({
        inst: actionAddress,
        data: actionWithdrawFromBatchExchangePayload,
        operation: 1,
        value: 0,
        termsOkCheck: true,
      });

      const taskWithdrawBatchExchange = {
        provider: gelatoProvider,
        condition: condition,
        actions: [actionWithdrawFromBatchExchange],
        expiryDate: constants.HashZero,
      };

      const inputs = [
        useraddress,
        taskArgs.sellToken,
        taskArgs.buyToken,
        ethers.utils.bigNumberify(taskArgs.sellAmount),
        ethers.utils.bigNumberify(taskArgs.buyAmount),
        taskArgs.orderExpirationBatchId,
        gelatoCoreAddress,
        // Task
        taskWithdrawBatchExchange,
      ];

      if (taskArgs.log) console.log(`User: ${useraddress}`);

      if (taskArgs.log) console.log(`Inputs: ${inputs}`);

      if (taskArgs.log) console.log("\nEnterStableSwap Inputs:\n", taskArgs);

      const payload = await run("abi-encode-withselector", {
        contractname: "ScriptEnterStableSwap",
        functionname: "enterStableSwap",
        inputs,
      });

      if (taskArgs.log) console.log("\nEnterStableSwap Payload:\n", payload);

      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
