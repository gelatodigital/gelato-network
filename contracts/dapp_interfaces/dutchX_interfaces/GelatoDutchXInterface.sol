pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../../helpers/GelatoERC20Lib.sol";
import "./IDutchX.sol";

contract GelatoDutchXInterface is Initializable
{
    /// @dev non-deploy base contract
    constructor() internal {}

    using GelatoERC20Lib for IERC20;
    using SafeMath for uint256;

    IDutchX internal dutchX;

    uint8 internal constant AUCTION_START_WAITING_FOR_FUNDING = 1;

    function _initialize(address _dutchX)
        internal
        initializer
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
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        (uint256 num, uint256 den) = _dutchX.getFeeRatio(_seller);
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
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        uint256 currentAuctionIndex = _dutchX.getAuctionIndex(_sellToken, _buyToken);
        uint256 auctionStartTime = _dutchX.getAuctionStart(_sellToken, _buyToken);
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

    event LogSellOnDutchX(address indexed user,
                          address indexed dutchXSeller,
                          address indexed sellToken,
                          address buyToken,
                          uint256 sellAmount,
                          uint256 dutchXFee,
                          uint256 sellAmountAfterFee,
                          uint256 sellAuctionIndex
    );

    function _sellOnDutchX(address _user,
                           address _sellToken,
                           address _buyToken,
                           uint256 _sellAmount
    )
        internal
        returns(bool, uint256, uint256)
    {
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        (uint256 sellAmountAfterFee,
         uint256 dutchXFee) = _getSellAmountAfterFee(address(this), _sellAmount);
        {
            IERC20 sellToken = IERC20(_sellToken);
            require(sellToken._safeTransferFrom(_user, address(this), _sellAmount),
                "GelatoDutchXInterface._sellOnDutchX: _safeTransferFrom failed"
            );
            require(sellToken._safeIncreaseERC20Allowance(address(_dutchX), _sellAmount),
                "GelatoDutchXInterface._sellOnDutchX: _safeIncreaseERC20Allowance failed"
            );
        }
        uint256 sellAuctionIndex = _getSellAuctionIndex(_sellToken, _buyToken);
        require(sellAuctionIndex != 0,
            "GelatoDutchXInterface._sellOnDutchX: nextParticipationIndex failed"
        );
        _dutchX.depositAndSell(_sellToken, _buyToken, _sellAmount);
        emit LogSellOnDutchX(_user,
                             address(this),  // userProxy/dutchXSeller
                             _sellToken,
                             _buyToken,
                             _sellAmount,
                             dutchXFee,
                             sellAmountAfterFee,
                             sellAuctionIndex
        );
        return (true, sellAuctionIndex, sellAmountAfterFee);
    }
    // ******************** SELL END ********************


    // ******************** WITHDRAW ********************
    function _getSellerBalancesAtIndex(address _sellToken,
                                       address _buyToken,
                                       uint256 _auctionIndex,
                                       address _user
    )
        internal
        view
        returns(uint256 sellerBalances)
    {
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        sellerBalances
            = _dutchX.sellerBalances(_sellToken, _buyToken, _auctionIndex, _user);
    }

    function _claimSellerFundsAtIndex(address _sellToken,
                                      address _buyToken,
                                      address _user,
                                      uint256 _auctionIndex
    )
        internal
        returns(uint256)
    {
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        (uint256 claimedAmount,)
            = _dutchX.claimSellerFunds(_sellToken, _buyToken, _user, _auctionIndex);
        return claimedAmount;
    }

    function _getWithdrawAmount(address _sellToken,
                                address _buyToken,
                                uint256 _auctionIndex,
                                uint256 _sellerBalancesAtIndex
    )
        internal
        view
        returns(uint256 withdrawAmount)
    {
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        (uint256 num,
         uint256 den) = _dutchX.closingPrices(_sellToken, _buyToken, _auctionIndex);
        require(den != 0,
            "GelatoDutchX._getWithdrawAmount: Auction did not clear."
        );
        withdrawAmount = _sellerBalancesAtIndex.mul(num).div(den);
    }

    function _claimAndWithdrawFromDutchX(address _sellToken,
                                         address _buyToken,
                                         uint256 _auctionIndex,
                                         uint256 _withdrawAmount
    )
        internal
        returns(bool)
    {
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        _dutchX.claimAndWithdraw(_sellToken,
                                 _buyToken,
                                 address(this),  // seller==userProxy in delegatecall
                                 _auctionIndex,
                                 _withdrawAmount
        );
        return true;
    }

    function _getTokenBalanceOnDutchX(address _sellToken,
                                      address _user
    )
        internal
        view
        returns(uint256 tokenBalance)
    {
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        tokenBalance = _dutchX.balances(_sellToken, _user);
    }

    function _withdrawTokenFromDutchX(address _sellToken,
                                      uint256 _withdrawAmount
    )
        internal
        returns(bool)
    {
        // Rinkeby DutchX Proxy
        IDutchX _dutchX = IDutchX(0xaAEb2035FF394fdB2C879190f95e7676f1A9444B);
        _dutchX.withdraw(_sellToken, _withdrawAmount);
        return true;
    }
    // ******************** WITHDRAW END ********************
}