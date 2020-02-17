import { task } from "@nomiclabs/buidler/config";

export default task(
  "bre",
  "Return (or --log) the current Buidler Runtime Environment"
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }, bre) => {
    try {
      if (log) console.dir(bre);
      return bre;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
