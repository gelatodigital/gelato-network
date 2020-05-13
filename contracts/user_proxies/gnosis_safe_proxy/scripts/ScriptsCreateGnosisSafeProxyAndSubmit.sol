pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import "../interfaces/IScriptsCreateGnosisSafeProxyAndSubmit.sol";
import "./ScriptsCreateGnosisSafeProxy.sol";
import { IGelatoCore, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract ScriptsCreateGnosisSafeProxyAndSubmit is
    IScriptsCreateGnosisSafeProxyAndSubmit,
    ScriptsCreateGnosisSafeProxy
{
    // ========= Proxy Creation and Submitting in 1 tx
    function create(
        address _mastercopy,
        bytes calldata _initializer,
        IGelatoCore _gelatoCore,
        Task[] calldata _taskSequence,
        uint256 _expiryDate,
        uint256 _countdown
    )
        external
        payable
        override
    {
        create(_mastercopy, _initializer);
        _gelatoCore.submitTask(_taskSequence, _countdown, _expiryDate);
    }

    function createTwo(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce,
        IGelatoCore _gelatoCore,
        Task[] calldata _taskSequence,
        uint256 _expiryDate,
        uint256 _countdown
    )
        external
        payable
        override
    {
        createTwo(_mastercopy, _initializer, _saltNonce);
        _gelatoCore.submitTask(_taskSequence, _countdown, _expiryDate);
    }
}