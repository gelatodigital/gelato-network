pragma solidity ^0.5.10;

import '../ActionDutchXSell.sol';
import '../../../GTA_standards/GTA_chained/GTAChainedMinting.sol';

contract ActionChainedDutchXSellMintWithdraw is ActionDutchXSell,
                                                GTAChainedMinting
{
    constructor(address payable _gelatoCore,
                address _dutchX,
                string memory _actionSignature,
                uint256 _actionGasStipend,
                address _mintingGTAI,
                address _chainedTrigger,
                address _chainedAction
    )
        public
        ActionDutchXSell(_gelatoCore,
                         _dutchX,
                         _actionSignature,
                         _actionGasStipend
        )
        GTAChainedMinting(_mintingGTAI,
                          _chainedTrigger,
                          _chainedAction
        )
    {}

    // Action:
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
        (bool success,
         uint256 sellAuctionIndex,
         uint256 sellAmountAfterFee) = super.action(_executionClaimId,
                                                    _executionClaimOwner,
                                                    _sellToken,
                                                    _buyToken,
                                                    _sellAmount
        );
        require(success,
            "ActionChainedDutchXSellMintWithdraw.super.action: failed"
        );
        // chained minting: mint withdrawal execution claims via gtai
        bytes memory chainedTriggerPayload = abi.encodeWithSelector(_getChainedTriggerSelector(),
                                                                    _sellToken,
                                                                    _buyToken,
                                                                    sellAuctionIndex
        );
        bytes memory chainedActionPayload = abi.encodeWithSelector(_getChainedActionSelector(),
                                                                   _executionClaimId,
                                                                   _executionClaimOwner,
                                                                   _beneficiary,
                                                                   _sellToken,
                                                                   _buyToken,
                                                                   address(this),  // seller
                                                                   sellAuctionIndex,
                                                                   sellAmountAfterFee
        );
        require(_activateChainedTAviaMintingGTAI(_executionClaimOwner,
                                                 chainedTriggerPayload,
                                                 chainedActionPayload),
            "ActionChainedDutchXSellMintWithdraw._mintExecutionClaim: failed"
        );
        emit LogGTAChainedMinting(_executionClaimId,
                                  _executionClaimOwner,
                                  address(this)
        );
        return true;
    }
}
