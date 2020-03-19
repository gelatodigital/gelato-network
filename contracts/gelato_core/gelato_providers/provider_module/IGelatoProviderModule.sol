pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { ExecClaim } from "../../interfaces/IGelatoCore.sol";

interface IGelatoProviderModule {
    function isProvided(address _executor, ExecClaim calldata _execClaim)
        external
        view
        returns (bool);
}
