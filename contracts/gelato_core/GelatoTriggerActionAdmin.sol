pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";


/**
 * @title GelatoTriggerActionAdmin
 * @notice non-deploy base contract
 */
 contract GelatoTriggerActionAdmin is Initializable,
                                      Ownable
 {
    /// @dev non-deploy base contract
    constructor() internal {}

    address public constant GENESIS = address(0x1);
    address public constant HEAD = address(0x2);

    uint256 internal triggerCount;
    uint256 internal actionCount;
    mapping(address => address) internal triggerSinglyLinkedWhitelist;
    mapping(address => address) internal actionSinglyLinkedWhitelist;

    function _initialize()
        internal
        initializer
    {
        triggerSinglyLinkedWhitelist[HEAD] = GENESIS;
        actionSinglyLinkedWhitelist[HEAD] = GENESIS;
    }

    // ______ Trigger Whitelisting __________________________________________
    function _isWhitelistedTrigger(address _trigger)
        internal
        view
        returns(bool)
    {
        return triggerSinglyLinkedWhitelist[_trigger] != address(0);
    }

    function _whitelistTrigger(address _trigger)
        internal
        onlyOwner
    {
        require(_trigger != address(0) && _trigger != GENESIS && _trigger != HEAD,
            "GelatoTriggerActionAdmin._whitelistTrigger: invalid trigger"
        );
        require(!_isWhitelistedTrigger(),
            "GelatoTriggerActionAdmin._whitelistTrigger: trigger already whitelisted"
        );
        address previousRef = triggerSinglyLinkedWhitelist[HEAD];
        triggerSinglyLinkedWhitelist[_trigger] = previousRef;
        triggerSinglyLinkedWhitelist[HEAD] = _trigger;
        triggerCount++;
        emit LogWhitelistTrigger(_trigger, previousRef);
    }
    event LogWhitelistTrigger(address indexed trigger, address previousRef);

    function _blacklistTrigger(address _trigger)
        internal
        onlyOwner
    {

    }
    // ================

    // ______ Action Whitelisting __________________________________________
    function _isWhitelistedAction(address _action)
        internal
        view
        returns(bool)
    {
        return actionSinglyLinkedWhitelist[_action] != address(0);
    }

    function _whitelistAction(address _action)
        internal
        onlyOwner
    {
        require(_action != address(0) && _action != GENESIS && _action != HEAD,
            "GelatoTriggerActionAdmin._whitelistAction: invalid action"
        );
        require(!_isWhitelistedTrigger(),
            "GelatoTriggerActionAdmin._whitelistAction: action already whitelisted"
        );
        address previousRef = actionSinglyLinkedWhitelist[HEAD];
        actionSinglyLinkedWhitelist[_action] = previousRef;
        actionSinglyLinkedWhitelist[HEAD] = _action;
        actionCount++;
        emit LogWhitelistAction(_action, previousRef);
    }
    event LogWhitelistAction(address indexed _action, address previousRef);
    // ================

 }