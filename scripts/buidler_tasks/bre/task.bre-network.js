import { task } from "@nomiclabs/buidler/config";

export default task("bre-network", `Return (or --log) BRE.network properties`)
  .addFlag("c", "Return the BRE network config")
  .addFlag("log", "Logs return values to stdout")
  .addFlag("name", "Return the currently connected BRE network name")
  .addFlag("provider", "Return the currently connected BRE network provider")
  .setAction(async ({ c: config, log, name, provider }) => {
    try {
      const optionalReturnValues = [];

      if (config) optionalReturnValues.push(network.config);

      if (name) optionalReturnValues.push(network.name);

      if (provider) optionalReturnValues.push(network.provider);

      if (optionalReturnValues.length == 0) {
        if (log) console.log(network);
        return network;
      } else if (optionalReturnValues.length == 1) {
        if (log) console.log(optionalReturnValues[0]);
        return optionalReturnValues[0];
      }
      if (log) console.log(optionalReturnValues);
      return optionalReturnValues;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
