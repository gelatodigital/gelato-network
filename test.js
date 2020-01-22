const { ethers } = require("ethers");

const provider = ethers.getDefaultProvider("ropsten");

const abi = [ "function getTriggerValue(address _account, address _coin, uint256, bool) view returns(uint256)" ]

// A provided bad address that causes problems
const bad = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72"

// A provided good address that behaves
const good = "0xe2A8950bC498e19457BE5bBe2C25bC1f535C743e"

// The trigger contract (although, the zero address would prolly make more
//  sense, for the sake of testing and using the existing contract, we use
// this trigger; for future reference, ethers.constants.AddressZero can be
// used)
const trigger = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

const c = new ethers.Contract("0xaFa77E70C22F5Ab583A9Eae6Dc7290e6264832Af", abi, provider);

(async function() {
    let result;

    result = await c.getTriggerValue(good, trigger, 0, 0)
    console.log("GOOD", result.toString(), ethers.utils.formatUnits(result, 18));

    result = await c.getTriggerValue(bad, trigger, 0, 0)
    console.log("BAD", result.toString(), ethers.utils.formatUnits(result, 18));
})();