const getEthereumClient = require('../../src/helpers/ethereumClient')
const getProvider = require('../../src/helpers/web3Providers')
const getWeb3 = require('../../src/helpers/web3')
const HDSafeWalletProvider = require('../../src/helpers/web3Providers/HDWalletSafeProvider')

test('It should instantiate the HDSafeWalletProvider', async () => {
  const ethereumClient = await getEthereumClient()
  const providerByClient = await ethereumClient.getWeb3().currentProvider
  expect(providerByClient).toBeInstanceOf(HDSafeWalletProvider)

  const providerByFactory = await getProvider()
  expect(providerByFactory).toBeInstanceOf(HDSafeWalletProvider)

  const web3 = await getWeb3()
  const providerByWeb3 = web3.currentProvider
  expect(providerByWeb3).toBeInstanceOf(HDSafeWalletProvider)
})