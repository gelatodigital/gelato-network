// Truffle Artifacts/contract interfaces
const Gelato = artifacts.require("Gelato");

module.exports = function() {
    async function watch() {
        const gelato = await Gelato.at(Gelato.address);

        var events = gelato.allEvents({fromBlock: 0, toBlock: 'latest'});
        events.watch(function(error, event) {
           try {
                console.log(event);
            } catch (error) {
                console.log(error);
            }
        });
    }

    watch();
}
