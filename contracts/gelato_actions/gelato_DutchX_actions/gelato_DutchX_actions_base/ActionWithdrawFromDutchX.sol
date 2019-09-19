pragma solidity ^0.5.10;

import '../../gelato_actions_base/GelatoActionsStandard.sol'
import './GelatoDutchXStandard.sol'

contract ActionWithdrawFromDutchX is GelatoActionsStandard, GelatoDutchXInterface {

    string constant public actionSignature
        = "withdrawFromDutchX(address, address, address, uint256, uint256, uint256)";

    constructor(address _GelatoCore,
                address _DutchX,
                uint256 _actionGas
    )
        public
        GelatoActionsStandard(_GelatoCore, actionSignature, _actionGas)
        GelatoDutchXStandard(_DutchX)
    {}

    function withdrawFromDutchX(address beneficiary,
                                address _sellToken,
                                address _buyToken,
                                uint256 _sellAmount,
                                uint256 _auctionIndex,
                                uint256 _withdrawAmount
    )
        external
    {
        super._action();
        require(_withdrawFromDutchX(
            _beneficiary, _sellToken, _buyToken, _auctionIndex, _withdrawAmount
            ), "ActionSellWithdrawDutchX._withdrawFromDutchX failed"
        );
    }
}

