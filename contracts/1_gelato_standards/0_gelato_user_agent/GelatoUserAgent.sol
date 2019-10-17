pragma solidity ^0.5.10;


/**
 * @title GelatoCoreLink
 */
contract GelatoCoreLink
{
    /**
     * @dev ancestor contract for GelatoUserWallet.sol
     */
    address internal gelatoCore;

    constructor()
        internal
    {
        gelatoCore = msg.sender;
    }

    /**
     * @dev checks if called by gelatoCore
     */
    function _msgSenderIsGelatoCore()
        internal
        view
        returns (bool)
    {
        if (msg.sender == gelatoCore) {
            return true;
        }
        return false;
    }

    /**
     * @dev Throws if not called by gelatoCore
     */
    modifier msgSenderIsGelatoCore {
        require(_msgSenderIsGelatoCore(), "GelatoUser.msgSenderIsUser");
        _;
    }

    ///@dev interface to gelatoCore state variable
    function getGelatoCore()
        external
        view
        returns(address)
    {
        return gelatoCore;
    }
}

/**
 * @title GelatoCore Interface
 */
interface GelatoCore {
    function setAgentUser(address currentUser, address nextUser) external;
}


/**
 * @title GelatoUser
 */
contract GelatoUser is GelatoCoreLink
{
    address internal user;

    constructor(address _user)
        GelatoCoreLink()
        internal
    {
        user = _user;
    }

    /**
     * @dev checks if called by user
     */
    function _msgSenderIsUser()
        internal
        view
        returns (bool)
    {
        if (msg.sender == user) {
            return true;
        }
        return false;
    }

    /**
     * @dev Throws if not called by user
     */
    modifier msgSenderIsUser {
        require(_msgSenderIsUser(), "GelatoUser.msgSenderIsUser");
        _;
    }

    event LogSetUser(address indexed user,
                     address indexed nextUser
    );

    /// @dev sets new GelatoUser
    function _setUser(address _nextUser)
        msgSenderIsUser
        internal
    {
        emit LogSetUser(user, _nextUser);
        GelatoCore(gelatoCore).setAgentUser(user, _nextUser);
        user = _nextUser;
    }


    /// @dev interface to _setUser function
    function setUser(address _nextUser)
        external
    {
        _setUser(_nextUser);
    }

    /// @dev interface to user state variable
    function getUser()
        external
        view
        returns(address)
    {
        return user;
    }
}


/**
 * @title GelatoUserAgent
 */
contract GelatoUserAgent is GelatoUser
{
    /**
     * @dev initial deployment to be done by GelatoCore as msg.sender
     */
    constructor(address _user)
        GelatoUser(_user)
        public
    {}

    /// @dev GelatoUserWallets cannot accept incoming ether transfers yet
    // function() external payable {}

    /**
     * @dev Throws if not called by user or gelatoCore
     */
    modifier msgSenderIsUserOrGelatoCore {
        require(_msgSenderIsGelatoCore() || _msgSenderIsUser(),
            "GelatoUser.msgSenderIsUserOrGelatoCore"
        );
        _;
    }

    event LogActionCall(bool success,
                        address action,
                        uint256 actionGasStipend,
                        bytes actionPayload,
                        bytes returndata
    );

    /**
     * @dev Execute authorised calls via delegate call
     * @param _action logic proxy address
     * @param _actionPayload delegate call data
     */
    function action(address _action,
                    uint256 _actionGasStipend,
                    bytes calldata _actionPayload
    )
        msgSenderIsUserOrGelatoCore
        external
        returns (bool success, bytes memory returndata)
    {
        ///@dev delegatecall action function with this contract's state
        (success,
         returndata) = _action.delegatecall.gas(_actionGasStipend)(_actionPayload);
        emit LogActionCall(success,
                           _action,
                           _actionGasStipend,
                           _actionPayload,
                           returndata
        );
    }

}