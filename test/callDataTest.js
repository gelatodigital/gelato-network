const GelatoCore2 = artifacts.require("GelatoCore2");
const TestInterface = artifacts.require("TestInterface")

let core;
let testInterface;

describe("Testing call data functionality", () => {

    before("get them contracts", async() => {
        core = await GelatoCore2.deployed();
        testInterface = await TestInterface.deployed();
    })

    it("Create a claim", async() => {
        console.log("in test 1")
        let r1 = await testInterface.mintClaim()
        let r2 = await core.executionClaims(1);
        assert.exists(r1)
        assert.exists(r2)
    })

    it("Execute claim", async() => {
        let r3 = await core.execute(1)
        assert.exists(r3)
    })

    it("Check past events of Interface", async() => {
        let eventsResult;
        let r3 = await testInterface.getPastEvents("LogCall", (error, events) => {
            if (error) console.error;
            if (events) {
                eventsResult = events;
                console.log(`Event: ${events}`)
            }
        })
        assert.exists(eventsResult)
    })

    it("Check if value in interface has changed", async() => {
        let r4 = await testInterface.datas(1);
        console.log(r4.num.toString())
        console.log(r4.den.toString())
        assert.equal(r4.num.toString(), "1", "Must equal 1")
    })
})