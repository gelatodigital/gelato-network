pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import {ExecClaim} from "./IGelatoCore.sol";

interface IGelatoProviderModule {
    function isProvided(ExecClaim calldata _ec)
        external
        view
        returns(string memory);

    function execPayload(address[] calldata _actions, bytes[] calldata _actionsPayload)
        external
        pure
        returns(bytes memory);
}
