pragma solidity ^0.5.10;

import './ActionDutchXSell.sol';

contract ActionDutchXSellMintWithdraw is ActionDutchXSell {

    constructor(address _gelatoCore,
                address _dutchX,
                string _actionSignature,
                uint256 _actionGasStipend
    )
        public
        ActionDutchXSell(_gelatoCore,
                         _dutchX,
                         _actionSignature,
                         _actionGasStipend
        )
    {}

    // Action:
    function action(uint256 _executionClaimId,
                    address _executionClaimOwner,
                    address _sellToken,
                    address _buyToken,
                    uint256 _sellAmount,
                    address _withdrawTriggerAddress,
                    bytes4  _withdrawTriggerSelector,
                    address _withdrawActionAddress,
                    address _withdrawActionSelector,
                    uint256 _withdrawActionGasStipend
    )
        public
        returns(bool)
    {
        super.action();
        require(_buyToken != address(0),
            "ActionDutchXSellMint.sellOnDutchX: _buyToken zero-value"
        );
        require(_sellOnDutchX(_executionClaimId,
                              _executionClaimOwner,
                              _sellToken,
                              _buyToken,
                              _sellAmount),
            "ActionSellOnDutchX._sellOnDutchX failed"
        );
        return true;
    }
}
