pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../GelatoConditionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";

contract ConditionBalanceStateful is GelatoConditionsStandard {

    using SafeMath for uint256;

    mapping(address => mapping(address => mapping(address => uint256))) public proxyTokenBalanceRef;


    function ok(bytes calldata _conditionDataWithSelector)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (address _proxy, address _account, address _token, bool _greaterElseSmaller) = abi.decode(
            _conditionDataWithSelector[4:],
            (address,address,address,bool)
        );
        return ok(_proxy, _account, _token, _greaterElseSmaller);
    }


    // Specific Implementation
    function ok(address _proxy, address _account, address _token, bool _greaterElseSmaller)
        public
        view
        virtual
        returns(string memory)
    {
        uint256 refBalance = proxyTokenBalanceRef[_proxy][_account][_token];
        // ETH balances
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (_greaterElseSmaller) {  // greaterThan
                if (_account.balance >= refBalance) return OK;
                return "NotOkETHBalanceIsNotGreaterThanRefBalance";
            } else {  // smallerThan
                if (_account.balance <= refBalance) return OK;
                return "NotOkETHBalanceIsNotSmallerThanRefBalance";
            }
        } else {
            // ERC20 balances
            IERC20 erc20 = IERC20(_token);
            try erc20.balanceOf(_account) returns (uint256 erc20Balance) {
                if (_greaterElseSmaller) {  // greaterThan
                    if (erc20Balance >= refBalance) return OK;
                    return "NotOkERC20BalanceIsNotGreaterThanRefBalance";
                } else {  // smallerThan
                    if (erc20Balance <= refBalance) return OK;
                    return "NotOkERC20BalanceIsNotSmallerThanRefBalance";
                }
            } catch {
                return "ERC20Error";
            }
        }
    }

    function setRefBalance(
        uint256 _change,
        address _token,
        address _account,
        bool _plusOrMinus
    )
        public
    {
        uint256 newRefBalance;
        uint256 currentBalance;
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {  // ETH
            currentBalance = _account.balance;
        } else {
            IERC20 erc20 = IERC20(_token);
            currentBalance = erc20.balanceOf(_account);
        }
        newRefBalance = _plusOrMinus ? currentBalance + _change : currentBalance.sub(_change);
        proxyTokenBalanceRef[msg.sender][_account][_token] = newRefBalance;
    }
}