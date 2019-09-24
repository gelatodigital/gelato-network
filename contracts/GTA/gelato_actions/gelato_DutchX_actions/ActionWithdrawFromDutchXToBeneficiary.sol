pragma solidity ^0.5.10;

import '../gelato_action_standards/GelatoActionsStandard.sol';
import '../../gelato_dappInterfaces/gelato_DutchX/gelato_DutchX_standards/GelatoDutchXStandard.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

contract ActionWithdrawFromDutchXToBeneficiary is GelatoActionsStandard,
                                                  GelatoDutchXStandard,
                                                  ReentrancyGuard
{
    constructor(address _gelatoCore,
                address _dutchX,
                string _actionSignature,
                uint256 _actionGasStipend
    )
        public
        GelatoActionsStandard(_gelatoCore,
                              _dutchX
                              _actionSignature,
                              _actionGasStipend
        )
        GelatoDutchXStandard(_dutchX)
    {}

    event LogWithdrawFromDutchX(uint256 indexed executionClaimId,
                                address executionClaimOwner,
                                address indexed beneficiary,
                                address sellToken,
                                address indexed buyToken,
                                address seller,
                                uint256 auctionIndex,
                                uint256 withdrawAmount
    );

    function withdrawFromDutchXToBeneficiary(uint256 _executionClaimId,
                                             address _executionClaimOwner,
                                             address _beneficiary,
                                             address _sellToken,
                                             address _buyToken,
                                             address _seller,
                                             uint256 _auctionIndex,
                                             uint256 _sellAmountAfterFee
    )
        nonReentrant
        public
        returns(bool)
    {
        _standardActionChecks();
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
            "ActionSellWithdrawDutchX._withdrawFromDutchX failed"
        );
        ERC20(_buyToken).safeTransfer(_beneficiary, withdrawAmount);
        emit LogWithdrawFromDutchX(_executionClaimId,
                                   _executionClaimOwner,
                                   _beneficiary,
                                   _sellToken,
                                   _buyToken,
                                   _seller,
                                   _auctionIndex,
                                   withdrawAmount,
        )
        return true;
    }
}

