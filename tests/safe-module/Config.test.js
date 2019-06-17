const conf = require('../../conf')

test('It should load the Safe\'s related addresses on the configuration', async () => {
  expect(conf.SAFE_ADDRESS).not.toBeNull()
  expect(conf.SAFE_ADDRESS).not.toBeUndefined()
  expect(conf.SAFE_MODULE_ADDRESS).not.toBeNull()
  expect(conf.SAFE_MODULE_ADDRESS).not.toBeUndefined()
})