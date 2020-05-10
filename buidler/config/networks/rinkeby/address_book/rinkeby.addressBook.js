import { eoas } from "./rinkeby.eoas";
import { erc20s } from "./rinkeby.erc20s";
import { userProxies } from "./rinkeby.userProxies";

export const addressBook = {
  EOA: eoas,
  erc20: erc20s,
  gelatoExecutor: {
    // rinkeby
    default: "0x99E69499973484a96639f4Fb17893BC96000b3b8", // Hil Index 1
  },
  gnosisSafe: {
    mastercopy: "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F",
    gnosisSafeProxyFactory: "0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B",
    cpkFactory: "0x336c19296d3989e9e0c2561ef21c964068657c38",
    multiSend: "0x29CAa04Fa05A046a05C85A50e8f2af8cf9A05BaC",
  },
  kyber: {
    // rinkeby
    ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    proxy: "0xF77eC7Ed5f5B9a5aee4cfa6FFCaC6A4C315BaC76",
  },
  maker: {
    medianizer2: "0x7e8f5b24d89F8F32786d564a5bA76Eb806a74872",
  },
  gnosisProtocol: {
    batchExchange: "0xC576eA7bd102F7E476368a5E98FA455d1Ea34dE2",
  },
  uniswap: {
    uniswapFactoy: "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36",
    daiExchange: "0x77dB9C915809e7BE439D2AB21032B1b8B58F6891",
  },
  gelatoProvider: {
    default: "0x518eAa8f962246bCe2FA49329Fe998B66d67cbf8", // Hil Index 2
  },
  userProxy: userProxies,
};
