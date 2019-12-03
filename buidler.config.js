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
