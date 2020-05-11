pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "./IGelatoProviderModule.sol";
import { Task } from "../gelato_core/interfaces/IGelatoCore.sol";

abstract contract GelatoProviderModuleStandard is IGelatoProviderModule {

    string internal constant OK = "OK";

    function isProvided(address, Task calldata)
        external
        view
        override
        virtual
        returns(string memory)
    {
        return OK;
    }

    function execRevertCheck(bytes calldata)
        external
        view
        override
        virtual
        returns(bool reverted)
    {
        reverted = false;
    }
}