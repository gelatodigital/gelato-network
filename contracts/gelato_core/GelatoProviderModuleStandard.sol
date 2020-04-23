pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";
import { TaskReceipt } from "./interfaces/IGelatoCore.sol";

abstract contract GelatoProviderModuleStandard is IGelatoProviderModule {

    string internal constant OK = "OK";

    function isProvided(TaskReceipt calldata)
        external
        view
        override
        virtual
        returns(string memory)
    {
        return OK;
    }
}
