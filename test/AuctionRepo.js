const DutchExchange = artifacts.require('DutchExchange')

contract('DutchExchange', function (accounts) {
  // console.log(accounts)

  it('do lot of things...', function () {
    return DutchExchange.deployed().then(function (dx) {
      return dx.address
    }).then(function (address) {
      assert.equal(address, 'aaaa')
    })
  })

  it('should send coin correctly', function () {
    /*
    var meta

    // Get initial balances of first and second account.
    var account_one = accounts[0]
    var account_two = accounts[1]

    var account_one_starting_balance
    var account_two_starting_balance
    var account_one_ending_balance
    var account_two_ending_balance

    var amount = 10

    return DutchExchange.deployed().then(function (instance) {
      meta = instance
      return meta.getBalance.call(account_one)
    }).then(function (balance) {
      account_one_starting_balance = balance.toNumber()
      return meta.getBalance.call(account_two)
    }).then(function (balance) {
      account_two_starting_balance = balance.toNumber()
      return meta.sendCoin(account_two, amount, {from: account_one})
    }).then(function () {
      return meta.getBalance.call(account_one)
    }).then(function (balance) {
      account_one_ending_balance = balance.toNumber()
      return meta.getBalance.call(account_two)
    }).then(function (balance) {
      account_two_ending_balance = balance.toNumber()

      assert.equal(account_one_ending_balance, account_one_starting_balance - amount, "Amount wasn't correctly taken from the sender")
      assert.equal(account_two_ending_balance, account_two_starting_balance + amount, "Amount wasn't correctly sent to the receiver")
    })
    */
  })
})
