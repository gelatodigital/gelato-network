// 1. Write down the test scenario
// 2. List the order of calls we conduct within the execute function to the DutchX
// 3. Write down which values should be returned from each function call
// 4. Write a Mock dutchX contract which has the same function names specified in 2) which returns the values specified in 3)
// 5. Create a truffle test file which deploys a new instance of the gelatoDX interface with a new core and the mock contract instead of the dutchX
// 6. Create a bash script that endows the user before executing the new test file
// 7. Copy paste the tests which mint 3 execution claims
// 8. You maybe have to edit the min. 6 hour interval func in order to skip forward in time. Otherwise research how we can skip time in truffle. If that does not work, use execution times that lie within the past
// 9. Implement the test specified in 1.
// 10. Implement the test which should result in a revert, such as selling in an auction twice.

// 1. Execute() test scenario using Mock contract

/*
    TEST SCENARIO
    - User wants to sell 10 WETH on the DutchX twice, with an interval span of 6 hours. The execution time of the first tx is now.



*/
