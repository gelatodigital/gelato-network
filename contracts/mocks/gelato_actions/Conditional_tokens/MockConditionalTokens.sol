// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {GelatoActionsStandard} from "../../../gelato_actions/GelatoActionsStandard.sol";
import {SafeERC20} from "../../../external/SafeERC20.sol";
import {IERC20} from "../../../external/IERC20.sol";

contract MockConditionalTokens {

    using SafeERC20 for IERC20;

    // event LogWithdrawRequest();
    // event LogCounter();

    // mapping(address => uint256) public withdrawAmounts;
    // mapping(address => bool) public validWithdrawRequests;

    IERC20 public immutable liqudityPoolToken;

    constructor(IERC20 _token) public {
        liqudityPoolToken = _token;
    }

    uint256 public lpTokenBalance;


    function balanceOf(address)
        public
        view
        returns (uint256)
    {
        return liqudityPoolToken.balanceOf(msg.sender);
    }

    function setLpTokenBalance(uint256 _newLpTokenBalance)
        public
    {
        lpTokenBalance = _newLpTokenBalance;
    }

    function removeFunding(uint256 _withdrawAmount) public {
        liqudityPoolToken.safeTransferFrom(msg.sender, address(this), _withdrawAmount, "removeFunding fails");
    }

    function balanceOfBatch(address[] memory, uint256[] memory)
        public
        pure
        returns(uint256[] memory balances)
    {
        balances = new uint256[](3);
        balances[0] = uint256(5 ether);
        balances[1] = uint256(8 ether);
        balances[2] = uint256(2 ether);
    }

    function mergePositions(
        IERC20 _collateralToken,
        bytes32,
        bytes32,
        uint[] calldata,
        uint _amount
    )
        external
    {
        _collateralToken.safeTransfer(msg.sender, _amount, "Merge Position fails");
    }



}
