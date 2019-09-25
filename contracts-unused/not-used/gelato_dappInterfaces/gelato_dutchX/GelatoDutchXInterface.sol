pragma solidity ^0.5.10;

import '../gelato_DutchX_base/GelatoDutchXStandard.sol';
import '@openzeppelin/contracts/drafts/Counters.sol';

contract GelatoDutchXInterface is GelatoDutchXStandard {
    using Counters for Counters.Counter;

    struct OrderState {
        bool lastAuctionWasWaiting;
        uint256 lastParticipatedAuctionIndex;
    }
    Counters.Counter public orderIds;
    // orderStateId => orderState
    mapping(uint256 => OrderState) public orderStates;



    constructor(address _DutchX)
        internal
    {
        dutchX = IDutchX(_DutchX);
    }


    function _sellOnDutchX(address _sellToken,
                           address _buyToken,
                           uint256 _sellAmount
    )
        internal
        returns(bool)
    {
        ERC20(_sellToken).approve(address(dutchX), _sellAmount);
        dutchX.depositAndSell(_sellToken, _buyToken, _sellAmount);
        return true;
    }

    function _withdrawFromDutchX(address _beneficiary,
                                 address _sellToken,
                                 address _buyToken,
                                 uint256 _auctionIndex,
                                 uint256 _withdrawAmount
    )
        internal
        returns(bool)
    {
        dutchX.claimAndWithdraw(_sellToken,
                                _buyToken,
                                address(this),
                                _auctionIndex,
                                _withdrawAmount
        );
        ERC20(_buyToken).safeTransfer(_beneficiary, _withdrawAmount);
        return true;
    }


    function _calcActualSellAmount(uint256 _subOrderSize)
        internal
        returns(uint256 actualSellAmount, uint256 dutchXFee)
    {
        // Get current fee ratio of Gelato contract
        uint256 num;
        uint256 den;
        // Returns e.g. num = 1, den = 500 for 0.2% fee
        (num, den) = dutchX.getFeeRatio(address(this));

        // Calc fee amount
        dutchXFee = _subOrderSize.mul(num).div(den);

        // Calc actual Sell Amount
        actualSellAmount = _subOrderSize.sub(dutchXFee);
    }
}