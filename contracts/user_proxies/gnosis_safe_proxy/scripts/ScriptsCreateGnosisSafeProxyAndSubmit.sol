pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import "../interfaces/IScriptsCreateGnosisSafeProxyAndSubmit.sol";
import "./ScriptsCreateGnosisSafeProxy.sol";
import { IGelatoCore, TaskReceipt } from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract ScriptsCreateGnosisSafeProxyAndSubmit is
    IScriptsCreateGnosisSafeProxyAndSubmit,
    ScriptsCreateGnosisSafeProxy
{
    // ========= Proxy Creation and Submitting in 1 tx
    function create(
        address _mastercopy,
        bytes memory _initializer,
        IGelatoCore _gelatoCore,
        TaskReceipt memory _TR
    )
        public
        payable
        override
    {
        create(_mastercopy, _initializer);
        _gelatoCore.submitTask(_TR.task);
    }

    function createTwo(
        address _mastercopy,
        bytes memory _initializer,
        uint256 _saltNonce,
        IGelatoCore _gelatoCore,
        TaskReceipt memory _TR
    )
        public
        payable
        override
    {
        createTwo(_mastercopy, _initializer, _saltNonce);
        _gelatoCore.submitTask(_TR.task);
    }
}