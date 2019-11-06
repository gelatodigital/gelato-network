pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import '../GelatoActionsStandard.sol';
import './GelatoDutchXInterface.sol';

contract ActionWithdrawFromDutchXToUser is Initializable,
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
                     address _sellToken,
                     address _buyToken,
                     uint256 _auctionIndex,
                     uint256 _sellAmountAfterFee
    )
        internal
        returns(bool)
    {
        uint256 withdrawAmount = _getWithdrawAmount(_sellToken,
                                                    _buyToken,
                                                    _auctionIndex,
                                                    _sellAmountAfterFee
        );
        require(_withdrawFromDutchX(_sellToken, _buyToken, _auctionIndex, withdrawAmount),
            "ActionSellWithdrawDutchX.action._withdrawFromDutchX failed"
        );
        IERC20(_buyToken).safeTransfer(_user, withdrawAmount);
        emit LogWithdrawFromDutchX(_user,
                                   _sellToken,
                                   _buyToken,
                                   _auctionIndex,
                                   withdrawAmount
        );
        emit LogAction(_user);
        return true;
    }

    function action(// Standard Action Params
                    address _user,
                    // Specific Action Params
                    address _sellToken,
                    address _buyToken,
                    uint256 _auctionIndex,
                    uint256 _sellAmountAfterFee
    )
        external
        returns(bool)
    {
        return _action(_user, _sellToken, _buyToken, _auctionIndex, _sellAmountAfterFee);
    }

    event LogWithdrawFromDutchX(address indexed user,
                                address indexed sellToken,
                                address indexed buyToken,
                                uint256 auctionIndex,
                                uint256 withdrawAmount
    );
}
