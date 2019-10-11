pragma solidity ^0.5.10;

import '../../../0_gelato_interfaces/1_GTA_interfaces/gelato_action_interfaces/IGelatoAction.sol';
import '../../../1_gelato_standards/2_GTA_standards/gelato_action_standards/GelatoActionsStandard.sol';
import '../../../1_gelato_standards/1_gelato_dappInterface_standards/gelato_DutchX/GelatoDutchXInterface.sol';

contract ActionWithdrawFromDutchXToBeneficiary is IGelatoAction,
                                                  GelatoActionsStandard,
                                                  GelatoDutchXInterface
{
    constructor(address payable _gelatoCore,
                address _dutchX,
                string memory _actionSignature,
                uint256 _actionGasStipend
    )
        public
        GelatoActionsStandard(_gelatoCore,
                              _dutchX,
                              _actionSignature,
                              _actionGasStipend
        )
        GelatoDutchXInterface(_dutchX)
    {}

    event LogWithdrawFromDutchX(uint256 indexed executionClaimId,
                                address indexed user,
                                address sellToken,
                                address indexed buyToken,
                                address seller,
                                uint256 auctionIndex,
                                uint256 withdrawAmount
    );

    // Action: public due to msg.sender context persistance, in internal calls (chaining)
    function withdrawFromDutchXToUser(
        // Standard Action Params
        uint256 _executionClaimId,
        // Specific Action Params
        address _sellToken,
        address _buyToken,
        address _seller,
        uint256 _auctionIndex,
        uint256 _sellAmountAfterFee
    )
        msgSenderIsGelatoCore
        public
        returns(bool)
    {
        address user =_getUser(_executionClaimId);
        uint256 withdrawAmount = _getWithdrawAmount(_sellToken,
                                                    _buyToken,
                                                    _auctionIndex,
                                                    _sellAmountAfterFee
        );
        require(_withdrawFromDutchX(_sellToken,
                                    _buyToken,
                                    _seller,
                                    _auctionIndex,
                                    withdrawAmount),
            "ActionSellWithdrawDutchX.action._withdrawFromDutchX failed"
        );
        ERC20(_buyToken).safeTransfer(user, withdrawAmount);
        emit LogWithdrawFromDutchX(_executionClaimId,
                                   user,
                                   _sellToken,
                                   _buyToken,
                                   _seller,
                                   _auctionIndex,
                                   withdrawAmount
        );
        emit LogAction(_executionClaimId, user);
        return true;
    }
}

