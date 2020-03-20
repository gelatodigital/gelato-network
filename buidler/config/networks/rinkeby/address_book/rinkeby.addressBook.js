import { eoas } from "./rinkeby.eoas";
import { erc20s } from "./rinkeby.erc20s";
import { userProxies } from "./rinkeby.userProxies";

export const addressBook = {
  EOA: eoas,
  erc20: erc20s,
  gelatoExecutor: {
    // rinkeby
    default: "0x0" // Luis Dev-Account2
  },
  gnosisSafe: {
    mastercopy: "0x0",
    gnosisSafeProxyFactory: "0x0"
  },
  kyber: {
    // rinkeby
    ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    proxy: "0x0"
  },
  gelatoProvider: {
    default: "0x0" // Luis Dev-Account3
  },
  userProxy: userProxies
};
