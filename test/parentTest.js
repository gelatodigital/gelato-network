const commandLine = require("./helpers/execShellCommand.js");
process.env.TEST="1"

describe("Test", () => {
    it("test1", async function () {
        this.timeout(30000)
        await commandLine.execShellCommand(`yarn setup`)
        console.log("#########################################")
    })
    it("test2", async function () {
        this.timeout(30000)
        await commandLine.execShellCommand(`yarn close1`)
        console.log("#########################################")
    })
    it("test3", async function () {
        this.timeout(30000)
        await commandLine.execShellCommand(`truffle test test/executeWithMockContractTest.js`)
        console.log("#########################################")
        process.env.TEST="2"
    })
    it("test4", async function () {
        this.timeout(30000)
        await commandLine.execShellCommand(`truffle test test/executeWithMockContractTest.js`)
        console.log("#########################################")
    })
     
})