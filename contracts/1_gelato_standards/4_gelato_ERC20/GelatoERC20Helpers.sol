pragma solidity ^0.5.10;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

contract GelatoERC20Helpers {
    using SafeERC20 for ERC20;

    // ________ Transfers ____________________________________________________________
    function _safeTransferFrom(address _token,
                               address _from,
                               address _to,
                               uint256 _value
    )
        internal
        returns(bool)
    {
        uint256 currentAllowance = ERC20(_token).allowance(_from, address(this));
        if (currentAllowance >= _value) {
            ERC20(_token).safeTransferFrom(_from,
                                           _to,
                                           _value
            );
            return true;
        }
        return false;
    }
    // ==============

    // ________ Alowance Checks ______________________________________________________
    function hasERC20Allowance(address _token,
                               address _tokenOwner,
                               uint256 _allowance
    )
        public
        view
        returns(bool)
    {
        require(_token != address(0),
            "GelatoERC20Helpers.hasERC20Allowance: _token zero-value"
        );
        require(_tokenOwner != address(0),
            "GelatoERC20Helpers.hasERC20Allowance: _tokenOwner zero-value"
        );
        require(_allowance != 0,
            "GelatoERC20Helpers.hasERC20Allowance: _allowance zero-value"
        );
        return (ERC20(_token).allowance(_tokenOwner, address(this)) >= _allowance);
    }

    // ________ Increasing/Decreasing Allowances _____________________________________
    function _safeIncreaseERC20Allowance(address _token,
                                         address _spender,
                                         uint256 _value
    )
        internal
        returns(bool)
    {
        uint256 currentAllowance = ERC20(_token).allowance(address(this), _spender);
        if (currentAllowance == 0) {
            ERC20(_token).safeApprove(_spender, _value);
            return true;
        } else if (currentAllowance > 0) {
            ERC20(_token).safeIncreaseAllowance(_spender, _value);
            return true;
        } else {
            return false;
        }
    }

    function _safeDecreaseERC20Allowance(address _token,
                                         address _spender,
                                         uint256 _decreaseValue
    )
        internal
        returns(bool)
    {
        require(_decreaseValue != 0,
            "GelatoERC20Helpers._safeDecreaseERC20Allowance: _decreasValue is zero"
        );
        uint256 currentAllowance = ERC20(_token).allowance(address(this), _spender);
        if (currentAllowance < _decreaseValue) {
            return true;
        } else if (currentAllowance == _decreaseValue) {
            ERC20(_token).safeApprove(_spender, 0);
            return true;
        } else if (currentAllowance > _decreaseValue) {
            ERC20(_token).safeDecreaseAllowance(_spender, _decreaseValue);
            return true;
        } else {
            return false;
        }
    }
    // ==============
}