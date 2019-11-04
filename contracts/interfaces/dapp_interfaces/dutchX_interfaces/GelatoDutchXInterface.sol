pragma solidity ^0.5.10;

import '../../../helpers/GelatoERC20Lib.sol';
import '@openzeppelin/contracts-ethereum-package/math/SafeMath.sol';
import './IDutchX.sol';

contract GelatoDutchXInterface
{
    using GelatoERC20Lib for IERC20;
    using SafeMath for uint256;

    IDutchX internal dutchX;

    uint8 internal constant AUCTION_START_WAITING_FOR_FUNDING = 1;

    function _initialize(address _dutchX)
        internal
    {
        dutchX = IDutchX(_dutchX);
    }

    function getDutchXAddress() external view returns(address) {return address(dutchX);}

    // ******************** SELL ********************
    function _getSellAmountAfterFee(address _seller,
                                    uint256 _sellAmount
    )
        internal
        view
        returns(uint256 sellAmountAfterFee, uint256 dutchXFee)
    {
        (uint256 num, uint256 den) = dutchX.getFeeRatio(_seller);
        dutchXFee = _sellAmount.mul(num).div(den);
        sellAmountAfterFee = _sellAmount.sub(dutchXFee);
    }

    function _getSellAuctionIndex(address _sellToken,
                                  address _buyToken
    )
        internal
        view
        returns(uint256 sellAuctionIndex)
    {
        uint256 currentAuctionIndex = dutchX.getAuctionIndex(_sellToken, _buyToken);
        uint256 auctionStartTime = dutchX.getAuctionStart(_sellToken, _buyToken);
        // Check if we are in a Waiting period or auction running period
        if (auctionStartTime > now || auctionStartTime == AUCTION_START_WAITING_FOR_FUNDING)
        {
            // Waiting Period: sellAmount will go into sellVolumesCurrent
            sellAuctionIndex = currentAuctionIndex;
        }
        else if (auctionStartTime < now) {
            // Auction ongoing: sellAmount will go into sellVolumesNext
            sellAuctionIndex = currentAuctionIndex.add(1);
        }
    }
    
    event LogSellOnDutchX(uint256 indexed executionClaimId,
                          address indexed user,
                          address indexed sellToken,
                          address buyToken,
                          address dutchXSeller,
                          uint256 sellAmount,
                          uint256 dutchXFee,
                          uint256 sellAmountAfterFee,
                          uint256 sellAuctionIndex
    );

    function _sellOnDutchX(uint256 _executionClaimId,
                           address _user,
                           address _sellToken,
                           address _buyToken,
                           uint256 _sellAmount
    )
        internal
        returns(bool, uint256, uint256)
    {
        (uint256 sellAmountAfterFee,
         uint256 dutchXFee) = _getSellAmountAfterFee(address(this),
                                                     _sellAmount
        );
        require(_safeTransferFrom(_sellToken,
                                  _user,
                                  address(this),
                                  _sellAmount),
            "GelatoDutchXInterface._sellOnDutchX: _safeTransferFrom failed"
        );
        require(_safeIncreaseERC20Allowance(_sellToken, address(dutchX), _sellAmount),
            "GelatoDutchXInterface._sellOnDutchX: _safeIncreaseERC20Allowance failed"
        );
        uint256 sellAuctionIndex = _getSellAuctionIndex(_sellToken, _buyToken);
        require(sellAuctionIndex != 0,
            "GelatoDutchXInterface._sellOnDutchX: nextParticipationIndex failed"
        );
        dutchX.depositAndSell(_sellToken, _buyToken, _sellAmount);
        emit LogSellOnDutchX(_executionClaimId,
                             _user,
                             _sellToken,
                             _buyToken,
                             address(this),
                             _sellAmount,
                             dutchXFee,
                             sellAmountAfterFee,
                             sellAuctionIndex
        );
        return (true, sellAuctionIndex, sellAmountAfterFee);
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
         uint256 den) = dutchX.closingPrices(_sellToken,
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
                                _withdrawAmount
        );
        return true;
    }
    // ******************** WITHDRAW END ********************
}