import { eoas } from "./mainnet.eoas";
import { erc20s } from "./mainnet.erc20s";

export const addressBook = {
  EOA: eoas,
  erc20: erc20s,
  gelatoExecutor: {
    // Mainnet
    default: "0x4B7363b8a7DaB76ff73dFbA00801bdDcE699F3A2" // Luis Account2
  },
  kyber: {
    // Mainnet
    ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    proxy: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755"
  },
  userProxy: {
    // Mainnet
    luis: "0x1d3a74c02A6CEf185F9D6a6C1fbbf5D71813Edc6"
  },
  gnosisProtocol: {
    batchExchange: "0x6F400810b62df8E13fded51bE75fF5393eaa841F"
  },
  gelatoProvider: {
    default: "0x5B753BF02a42bC73B5846dfd16a8F2e082b99a6a" // Luis Account3
  }
};
