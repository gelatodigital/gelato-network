// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoActionsStandard } from "../gelato_actions/GelatoActionsStandard.sol";
import { GlobalState } from './GlobalState.sol';
import { SafeMath } from '../external/SafeMath.sol';

/// @notice Contract that sets Global State for individual providers
/// @dev will be called within Gelato Actions
contract ProviderFeeRelay is GelatoActionsStandard {

    using SafeMath for uint256;

    uint256 public constant MAX_UINT = type(uint256).max;

    address public immutable myself;
    address public immutable provider;
    GlobalState public immutable globalState;

    constructor(GlobalState _globalState, address _provider) public {
        provider = _provider;
        globalState = _globalState;
        myself = address(this);
    }

    /// @dev Only delegatecall into this func with the userproviderStateSetter
    function updateUintStoreAndProvider(uint256 _newUint)
        external
    {
        require(address(this) != myself, "Only Delegatecall");
        require(_newUint >= 1000, "newUint must be greater than 1000");
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
        else return "ProviderFeeRelay: newUint needs to be greater than 1000";

    }
}


contract ProviderFeeRelayFactory {

    event Created(address indexed sender, address indexed owner, address providerFeeRelay);

    GlobalState public immutable globalState;
    mapping( address => bool ) public isDeployed;
    mapping( address => address ) public feeRelays;

    constructor(GlobalState _globalState) public {
        globalState = _globalState;
    }

    // deploys a new providerFeeRelay instance
    // sets owner of providerFeeRelay to caller
    function create() public returns (address providerFeeRelay) {
        providerFeeRelay = create(msg.sender);
    }

    // deploys a new proxy instance
    // sets custom owner of proxy
    function create(address owner) public returns (address providerFeeRelay) {
        providerFeeRelay = address(new ProviderFeeRelay(globalState, owner));
        emit Created(msg.sender, owner, providerFeeRelay);
        isDeployed[owner] = true;
        feeRelays[owner] = providerFeeRelay;
    }
}