pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoCore, TaskReceipt } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IScriptsCreateGnosisSafeProxyAndSubmit {
    function create(
        address _mastercopy,
        bytes calldata _initializer,
        IGelatoCore _gelatoCore,
        TaskReceipt calldata _TR,
        uint256 _expiryDate,
        uint256 _rounds
    ) external payable; // address userProxy

    function createTwo(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce,
        IGelatoCore _gelatoCore,
        TaskReceipt calldata _TR,
        uint256 _expiryDate,
        uint256 _rounds
    ) external payable;
}
