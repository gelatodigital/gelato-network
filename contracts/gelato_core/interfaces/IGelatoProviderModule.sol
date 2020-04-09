pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import {ExecClaim} from "./IGelatoCore.sol";

interface IGelatoProviderModule {
    function isProvided(ExecClaim calldata _ec)
        external
        view
        returns(string memory);

    function execPayload(address _action, bytes calldata _actionPayload)
        external
        pure
        returns(bytes memory);
}
