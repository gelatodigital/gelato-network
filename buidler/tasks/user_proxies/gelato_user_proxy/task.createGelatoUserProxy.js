import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gupf-creategelatouserproxy",
  `Sends tx to GelatoUserProxyFactory.create() or if --createtwo to .createTwo()  on [--network] (default: ${defaultNetwork})`
)
  .addFlag("createtwo", "Call ScriptsCreateGnosisSafeProxy.createTwo()")
  .addOptionalParam("saltnonce", "Supply for --createtwo", 42069, types.int)
  .addOptionalParam(
    "funding",
    "ETH value to be sent to newly created gelato user proxy",
    constants.HashZero,
    types.string
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (taskArgs.log) console.log("\nTaskArgs:\n", taskArgs, "\n");

      // GelatoCore interaction
      const gelatoUserProxyFactory = await run("instantiateContract", {
        contractname: "GelatoUserProxyFactory",
        write: true
      });

      let creationTx;
      if (taskArgs.createtwo) {
        try {
          creationTx = await gelatoUserProxyFactory.createTwo(
            taskArgs.saltnonce,
            { value: utils.parseEther(taskArgs.funding) }
          );
        } catch (error) {
          console.error("PRE creationTx submission error");
          process.exit(1);
        }
      } else {
        try {
          creationTx = await gelatoUserProxyFactory.create({
            value: utils.parseEther(taskArgs.funding)
          });
        } catch (error) {
          console.error("PRE creationTx submission error");
          process.exit(1);
        }
      }

      if (taskArgs.log)
        console.log(`\n Creation Tx Hash: ${creationTx.hash}\n`);

      let blockHash;
      try {
        const { blockHash: _blockHash } = await creationTx.wait();
        blockHash = _blockHash;
      } catch (error) {
        console.error(`\ncreationTx (${creationTx.hash}) REVERT\n`, error);
        process.exit(1);
      }

      // Event Emission verification
      if (taskArgs.log) {
        const parsedCreateLog = await run("event-getparsedlog", {
          contractname: "GelatoUserProxyFactory",
          eventname: "LogCreation",
          txhash: creationTx.hash,
          blockHash,
          values: true,
          stringify: true
        });
        if (parsedCreateLog) console.log("\n✅ LogCreation\n", parsedCreateLog);
        else console.log("\n❌ LogCreation not found");
      }

      return creationTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
