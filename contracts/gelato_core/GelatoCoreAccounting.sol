pragma solidity ^0.5.10;

import "./interfaces/IGelatoCoreAccounting.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/Address.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

/// @title GelatoCoreAccounting
/// @notice APIs for GelatoCore Owner and executorClaimLifespan
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
contract GelatoCoreAccounting is IGelatoCoreAccounting, Ownable {

    using Address for address payable;  /// for oz's sendValue method
    using SafeMath for uint256;

    // the minimum executionClaimLifespan imposed upon executors
    uint256 internal minExecutionClaimLifespan;
    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) internal executorPrice;
    mapping(address => uint256) internal executorClaimLifespan;
    mapping(address => uint256) internal executorBalance;
    //_____________ Gas values for executionClaim cost calculations _______
    uint256 internal canExecMaxGas;
    uint256 internal gelatoCoreExecGasOverhead;
    uint256 internal userProxyExecGasOverhead;
    uint256 internal nonActionExecutionGas = (
        canExecMaxGas
        + gelatoCoreExecGasOverhead
        + userProxyExecGasOverhead
    );
    // =========================

    /// @dev non-deploy base contract
    constructor() internal {
        Ownable.initialize(msg.sender);
        minExecutionClaimLifespan = 10 minutes;
        canExecMaxGas = 100000;
        gelatoCoreExecGasOverhead = 100000;
        userProxyExecGasOverhead = 40000;
    }

    // ____________ Interface for STATE MUTATIONS ________________________________________
    //_____________ Interface for Executor _________________________________
    // __ Executor De/Registrations _______
    function registerExecutor(
        uint256 _executorPrice,
        uint256 _executorClaimLifespan
    )
        external
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
        onlyRegisteredExecutors(msg.sender)
    {
        executorPrice[msg.sender] = 0;
        executorClaimLifespan[msg.sender] = 0;
        emit LogDeregisterExecutor(msg.sender);
    }
    // ===

    function setExecutorPrice(uint256 _newExecutorGasPrice)
        external
    {
        emit LogSetExecutorPrice(executorPrice[msg.sender], _newExecutorGasPrice);
        executorPrice[msg.sender] = _newExecutorGasPrice;
    }

    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan)
        external
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
    // =========

    //_____________ Interface for GelatoCore Owner ________________________________
    function setMinExecutionClaimLifespan(uint256 _newMinExecutionClaimLifespan)
        onlyOwner
        external
    {
        require(
            _newMinExecutionClaimLifespan >= minExecutionClaimLifespan,
            "GelatoCoreAccounting.setMinExecutionClaimLifespan: threshold failed"
        );
        emit LogSetMinExecutionClaimLifespan(
            minExecutionClaimLifespan,
            _newMinExecutionClaimLifespan
        );
        minExecutionClaimLifespan = _newMinExecutionClaimLifespan;
    }

    function setCanExecMaxGas(uint256 _newCanExecMaxGas)
        onlyOwner
        external
    {
        emit LogSetCanExecMaxGas(canExecMaxGas, _newCanExecMaxGas);
        canExecMaxGas = _newCanExecMaxGas;
    }

    function setGelatoCoreExecGasOverhead(uint256 _newGasOverhead)
        onlyOwner
        external
    {
        emit LogSetGelatoCoreExecGasOverhead(gelatoCoreExecGasOverhead, _newGasOverhead);
        gelatoCoreExecGasOverhead = _newGasOverhead;
    }

    function setUserProxyExecGasOverhead(uint256 _newGasOverhead)
        onlyOwner
        external
    {
        emit LogSetUserProxyExecGasOverhead(userProxyExecGasOverhead, _newGasOverhead);
        userProxyExecGasOverhead = _newGasOverhead;
    }
    // =========
    // =========================

    // __________ Interface for State Reads ___________________________________
    function getMinExecutionClaimLifespan() external view returns(uint256) {
        return minExecutionClaimLifespan;
    }

    function getExecutorPrice(address _executor) external view returns(uint256) {
        return executorPrice[_executor];
    }

    function getExecutorClaimLifespan(address _executor) external view returns(uint256) {
        return executorClaimLifespan[_executor];
    }

    function getExecutorBalance(address _executor) external view returns(uint256) {
        return executorBalance[_executor];
    }

    function getCanExecMaxGas() external view returns(uint256) {
        return canExecMaxGas;
    }

    function getGelatoCoreExecGasOverhead() external view returns(uint256) {
        return gelatoCoreExecGasOverhead;
    }

    function getUserProxyExecGasOverhead() external view returns(uint256) {
        return userProxyExecGasOverhead;
    }

    function getNonActionExecutionGas() external view returns(uint256) {
        return nonActionExecutionGas;
    }
    // =========================

    // _______ APIs for executionClaim pricing ______________________________________
    function getMintingDepositPayable(
        IGelatoAction _action,
        address _selectedExecutor
    )
        external
        view
        onlyRegisteredExecutors(_selectedExecutor)
        returns(uint256 mintingDepositPayable)
    {
        uint256 actionGasTotal = _action.getActionGasTotal();
        uint256 executionMinGas = _getMinExecutionGasRequirement(actionGasTotal);
        mintingDepositPayable = executionMinGas.mul(executorPrice[_selectedExecutor]);
    }

    function getMinExecutionGasRequirement(uint256 _actionGasTotal)
        external
        view
        returns(uint256)
    {
        return _getMinExecutionGasRequirement(_actionGasTotal);
    }

    function _getMinExecutionGasRequirement(uint256 _actionGasTotal)
        internal
        view
        returns(uint256)
    {
        return nonActionExecutionGas.add(_actionGasTotal);
    }
    // =======
}