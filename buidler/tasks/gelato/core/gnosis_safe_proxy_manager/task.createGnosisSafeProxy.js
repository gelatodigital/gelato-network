import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-creategnosissafeproxy",
  `Sends tx to GelatoCore.createGnosisSafeProxy() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalVariadicPositionalParam(
    "initializerargs",
    "args to be encoded into the initializer data"
  )
  .addOptionalParam(
    "mastercopy",
    "The deployed implementation code the created proxy should point to"
  )
  .addOptionalParam("initializer", "payload for gnosis safe proxy setup tasks")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ mastercopy, initializerargs, initializer, log }) => {
    try {
      if (!mastercopy) {
        mastercopy = await run("bre-config", {
          addressbookcategory: "gnosisSafe",
          addressbookentry: "mastercopy"
        });
      }

      if (!mastercopy) throw new Error("No mastercopy for proxy defined");

      if (log) console.log(`\n Mastercopy: ${mastercopy}\n`);

      if (!initializerargs && !initializer)
        throw new Error("Must provide initializer args or initializer payload");

      if (!initializer) {
        if (!Array.isArray(initializerargs[0])) {
          const tmp = initializerargs[0];
          initializerargs[0] = [tmp];
        }
        if (!Array.isArray(initializerargs[0]))
          throw new Error("Failed to convert initializerargs[0] into an Array");

        for (const index in initializerargs) {
          if (initializerargs[index] === "addresszero")
            initializerargs[index] = constants.AddressZero;
        }

        if (log) {
          console.log(`Initilizer Arguments:`);
          for (const arg of initializerargs) console.log(typeof arg, arg);
        }

        initializer = await run("abi-encode-withselector", {
          contractname: "IGnosisSafe",
          functionname: "setup",
          inputs: initializerargs
        });
      }

      if (log) console.log(`\nInitializer payload ${initializer}\n`);

      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      const creationTx = await gelatoCoreContract.createGnosisSafeProxy(
        mastercopy,
        initializer
      );

      if (log) console.log(`\n\ntxHash createUserProxy: ${creationTx.hash}`);

      const { blockHash } = await creationTx.wait();

      if (log) {
        const parsedLog = await run("event-getparsedlogs", {
          contractname: "GelatoCore",
          eventname: "LogGnosisSafeProxyUserCreation",
          txhash: creationTx.hash,
          blockHash,
          values: true
        });
        const { user, gnosisSafeProxy } = parsedLog[0];
        console.log(
          `\nLogGnosisSafeProxyCreation\nuser: ${user}\ngnosisSafeProxy: ${gnosisSafeProxy}\n`
        );
      }

      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
