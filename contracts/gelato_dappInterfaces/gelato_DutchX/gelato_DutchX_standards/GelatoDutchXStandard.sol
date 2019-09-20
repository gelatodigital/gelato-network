pragma solidity ^0.5.10;

import '../gelato_DutchX_interfaces/IDutchX.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

contract GelatoDutchXStandard {
    using SafeERC20 for ERC20;

    IDutchX public dutchX;

    constructor(address _DutchX)
        internal
    {
        dutchX = IDutchX(_DutchX);
    }

    // ******************** SELL ********************
    event LogSellOnDutchX(uint256 indexed executionClaimId,
                          address indexed executionClaimOwner,
                          address indexed sellToken,
                          address buyToken,
                          address dutchXSeller,
                          uint256 sellAmount,
                          uint256 dutchXFee,
                          uint256 sellAmountAfterFee
    );

    function _getSellAmountAfterFee(address _seller, uint256 _sellAmount)
        internal
        returns(uint256 sellAmountAfterFee, uint256 dutchXFee)
    {
        (uint256 num, uint256 den) = dutchX.getFeeRatio(_seller);
        dutchXFee = _sellAmount.mul(num).div(den);
        sellAmountAfterFee = _sellAmount.sub(dutchXFee);
    }

    function _sellOnDutchX(uint256 _executionClaimId,
                           address _executionClaimOwner,
                           address _sellToken,
                           address _buyToken,
                           uint256 _sellAmount
    )
        internal
        returns(bool)
    {
        (uint256 sellAmountAfterFee,
         uint256 dutchXFee) = _getSellAmountAfterFee(address(this),
                                                     _sellAmount
        );
        require(ERC20(_sellToken).balanceOf(address(this)) >= _sellAmount,
            "GelatoDutchXStandard._sellOnDutchX: sellToken.balanceOf(addr(this)) failed"
        );
        require(ERC20(_sellToken).safeApprove(address(dutchX), _sellAmount),
            "GelatoDutchXStandard._sellOnDutchX: sellToken.approve failed"
        );
        dutchX.depositAndSell(_sellToken, _buyToken, _sellAmount);
        emit LogSellOnDutchX(_executionClaimId,
                             _executionClaimOwner,
                             _sellToken,
                             _buyToken,
                             address(this),
                             _sellAmount,
                             dutchXFee,
                             sellAmountAfterFee
        );
        return true;
    }
    // ******************** SELL END ********************


    // ******************** WITHDRAW ********************
    event LogDutchXClosingPrices(address indexed sellToken,
                                 address indexed buyToken,
                                 uint256 indexed auctionIndex,
                                 uint256 num,
                                 uint256 den
    );

    function _getWithdrawAmount(address _sellToken,
                                address _buyToken,
                                uint256 _auctionIndex,
                                uint256 _sellAmountAfterFee
    )
        internal
        returns(uint256 withdrawAmount)
    {
        (uint256 num,
         uint256 den) = dutchExchange.closingPrices(_sellToken,
                                                    _buyToken,
                                                    _auctionIndex
        );
        require(den != 0,
            "GelatoDutchX._getWithdrawAmount: den != 0, Last auction did not clear."
        );
        emit LogDutchXClosingPrices(_sellToken,
                                    _buyToken,
                                    _auctionIndex,
                                    num,
                                    den
        );
        withdrawAmount = _sellAmountAfterFee.mul(num).div(den);
    }

    function _withdrawFromDutchX(address _sellToken,
                                 address _buyToken,
                                 address _seller,
                                 uint256 _auctionIndex,
                                 uint256 _withdrawAmount
    )
        internal
        returns(bool)
    {
        dutchX.claimAndWithdraw(_sellToken,
                                _buyToken,
                                _seller,
                                _auctionIndex,
                                withdrawAmount
        );
        return true;
    }
    // ******************** WITHDRAW END ********************
}