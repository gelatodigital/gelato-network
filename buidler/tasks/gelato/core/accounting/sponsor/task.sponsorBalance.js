import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-executorbalance",
  `Return (or --log) GelatoCore.sponsorBalance([<sponsor>: defaults to default sponsor]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalPositionalParam(
    "sponsor",
    "The address of the sponsor, whose balance we query"
  )
  .setAction(async ({ sponsor, log }) => {
    try {
      if (!sponsor) {
        sponsor = await run("bre-config", {
          addressbookcategory: "sponsor",
          addressbookentry: "default"
        });
      }

      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      const sponsorBalance = await gelatoCoreContract.sponsorBalance(sponsor);
      const sponsorBalanceETH = utils.formatEther(sponsorBalance);

      if (log) {
        console.log(
          `\n Sponsor:        ${sponsor}\
           \n SponsorBalance: ${sponsorBalanceETH} ETH\
           \n Network:        ${network.name}\n`
        );
      }
      return sponsorBalance;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
