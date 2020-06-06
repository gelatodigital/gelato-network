// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import { IGelatoCore, Task} from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IScriptsCreateGnosisSafeProxyAndSubmit {
    function create(
        address _mastercopy,
        bytes calldata _initializer,
        IGelatoCore _gelatoCore,
        Task calldata _task,
        uint256 _expiryDate
    )
        external
        payable; // address userProxy

    function createTwo(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce,
        IGelatoCore _gelatoCore,
        Task calldata _task,
        uint256 _expiryDate
    )
        external
        payable;
}
