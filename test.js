import dsl from "@nomiclabs/buidler";

dsl.task(
    "block-number",
    `Logs the current block number on [--network] (default: ${DEFAULT_NETWORK})`
  )
    .addFlag("log", "Logs return values to stdout")
    .setAction(async ({ log }, { ethers }) => {
      try {
        const blockNumber = await ethers.provider.getBlockNumber();
        if (log)
          console.log(
            `\n${ethers.provider._buidlerProvider._networkName}: ${blockNumber}\n`
          );
        return blockNumber;
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });