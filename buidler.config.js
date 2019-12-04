// Local imports
const { Contract, getDefaultProvider, providers, utils } = require("ethers");

// ============ Buidler Runtime Environment (BRE) ==================================
// extendEnvironment(env => { env.x = x; })

// ============ Config =============================================================
// Env Variables
require("dotenv").config();
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;

module.exports = {
  defaultNetwork: "buidlerevm",
  networks: {
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_ID}`,
      chainId: 3,
      accounts: { mnemonic: DEV_MNEMONIC }
    }
  },
  solc: {
    version: "0.5.13",
    optimizer: { enabled: false }
  }
};

// ============ Plugins ============================================================
usePlugin("@nomiclabs/buidler-ethers");

// ============ Tasks ==============================================================
// task action function receives the Buidler Runtime Environment as second argument
task(
  "block-number",
  "Logs the current block number of connected network",
  async (_, { ethers }) => {
    try {
      const { name: networkName } = await ethers.provider.getNetwork();
      await ethers.provider.getBlockNumber().then(blockNumber => {
        console.log(
          `Current block number on ${networkName.toUpperCase()}: ${blockNumber}`
        );
      });
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "block-number-ropsten",
  "Logs the current block number of Ropsten Test Net",
  async () => {
    try {
      const provider = getDefaultProvider("ropsten");
      const { name: networkName } = await provider.getNetwork();
      await provider.getBlockNumber().then(blockNumber => {
        console.log(
          `\n\t\t Current block number on ${networkName.toUpperCase()}: ${blockNumber}`
        );
      });
    } catch (err) {
      console.error(err);
    }
  }
);

task("erc20-approve", "Approves <spender> for <erc20> <amount>")
  .addParam("erc20", "The erc20 contract address")
  .addParam("spender", "The spender's address")
  .addParam("amount", "The amount of erc20 tokens to approve")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const erc20Address = utils.getAddress(taskArgs.erc20);
      const spenderAddress = utils.getAddress(taskArgs.spender);
      const amount = utils.bigNumberify(taskArgs.amount);
      const [signer, signer2, ...rest] = await ethers.signers();
      console.log(await signer.getAddress());
      console.log(await signer2.getAddress());
      const ierc20ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)"
      ];
      /*const erc20Contract = await ethers.getContract(
        erc20Address,
        ierc20ABI,
        signer
      );*/
      const erc20Contract = new Contract(
        erc20Address,
        ierc20ABI,
        signer
      );
      const tx = await erc20Contract.approve(spenderAddress, amount);
      console.log(`\n\t\t erc20:approve txHash:\n\t ${tx.hash}`);
      const txReceipt = await tx.wait();
      console.log(`\t\t Tx mined: ${txReceipt.blockNumber !== undefined}`);
    } catch (error) {
      console.error(error);
    }
  });

task("erc20-allowance", "Logs <spender>'s <erc20> allowance from <owner>")
  .addParam("erc20", "The erc20 contract address")
  .addParam("owner", "The owners's address")
  .addParam("spender", "The spender's address")
  .setAction(async taskArgs => {
    try {
      const erc20Address = utils.getAddress(taskArgs.erc20);
      const ownerAddress = utils.getAddress(taskArgs.owner);
      const spenderAddress = utils.getAddress(taskArgs.spender);
      const provider = ethers.provider;
      const wallet = Wallet.fromMnemonic(DEV_MNEMONIC);
      const connectedWallet = wallet.connect(provider);
      const ierc20ABI = [
        "function allowance(address owner, address spender) external view returns (uint256)"
      ];
      const erc20Contract = new Contract(
        erc20Address,
        ierc20ABI,
        connectedWallet
      );
      const allowance = await erc20Contract.allowance(
        ownerAddress,
        spenderAddress
      );
      console.log(
        `\n\t\t erc20:allowance: ${utils.formatEther(allowance)} ETH`
      );
    } catch (error) {
      console.error(error);
    }
  });

task("eth-balance", "Prints an account's ether balance")
  .addParam("a", "The account's address")
  .setAction(async taskArgs => {
    try {
      const address = utils.getAddress(taskArgs.account);
      const provider = getDefaultProvider("ropsten");
      const balance = await provider.getBalance(address);
      console.log(`\n\t\t ${utils.formatEther(balance)} ETH`);
    } catch (error) {
      console.error(error);
    }
  });

task("eth-price", "Logs the etherscan ether-USD price", async () => {
  try {
    const etherscanProvider = new providers.EtherscanProvider();
    const { name: networkName } = await etherscanProvider.getNetwork();
    const ethUSDPrice = await etherscanProvider.getEtherPrice();
    console.log(`\n\t\t Ether price in USD (${networkName}): ${ethUSDPrice}`);
  } catch (err) {
    console.error(err);
  }
});

task(
  "network-current",
  "Logs the currently connected network",
  async (_, { ethers }) => {
    try {
      await ethers.provider.getNetwork().then(network => {
        console.log(
          `\n\t\t Currently connected to: ${network.name.toUpperCase()}`
        );
      });
    } catch (err) {
      console.error(err);
    }
  }
);
