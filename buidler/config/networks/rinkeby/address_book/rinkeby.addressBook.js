import { eoas } from "./rinkeby.eoas";
import { erc20s } from "./rinkeby.erc20s";
import { userProxies } from "./rinkeby.userProxies";

export const addressBook = {
  EOA: eoas,
  erc20: erc20s,
  gelatoExecutor: {
    // rinkeby
    default: "0x99E69499973484a96639f4Fb17893BC96000b3b8" // Hil Index 1
  },
  gnosisSafe: {
    mastercopy: "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F",
    gnosisSafeProxyFactory: "0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B"
  },
  kyber: {
    // rinkeby
    ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    proxy: "0x0"
  },
  gelatoProvider: {
    default: "0x518eAa8f962246bCe2FA49329Fe998B66d67cbf8" // Hil Index 2
  },
  userProxy: userProxies
};
