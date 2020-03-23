pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import {ExecClaim} from "../../interfaces/IGelatoCore.sol";

interface IGelatoProviderModule {
    function exec(
        address _userProxy,
        address _action,
        bytes calldata _actionPayload
    ) external;

    function isProvided(ExecClaim calldata _execClaim)
        external
        view
        returns (string memory);
}
