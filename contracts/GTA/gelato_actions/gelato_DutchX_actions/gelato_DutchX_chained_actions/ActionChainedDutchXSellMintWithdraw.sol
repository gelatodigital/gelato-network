pragma solidity ^0.5.10;

import './ActionDutchXSell.sol';
import '../../GTA_standards/GTA_chained/GTAChainedMinting.sol';

contract ActionChainedDutchXSellMintWithdraw is ActionDutchXSell,
                                                GTAChainedMinting
{
    constructor(address _gelatoCore,
                address _dutchX,
                string _actionSignature,
                uint256 _actionGasStipend,
                address _chainedMintingGTAI,
                address _chainedTrigger,
                bytes4 _chainedTriggerSelector,
                address _chainedAction,
                bytes4 _chainedActionSelector
    )
        public
        ActionDutchXSell(_gelatoCore,
                         _dutchX,
                         _actionSignature,
                         _actionGasStipend
        )
        GTAChainedMinting(_chainedMintingGTAI,
                          _chainedTrigger,
                          _chainedTriggerSelector,
                          _chainedAction,
                          _chainedActionSelector
        )
    {}

    // Action:
    event LogChainedDutchXSellMintWithdraw(uint256 indexed executionClaimId,
                                           address indexed executionClaimOwner
    );
    function action(uint256 _executionClaimId,
                    address _executionClaimOwner,
                    address _beneficiary,
                    address _sellToken,
                    address _buyToken,
                    uint256 _sellAmount
    )
        public
        returns(bool)
    {
        // action: perform checks and sell on dutchX
        (success,
         sellAuctionIndex,
         sellAmountAfterFee) = super.action(_executionClaimId,
                                            _executionClaimOwner,
                                            _sellToken,
                                            _buyToken,
                                            _sellAmount
        );
        require(success,
            "ActionChainedDutchXSellMintWithdraw.super.action: failed"
        );
        // chained minting: mint withdrawal execution claims via gtai
        bytes chainedTriggerPayload = abi.encodeWithSelector(chainedTAData.triggerSelector,
                                                             _sellToken,
                                                             _buyToken,
                                                             sellAuctionIndex
        );
        bytes chainedActionPayload = abi.encodeWithSelector(chainedTAData.actionSelector,
                                                            _executionClaimId,
                                                            _executionClaimOwner,
                                                            _beneficiary,
                                                            _sellToken,
                                                            _buyToken,
                                                            address(this),  // seller
                                                            sellAuctionIndex,
                                                            sellAmountAfterFee
        );
        require(_mintExecutionClaim(_executionClaimOwner,
                                    chainedTriggerPayload,
                                    chainedActionPayload),
            "ActionChainedDutchXSellMintWithdraw._mintExecutionClaim: failed"
        );
        emit LogChainedDutchXSellMintWithdraw(_executionClaimId, _executionClaimOwner);
        return true;
    }
}
