pragma solidity ^0.6.0;

import "./interfaces/IGelatoCoreAccounting.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/// @title GelatoCoreAccounting
/// @notice APIs for GelatoCore Owner and executorClaimLifespan
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoCoreAccounting is IGelatoCoreAccounting {

    using Address for address payable;  /// for oz's sendValue method
    using SafeMath for uint256;

    //_____________ Gelato Executor Economics _______________________
    mapping(address => uint256) public override executorPrice;
    mapping(address => uint256) public override executorClaimLifespan;
    mapping(address => uint256) public override executorBalance;
    // =========================
    // the minimum executionClaimLifespan imposed upon executors
    uint256 public constant override minExecutionClaimLifespan = 10 minutes;
    //_____________ Gas values for executionClaim cost calculations _______
    uint256 public constant override gelatoCoreExecGasOverhead = 100000;
    uint256 public constant override userProxyExecGasOverhead = 40000;
    uint256 public constant override totalExecutionGasOverhead = (
        gelatoCoreExecGasOverhead + userProxyExecGasOverhead
    );

    // __ Executor De/Registrations _______
    function registerExecutor(
        uint256 _executorPrice,
        uint256 _executorClaimLifespan
    )
        external
        override
    {
        require(
            _executorClaimLifespan >= minExecutionClaimLifespan,
            "GelatoCoreAccounting.registerExecutor: _executorClaimLifespan cannot be 0"
        );
        executorPrice[msg.sender] = _executorPrice;
        executorClaimLifespan[msg.sender] = _executorClaimLifespan;
        emit LogRegisterExecutor(
            msg.sender,
            _executorPrice,
            _executorClaimLifespan
        );
    }

    modifier onlyRegisteredExecutors(address _executor) {
        require(
            executorClaimLifespan[_executor] != 0,
            "GelatoCoreAccounting.onlyRegisteredExecutors: failed"
        );
        _;
    }

    function deregisterExecutor()
        external
        override
        onlyRegisteredExecutors(msg.sender)
    {
        executorPrice[msg.sender] = 0;
        executorClaimLifespan[msg.sender] = 0;
        emit LogDeregisterExecutor(msg.sender);
    }

    // __ Executor Economics _______
    function setExecutorPrice(uint256 _newExecutorGasPrice)
        external
        override
    {
        emit LogSetExecutorPrice(executorPrice[msg.sender], _newExecutorGasPrice);
        executorPrice[msg.sender] = _newExecutorGasPrice;
    }

    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan)
        external
        override
    {
        require(
            _newExecutorClaimLifespan >= minExecutionClaimLifespan,
            "GelatoCoreAccounting.setExecutorClaimLifespan: failed"
        );
        emit LogSetExecutorClaimLifespan(
            executorClaimLifespan[msg.sender],
            _newExecutorClaimLifespan
        );
        executorClaimLifespan[msg.sender] = _newExecutorClaimLifespan;
    }

    function withdrawExecutorBalance()
        external
        override
    {
        // Checks
        uint256 currentExecutorBalance = executorBalance[msg.sender];
        require(
            currentExecutorBalance > 0,
            "GelatoCoreAccounting.withdrawExecutorBalance: failed"
        );
        // Effects
        executorBalance[msg.sender] = 0;
        // Interaction
        msg.sender.sendValue(currentExecutorBalance);
        emit LogWithdrawExecutorBalance(msg.sender, currentExecutorBalance);
    }

    // _______ APIs for executionClaim pricing ______________________________________
    function getMintingDepositPayable(
        address _selectedExecutor,
        IGelatoTrigger _trigger,
        IGelatoAction _action
    )
        external
        view
        override
        onlyRegisteredExecutors(_selectedExecutor)
        returns(uint256 mintingDepositPayable)
    {
        uint256 triggerGas = _trigger.triggerGas();
        uint256 actionTotalGas = _action.actionTotalGas();
        uint256 executionMinGas = _getMinExecutionGas(triggerGas, actionTotalGas);
        mintingDepositPayable = executionMinGas.mul(executorPrice[_selectedExecutor]);
    }

    function getMinExecutionGas(uint256 _triggerGas, uint256 _actionTotalGas)
        external
        pure
        override
        returns(uint256)
    {
        return _getMinExecutionGas(_triggerGas, _actionTotalGas);
    }

    function _getMinExecutionGas(uint256 _triggerGas, uint256 _actionTotalGas)
        internal
        pure
        returns(uint256)
    {
        return totalExecutionGasOverhead.add(_triggerGas).add(_actionTotalGas);
    }
    // =======
}