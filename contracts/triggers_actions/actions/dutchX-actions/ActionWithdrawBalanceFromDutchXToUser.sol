pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import '../GelatoActionsStandard.sol';
import './GelatoDutchXInterface.sol';


/// @notice This action withdraws all of user's sellerBalances at auctionIndex.
/// @dev Caution: claimAndWithdraw only works 1 time per user per auctionIndex.
//      for multiple withdraws for 1 user from same auctionIndex use 1 time claim()
//      or claimAndWithdraw(), and  all other times ONLY withdraw()
contract ActionWithdrawBalanceFromDutchXToUser is Initializable,
                                                   GelatoActionsStandard,
                                                   GelatoDutchXInterface
{
    using SafeERC20 for IERC20;

    /**
     * @dev OpenZeppelin's upgradeable contracts constructor function. Should be
       called immediately after deployment and only once in a proxyWrapper's lifetime.
       Calls are forwarded to the internal _initialize fn to allow for external-internal
       distinction and inheritance.
     * @param _actionGasStipend the maxGas consumption of a normal tx to this.action()
     * @param _dutchX the address of the deployed dutchX Proxy
     */
    function initialize(uint256 _actionGasStipend, address _dutchX)
        external
    {
        _initialize(_actionGasStipend, _dutchX);
    }
    function _initialize(uint256 _actionGasStipend, address _dutchX)
        internal
        initializer
    {
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
        GelatoDutchXInterface._initialize(_dutchX);
    }

    // Action: public due to msg.sender context persistance, in internal calls (chaining)
    function _action(// Standard Action Params
                     address _user,
                     // Specific Action Params
                     address _token
    )
        internal
        returns(bool)
    {
        uint256 tokenBalance = _getTokenBalanceOnDutchX(_token, address(this));
        require(tokenBalance != 0,
            "ActionSellWithdrawDutchX.action: no tokenBalance on DutchX"
        );
        require(_withdrawTokenFromDutchX(_token, tokenBalance),
            "ActionSellWithdrawDutchX.action._withdrawTokenFromDutchX failed"
        );
        IERC20(_token).safeTransfer(_user, tokenBalance);
        emit LogWithdrawFromDutchXToUser(_user,  _token, tokenBalance);
        emit LogAction(_user);
        return true;
    }

    function action(// Standard Action Params
                    address _user,
                    // Specific Action Params
                    address _token
    )
        external
        returns(bool)
    {
        return _action(_user, _token);
    }

    event LogWithdrawFromDutchXToUser(address indexed user,
                                      address indexed token,
                                      uint256 withdrawAmount
    );
}
