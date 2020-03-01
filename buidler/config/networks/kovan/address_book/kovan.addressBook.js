import { eoas } from "./kovan.eoas";
import { erc20s } from "./kovan.erc20s";
import { gnosisSafe, gnosisSafeProxies } from "./kovan.gnosisSafe";

export const addressBook = {
  EOA: eoas,
  erc20: erc20s,
  executor: {
    // Kovan
    default: "0x4d671CD743027fB5Af1b2D2a3ccbafA97b5B1B80"
  },
  gnosisSafe: gnosisSafe,
  gnosisSafeProxy: gnosisSafeProxies,
  kyber: {
    // Kovan
    ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    proxy: "0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D"
  },
  provider: {
    default: "0x7015763d0a8F04263633106DE7a8F33B2334E51e" // luis DEV
  },
  userProxy: {
    // Kovan
    luis: "0xDBFd09475CDB2263193545743EE3930c9ce4BbbC"
  }
};
