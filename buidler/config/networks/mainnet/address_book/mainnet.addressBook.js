import { eoas } from "./mainnet.eoas";
import { erc20s } from "./mainnet.erc20s";

export const addressBook = {
  // EOA
  EOA: eoas,

  // ERC20
  erc20: erc20s,

  // Gelato
  gelatoExecutor: {
    // Mainnet
    default: "0xd70d5fb9582cc3b5b79bbfaecbb7310fd0e3b582",
  },
  gelatoGasPriceOracle: {
    // Mainnet
    chainlink: "0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C",
  },
  gelatoProvider: {
    default: "0x5B753BF02a42bC73B5846dfd16a8F2e082b99a6a",
  },

  // Gnosis
  gnosisProtocol: {
    batchExchange: "0x6F400810b62df8E13fded51bE75fF5393eaa841F",
  },
  gnosisSafe: {
    mastercopyOneOneOne: "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F",
    mastercopyOneTwoZero: "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F",
    gnosisSafeProxyFactory: "0x0",
    cpkFactory: "0x0fB4340432e56c014fa96286de17222822a9281b",
    multiSend: "0xB522a9f781924eD250A11C54105E51840B138AdD",
  },

  // Kyber
  kyber: {
    // Mainnet
    ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    proxy: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755",
  },

  // Maker
  maker: {
    medianizer2: "0x729D19f657BD0614b4985Cf1D82531c67569197B",
    dsProxyFactory: "0xA26e15C895EFc0616177B7c1e7270A4C7D51C997",
    dsProxyRegistry: "0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4",
  },

  // Uniswap
  uniswap: {
    uniswapFactory: "0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95",
  },

  // Uniswap v2
  uniswapV2: {
    router2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  },

  // User Proxies
  userProxy: {
    // Mainnet
    luis: "0x1d3a74c02A6CEf185F9D6a6C1fbbf5D71813Edc6",
  },
};
