// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoActionsStandard } from "../gelato_actions/GelatoActionsStandard.sol";
import { GlobalState } from './GlobalState.sol';
import { SafeMath } from '../external/SafeMath.sol';

/// @notice Contract that sets Global State for individual providers
/// @dev will be called within Gelato Actions
contract ProviderStateSetter is GelatoActionsStandard {

    using SafeMath for uint256;

    uint256 public constant MAX_UINT = type(uint256).max;

    address public immutable myself;
    address public immutable provider;
    GlobalState public immutable globalState;

    constructor(GlobalState _globalFeeStorage) public {
        provider = msg.sender;
        globalState = _globalFeeStorage;
        myself = address(this);
    }

    /// @dev Only delegatecall into this func with the userProxy
    function updateUintStoreAndProvider(uint256 _newUint)
        external
    {
        require(address(this) != myself, "Only Delegatecall");
        globalState.updateUintStoreAndProvider(_newUint, provider);
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(uint256, address, bytes calldata _actionData, uint256)
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        (uint256 newUint) = abi.decode(_actionData[4:], (uint256));
        if(newUint >= 1000) return OK;
        else return "ProviderStateSetter: newUint needs to be greater than 1000";

    }

    // fallback() external {
    //     globalState.updateCurrentProvider(provider);
    // }

    // @DEV actually this can be called by the provider directly, because if another party select this provider in the global fee storage, he would make the provider money for free

    // function setActionFee(address _action, uint256 _feeNum, uint256 _feeDen)
    //     external
    // {
    //     require(msg.sender == provider, "ProviderStateSetter.setActionFee: Only provider");
    //     globalState.setActionFee(_action, _feeNum, _feeDen);
    // }

}