pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../interfaces/IScriptsCreateGnosisSafeProxyAndMint.sol";
import "./ScriptsCreateGnosisSafeProxy.sol";
import { IGelatoCore, ExecClaim } from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract ScriptsCreateGnosisSafeProxyAndMint is
    IScriptsCreateGnosisSafeProxyAndMint,
    ScriptsCreateGnosisSafeProxy
{
    // ========= Proxy Creation and Minting in 1 tx
    function create(
        address _mastercopy,
        bytes memory _initializer,
        IGelatoCore _gelatoCore,
        ExecClaim memory _ec
    )
        public
        payable
        override
    {
        create(_mastercopy, _initializer);
        _gelatoCore.mintExecClaim(_ec.task);
    }

    function createTwo(
        address _mastercopy,
        bytes memory _initializer,
        uint256 _saltNonce,
        IGelatoCore _gelatoCore,
        ExecClaim memory _ec
    )
        public
        payable
        override
    {
        createTwo(_mastercopy, _initializer, _saltNonce);
        _gelatoCore.mintExecClaim(_ec.task);
    }
}