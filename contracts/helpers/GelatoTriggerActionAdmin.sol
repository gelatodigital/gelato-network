pragma solidity 0.6.0;

// import "@openzeppelin/contracts/ownership/Ownable.sol";

abstract contract GelatoTriggerActionAdmin/* is Ownable */ {
/*

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

    modifier validAddress(address _) {
        require(_ != address(0) && _ != GENESIS && _ != HEAD,
            "GelatoTriggerActionAdmin.validAddress: invalid"
        );
        _;
    }

    // ______ Trigger White\Black-listing __________________________________________
    function _isWhitelistedTrigger(address _trigger)
        internal
        view
        validAddress(_trigger)
        returns(bool)
    {
        return triggerSinglyLinkedWhitelist[_trigger] != address(0);
    }

    function _whitelistTrigger(address _trigger)
        internal
        validAddress(_trigger)
        onlyOwner
    {
        require(!_isWhitelistedTrigger(),
            "GelatoTriggerActionAdmin._whitelistTrigger: trigger already whitelisted"
        );
        address oneBeforeTrigger = triggerSinglyLinkedWhitelist[HEAD];
        triggerSinglyLinkedWhitelist[_trigger] = oneBeforeTrigger;
        triggerSinglyLinkedWhitelist[HEAD] = _trigger;
        triggerCount++;
        emit LogWhitelistTrigger(_trigger, oneBeforeTrigger);
    }
    event LogWhitelistTrigger(address indexed trigger, address indexed oneBeforeTrigger);

    function _whitelistTrigger(address[] memory _triggers)
        internal
        onlyOwner
    {

    }

    function _blacklistTrigger(address _trigger,
                               address _oneAfterTrigger
    )
        internal
        validAddress(_trigger)
        onlyOwner
    {
        require(_isWhitelistedTrigger(),
            "GelatoTriggerActionAdmin._blacklistTrigger: trigger not whitelisted"
        );
        require(triggerSinglyLinkedWhitelist[_oneAfterTrigger] == _trigger,
            "GelatoTriggerActionAdmin._blacklistTrigger: invalid _oneAfterTrigger"
        );
        address oneBeforeTrigger = triggerSinglyLinkedWhitelist[_trigger];
        triggerSinglyLinkedWhitelist[_oneAfterTrigger] = oneBeforeTrigger;
        triggerSinglyLinkedWhitelist[_trigger] = address(0);
        triggerCount--;
        emit LogBlacklistTrigger(_trigger, oneBeforeTrigger, _oneAfterTrigger);
    }
    event LogBlacklistTrigger(address indexed trigger,
                              address indexed oneBeforeTrigger,
                              address indexed oneAfterTrigger
    );
    // ================

    // ______ Action White\Black-listing __________________________________________
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

    function _blacklistAction(address _trigger,
                              address _oneAfterTrigger
    )
        internal
        validAddress(_trigger)
        onlyOwner
    {
        require(_isWhitelistedTrigger(),
            "GelatoTriggerActionAdmin._blacklistTrigger: trigger not whitelisted"
        );
        require(triggerSinglyLinkedWhitelist[_oneAfterTrigger] == _trigger,
            "GelatoTriggerActionAdmin._blacklistTrigger: invalid _oneAfterTrigger"
        );
        address oneBeforeTrigger = triggerSinglyLinkedWhitelist[_trigger];
        triggerSinglyLinkedWhitelist[_oneAfterTrigger] = oneBeforeTrigger;
        triggerSinglyLinkedWhitelist[_trigger] = address(0);
        emit LogBlacklistTrigger(_trigger, oneBeforeTrigger, _oneAfterTrigger);
    }
    event LogBlacklistTrigger(address indexed trigger,
                              address indexed oneBeforeTrigger,
                              address indexed oneAfterTrigger
    );
    // ================
*/
}