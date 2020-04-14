pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { Action, ExecClaim } from "./IGelatoCore.sol";

interface IGelatoProviderModule {
    function isProvided(ExecClaim calldata _ec)
        external
        view
        returns(string memory);

    function execPayload(Action[] calldata _actions) external pure returns(bytes memory);
}
