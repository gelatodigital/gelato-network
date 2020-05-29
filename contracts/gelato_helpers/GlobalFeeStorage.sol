// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { IUniswapFactory } from '../dapp_interfaces/uniswap/IUniswapFactory.sol';
import { IUniswapExchange } from '../dapp_interfaces/uniswap/IUniswapExchange.sol';
import { IMedianizer } from "../dapp_interfaces/maker/IMakerMedianizer.sol";

import { IKyber } from '../dapp_interfaces/kyber/IKyber.sol';
import { IERC20 } from '../external/IERC20.sol';
import { Ownable } from '../external/Ownable.sol';
import { SafeMath } from '../external/SafeMath.sol';

/// @notice Contract that stores and calculates the fee logic for providers.
/// @dev will be called within Gelato Actions
contract GlobalFeeStorage {

    using SafeMath for uint256;

    uint256 public constant MAX_UINT = type(uint256).max;

    // UserProxy => storedUint
    mapping(address => uint256) public uintStore;

    // UserProxy => Provider
    mapping(address => address) public currentProvider;

    struct Fee {
        uint256 num;
        uint256 den;
    }

    // Provider => Action => Fee
    mapping(address => mapping(address => Fee)) public providerActionFee;

    // Provider Setters => Called through GlobalProviderStateSetter
    // For example for a fee of 0.1% set _feeNum = 1 and _feeDen = 1000
    function setActionFee(address _action, uint256 _feeNum, uint256 _feeDen)
        external
    {
        providerActionFee[msg.sender][_action] = Fee({num: _feeNum, den: _feeDen});
    }

    // User Proxy Setters
    function updateUintStore(uint256 _newUint)
        public
    {
        uintStore[msg.sender] = _newUint;
    }

    function updateCurrentProvider(address _userProxy)
        public
    {
        currentProvider[_userProxy] = msg.sender;
    }

    function updateUintStoreAndProvider(
        uint256 _newUint,
        address _provider
    )
        public
    {
        updateUintStore(_newUint);
        updateCurrentProvider(_provider);
    }

    // User Proxy Getters
    function getAmountWithFees(address _action)
        external
        returns (uint256 amount, uint256 feeAmount, address provider)
    {
        // Get Provider
        provider = currentProvider[msg.sender];
        delete currentProvider[msg.sender];

        // Get uintStore
        amount = uintStore[msg.sender];
        delete uintStore[msg.sender];

        // Calculate provider fee
        if(amount != MAX_UINT)
        (feeAmount, amount) = getFeeAmounts(amount, provider, _action);
    }

    function getFeeAmounts(uint256 _amount, address _provider, address _action)
        public
        view
        returns(uint256 feeAmount, uint256 amountMinusFee)
    {
        // Calculate provider fee
        Fee memory fee = providerActionFee[_provider][_action];
        feeAmount = _amount.mul(fee.num).div(fee.den, "GlobalFeeStorage.getAmountWithFees: feeAmount underflow");

        amountMinusFee = _amount.sub(feeAmount, "GlobalFeeStorage.getAmountWithFees: amountMinusFee underflow");
    }

}