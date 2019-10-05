pragma solidity ^0.5.10;

import '../gelato_action_standards/GelatoActionsStandard.sol';
import '../../../gelato_dappInterfaces/gelato_DutchX/GelatoDutchXInterface.sol';

contract ActionWithdrawFromDutchXToBeneficiary is GelatoActionsStandard,
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
                                address indexed executionClaimOwner,
                                address sellToken,
                                address indexed buyToken,
                                address seller,
                                uint256 auctionIndex,
                                uint256 withdrawAmount
    );

    function withdrawFromDutchXToExecutionClaimOwner(
        // Standard Action Params
        uint256 _executionClaimId,  // via execute() calldata
        address _executionClaimOwner, // via actionPayload (default:0x)
        // Specific Action Params
        address _sellToken,
        address _buyToken,
        address _seller,
        uint256 _auctionIndex,
        uint256 _sellAmountAfterFee
    )
        public
        returns(bool)
    {
        // Standard action Setup
        address executionClaimOwner
            = GelatoActionsStandard._setup(_executionClaimOwner,
                                           _executionClaimId
        );

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
        ERC20(_buyToken).safeTransfer(executionClaimOwner, withdrawAmount);
        emit LogWithdrawFromDutchX(_executionClaimId,
                                   executionClaimOwner,
                                   _sellToken,
                                   _buyToken,
                                   _seller,
                                   _auctionIndex,
                                   withdrawAmount
        );
        emit LogAction(_executionClaimId, executionClaimOwner);
        return true;
    }
}

