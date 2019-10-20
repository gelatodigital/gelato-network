pragma solidity ^0.5.10;

contract GelatoConstants {

    // ________ Gelato User Proxy Constants __________________________
    /// @notice Ropsten addresses
    address constant public constProxyRegistry
        = address(0x65503e9408baD6FB0B12144cBe5AF28a26169309);
    address constant public constGuardFactory
        = address(0xffaF24bf2F44689ea8Dd3AF35b32DD9cFF5cf0B6);

    /// @notice the fn signature to be permitted on userProxy's DSGuard
    bytes4 constant public constExecSelector
        = bytes4(keccak256("execute(address,bytes)"));
    // ==========

    // ________ Gelato Core Accounting Constants ______________________
    uint256 constant public constGasOutsideGasleftChecks = 40000 + 17331;
    uint256 constant public constGasInsideGasleftChecks = 100000 - constGasOutsideGasleftChecks;
    uint256 constant public constCanExecMaxGas =100000;
    // ==========

    // ________ Gelato Core Constants ______________________
    uint256 constant public constExecuteGas = 100000;
    // ==========
}