pragma solidity ^0.5.10;

import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol';

library GelatoERC20Lib {
    using SafeERC20 for IERC20;

    // ________ Transfers ____________________________________________________________
    function _safeTransferFrom(IERC20 _token,
                               address _from,
                               address _to,
                               uint256 _value
    )
        internal
        returns(bool)
    {
        uint256 currentAllowance = _token.allowance(_from, address(this));
        if (currentAllowance >= _value) {
            _token.safeTransferFrom(_from, _to, _value);
            return true;
        }
        return false;
    }
    // ==============

    // ________ Alowance Checks ______________________________________________________
    function _hasERC20Allowance(IERC20 _token,
                                address _tokenOwner,
                                address _spender,
                                uint256 _allowance
    )
        internal
        view
        returns(bool)
    {
        require(_token != IERC20(0),
            "GelatoERC20Helpers.hasERC20Allowance: _token zero-value"
        );
        require(_tokenOwner != address(0),
            "GelatoERC20Helpers.hasERC20Allowance: _tokenOwner zero-value"
        );
        require(_allowance != 0,
            "GelatoERC20Helpers.hasERC20Allowance: _allowance zero-value"
        );
        return (_token.allowance(_tokenOwner, _spender) >= _allowance);
    }

    // ________ Increasing/Decreasing Allowances _____________________________________
    function _safeIncreaseERC20Allowance(IERC20 _token,
                                         address _spender,
                                         uint256 _value
    )
        internal
        returns(bool)
    {
        uint256 currentAllowance = _token.allowance(address(this), _spender);
        if (currentAllowance == 0) {
            _token.safeApprove(_spender, _value);
            return true;
        } else if (currentAllowance > 0) {
            _token.safeIncreaseAllowance(_spender, _value);
            return true;
        } else {
            return false;
        }
    }

    function _safeDecreaseERC20Allowance(IERC20 _token,
                                         address _spender,
                                         uint256 _decreaseValue
    )
        internal
        returns(bool)
    {
        require(_decreaseValue != 0,
            "GelatoERC20Helpers._safeDecreaseERC20Allowance: _decreasValue is zero"
        );
        uint256 currentAllowance = _token.allowance(address(this), _spender);
        if (currentAllowance < _decreaseValue) {
            return true;
        } else if (currentAllowance == _decreaseValue) {
            _token.safeApprove(_spender, 0);
            return true;
        } else if (currentAllowance > _decreaseValue) {
            _token.safeDecreaseAllowance(_spender, _decreaseValue);
            return true;
        } else {
            return false;
        }
    }
    // ==============
}