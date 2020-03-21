const ethers = require("ethers");

require("dotenv").config();
const INFURA_ID = process.env.INFURA_ID;
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;

const provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
const signer = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const signerProvider = signer.connect(provider);

const abi = [
  "function getTriggerValue(address _account, address _token, uint256, bool) view returns(uint256)"
];

// A provided bad address that causes problems
const bug = signerProvider.address;

// A provided good address that behaves
const good = "0xe2A8950bC498e19457BE5bBe2C25bC1f535C743e";

// The trigger contract (although, the zero address would prolly make more
//  sense, for the sake of testing and using the existing contract, we use
// this trigger; for future reference, ethers.constants.AddressZero can be
// used)
const coin = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const c = new ethers.Contract(
  "0xaf4c11A90e98D0C5ecFb403C62Cc8Dfe8DF11030",
  abi,
  signerProvider
);

(async function() {
  let result;

  result = await c.getTriggerValue(good, coin, 0, 0);
  console.log("GOOD", result.toString(), ethers.utils.formatUnits(result, 18));

  result = await c.getTriggerValue(bug, coin, 0, 0);
  console.log("BUG", result.toString(), ethers.utils.formatUnits(result, 18));
})();
