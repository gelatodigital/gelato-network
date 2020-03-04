import { eoas } from "./kovan.eoas";
import { erc20s } from "./kovan.erc20s";
import { userProxies } from "./kovan.userProxies";

export const addressBook = {
  EOA: eoas,
  erc20: erc20s,
  executor: {
    // Kovan
    default: "0x4d671CD743027fB5Af1b2D2a3ccbafA97b5B1B80" // Luis Dev-Account2
  },
  gnosisSafe: {
    mastercopy: "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F"
  },
  kyber: {
    // Kovan
    ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    proxy: "0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D"
  },
  provider: {
    default: "0x8d95104c9d834932B24799630013fA377b732141" // Luis Dev-Account3
  },
  userProxy: userProxies
};
