// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../GelatoConditionsStandard.sol";
import {IERC20} from "../../external/IERC20.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {ILendingPoolCore} from "../../dapp_interfaces/aave/ILendingPoolCore.sol";
import {ILendingPoolAddressesProvider} from "../../dapp_interfaces/aave/ILendingPoolAddressesProvider.sol";
import {ICToken} from "../../dapp_interfaces/compound/ICToken.sol";

contract ConditionCompareCompoundAaveLending is  GelatoConditionsStandard {

    using SafeMath for uint256;

    ILendingPoolAddressesProvider
        internal constant lendingPoolAddressesProvider = ILendingPoolAddressesProvider(
        0x24a42fD28C976A61Df5D00D0599C34c4f90748c8
    );

    /// @notice Helper to encode the Condition data field off-chain
    function getConditionData(
        ICToken _compoundToken,
        address _underlyingAsset,
        uint256 _minSpread,
        bool _tokenInCompound
    ) public pure returns (bytes memory) {
        return
            abi.encode(
                _compoundToken,
                _underlyingAsset,
                _minSpread,
                _tokenInCompound
            );
    }

    /// @notice Gelato Standard Condition function.
    /// @dev Every Gelato Condition must have this function selector as entry point.
    /// @param _conditionData The encoded data from getConditionData()
    function ok(
        uint256,
        bytes memory _conditionData,
        uint256
    ) public view virtual override returns (string memory) {
        (
            ICToken _compoundToken,
            address _underlyingAsset,
            uint256 _minSpread,
            bool _tokenInCompound
        ) = abi.decode(_conditionData, (ICToken, address, uint256, bool));
        return
            compareLendingRate(
                _compoundToken,
                _underlyingAsset,
                _minSpread,
                _tokenInCompound
            );
    }

    /**
     * @dev Compares Compound lending rate vs Aave lending rate and returns "OK"
     * if one is greater than the other
     * @param _compoundToken cToken to get the lending rate from
     * @param _underlyingAsset token or / ETH to get aDAI tokens lending rate from
     * @param _minSpread Minimum spread both amounts have to differ to return "OK" in ray
     * @param _tokenInCompound true if user currently holds cTokens, false if aTokens
     */
    function compareLendingRate(
        ICToken _compoundToken,
        address _underlyingAsset,
        uint256 _minSpread,
        bool _tokenInCompound
    ) public view returns (string memory) {
        // Compound
        // Returned in wad
        uint256 compRateRay = getCompRateInRay(_compoundToken);

        // Aave
        // Returned in ray
        uint256 aaveRate = getAaveInRay(_underlyingAsset);

        // If user currently has tokens in Compound, but Aave rate is better, refinance to aave
        if (_tokenInCompound && aaveRate > compRateRay.add(_minSpread))
            return OK;

        // If user currently has tokens in Aave, but Compound rate is better, refinance to aave
        if (!_tokenInCompound && compRateRay > aaveRate.add(_minSpread))
            return OK;

        if (_tokenInCompound) return "IR not higher on Aave than on Compound";

        if (!_tokenInCompound) return "IR not higher on Compound than on Aave";
    }

    /**
     * @dev Retrieves lending rate from cToken and converts it into ray
     * @param _compoundToken cToken to get the lending rate from
     */
    function getCompRateInRay(ICToken _compoundToken)
        public
        view
        returns (uint256 compRateRay)
    {
        uint256 compRate = _compoundToken.supplyRatePerBlock();

        // convert block based IR to annualized rate
        compRateRay = compRate.mul(2102400).mul(1e9);
    }

    /**
     * @dev Retrieves lending rate from aToken (in ray)
     * @param _underlyingAsset token or / ETH to get aDAI tokens lending rate from
     */
    function getAaveInRay(address _underlyingAsset)
        public
        view
        returns (uint256 aaveRate)
    {
        // Aave
        address lendingPool = lendingPoolAddressesProvider.getLendingPoolCore();

        // Returned in ray
        aaveRate = ILendingPoolCore(lendingPool).getReserveCurrentLiquidityRate(
            _underlyingAsset
        );
    }
}