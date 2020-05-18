import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gupf-creategelatouserproxy",
  `Sends tx to GelatoUserProxyFactory.create() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam(
    "funding",
    "ETH value to be sent to newly created gelato user proxy",
    constants.HashZero,
    types.string
  )
  .addOptionalParam("factoryaddress")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log)
        console.log("\n gupf-creategelatouserproxy:\n", taskArgs, "\n");

      // GelatoCore interaction
      const gelatoUserProxyFactory = await run("instantiateContract", {
        contractname: "GelatoUserProxyFactory",
        contractaddress: taskArgs.factoryaddress,
        write: true,
      });

      const optionalSubmitTasks = [];
      const optionalActions = [];

      let creationTx;
      try {
        creationTx = await gelatoUserProxyFactory.create({
          value: utils.parseEther(taskArgs.funding),
        });
      } catch (error) {
        throw new Error("\n PRE creationTx submission error", error, "\n");
      }

      if (taskArgs.log)
        console.log(`\n Creation Tx Hash: ${creationTx.hash}\n`);

      let blockhash;
      try {
        ({ blockHash: blockhash } = await creationTx.wait());
      } catch (error) {
        throw new Error(
          `\ncreationTx (${creationTx.hash}) REVERT\n`,
          error,
          "\n"
        );
      }

      // Event Emission verification
      const parsedCreateLog = await run("event-getparsedlog", {
        contractname: "GelatoUserProxyFactory",
        contractaddress: taskArgs.factoryaddress,
        eventname: "LogCreation",
        txhash: creationTx.hash,
        blockhash,
      });

      if (taskArgs.events) {
        if (parsedCreateLog) console.log("\n✅ LogCreation\n", parsedCreateLog);
        else console.log("\n❌ LogCreation not found");
      }

      if (!parsedCreateLog.values.userProxy) {
        throw new Error(
          `\n gupf-creategelatouserproxy: no userProxy retrieved \n`
        );
      }

      return parsedCreateLog.values.userProxy;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
