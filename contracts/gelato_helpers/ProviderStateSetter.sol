// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GlobalFeeStorage } from './GlobalFeeStorage.sol';

import { SafeMath } from '../external/SafeMath.sol';

/// @notice Contract that sets Global State for individual providers
/// @dev will be called within Gelato Actions
contract ProviderStateSetter {

    using SafeMath for uint256;

    uint256 public constant MAX_UINT = type(uint256).max;

    address public immutable myself;
    address public immutable provider;
    GlobalFeeStorage public immutable globalFeeStorage;

    constructor(GlobalFeeStorage _globalFeeStorage) public {
        provider = msg.sender;
        globalFeeStorage = _globalFeeStorage;
        myself = address(this);
    }

    /// @dev Only delegatecall into this func with the userProxy
    function updateUintStoreAndProvider(uint256 _newUint)
        external
    {
        // 1000 to avoid any reverts due to fee calculations
        require(_newUint >= 1000 && _newUint != MAX_UINT, "ProviderStateSetter.updateUintStoreAndProvider: Must avoid decimal underflow");
        require(address(this) != myself, "Only Delegatecall");
        globalFeeStorage.updateUintStoreAndProvider(_newUint, provider);
    }

    // fallback() external {
    //     globalFeeStorage.updateCurrentProvider(provider);
    // }

    function setActionFee(address _action, uint256 _feeNum, uint256 _feeDen)
        external
    {
        require(msg.sender == provider, "ProviderStateSetter.setActionFee: Only provider");
        globalFeeStorage.setActionFee(_action, _feeNum, _feeDen);
    }

}