// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoActionsStandard } from "../gelato_actions/GelatoActionsStandard.sol";
import { ProviderFeeStore } from "./ProviderFeeStore.sol";
import { SafeMath } from "../external/SafeMath.sol";

/// @notice Contract that sets ProviderFeeStore values for individual providers
/// @dev will be called within Gelato Actions
contract ProviderFeeRelay is GelatoActionsStandard {

    using SafeMath for uint256;

    uint256 public constant MAX_UINT = type(uint256).max;

    address public immutable provider;
    address public immutable providerRelay;
    ProviderFeeStore public immutable providerFeeStore;

    constructor(address _provider, ProviderFeeStore _providerFeeStore) public {
        provider = _provider;
        providerRelay = address(this);
        providerFeeStore = _providerFeeStore;
    }

    /// @dev Only delegatecall into this func with the userproviderStateSetter
    function updateAmountStoreAndProvider(uint256 _newAmount) external {
        require(
            address(this) != providerRelay,
            "ProviderFeeRelay.updateAmountStoreAndProvider: Only Delegatecall"
        );
        require(
            _newAmount >= 1000,
            "newAmount must be greater than 1000"
        );
        providerFeeStore.updateAmountStoreAndProvider(_newAmount, provider);
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
        uint256 newAmount = abi.decode(_actionData[4:], (uint256));
        if (newAmount >= 1000) return OK;
        else return "ProviderFeeRelay.termsOk: newAmount must be greater than 1000";
    }
}

contract ProviderFeeRelayFactory {
    event Created(
        address indexed sender,
        address indexed owner,
        ProviderFeeRelay indexed providerFeeRelay
    );

    ProviderFeeStore public immutable providerFeeStore;
    mapping(address => ProviderFeeRelay) public feeRelaysByProvider;

    constructor(ProviderFeeStore _providerFeeStore) public {
        providerFeeStore = _providerFeeStore;
    }

    // Deploys new ProviderFeeRelay and sets Provider to sender
    function create() public returns (ProviderFeeRelay) {
        return create(msg.sender);
    }

    // Deploys a new ProviderFeeRelay and sets custom Provider
    function create(address _provider) public returns (ProviderFeeRelay providerFeeRelay) {
        providerFeeRelay = new ProviderFeeRelay(_provider, providerFeeStore);
        feeRelaysByProvider[_provider] = providerFeeRelay;
        emit Created(msg.sender, _provider, providerFeeRelay);
    }
}