pragma solidity ^0.5.10;

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '../0_gelato_interfaces/1_GTA_interfaces/gelato_action_interfaces/IGelatoAction.sol';

contract GelatoCoreAccounting is Ownable,
                                 ReentrancyGuard
{
    using SafeMath for uint256;

    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) internal executorPrices;
    mapping(address => uint256) internal userBalances;
    mapping(address => uint256) internal executorBalances;
    uint256 internal executionClaimLifespan;
    //_____________ Constant gas values _____________
    uint256 internal gasOutsideGasleftChecks;
    uint256 internal gasInsideGasleftChecks;
    uint256 internal canExecMaxGas;
    // =========================

    constructor(uint256 _executionClaimLifespan,
                uint256 _gasOutsideGasleftChecks,
                uint256 _gasInsideGasleftChecks,
                uint256 _canExecMaxGas
    )
        internal
    {
        executionClaimLifespan = _executionClaimLifespan;
        gasOutsideGasleftChecks = _gasOutsideGasleftChecks;
        gasInsideGasleftChecks = _gasInsideGasleftChecks;
        canExecMaxGas = _canExecMaxGas;
    }

    modifier onlyRegisteredExecutor(address _executor) {
        require(executorPrices[_executor] != 0,
            "GelatoCoreAccounting.onlyRegisteredExecutors: failed"
        );
        _;
    }

    // _______ Execution Gas Caps ____________________________________________
    function _getMaxExecutionGasConsumption(uint256 _actionGasStipend)
        internal
        view
        returns(uint256)
    {
        return (gasOutsideGasleftChecks
                + gasInsideGasleftChecks
                + canExecMaxGas
                .add(_actionGasStipend)
        );
    }
    function getMaxExecutionGasConsumption(uint256 _actionGasStipend)
        external
        view
        returns(uint256)
    {
        return _getMaxExecutionGasConsumption(_actionGasStipend);
    }
    // =======

    // _______ Important Data to be included as msg.value for minting __________
    function getMintingDepositPayable(address _action,
                                      address _selectedExecutor
    )
        external
        view
        returns(uint256 mintingDepositPayable)
    {
        uint256 actionGasStipend = IGelatoAction(_action).getActionGasStipend();
        uint256 executionMaxGas = _getMaxExecutionGasConsumption(actionGasStipend);
        mintingDepositPayable = executionMaxGas.mul(executorPrices[_executor]);
    }
    // =======

    // __________ Interface for State Reads ___________________________________
    function getExecutorPrice(address _executor) external view returns(uint256) {
        return executorPrices[_executor];
    }
    function getUserBalance(address _user) external view returns(uint256) {
        return userBalances[_user];
    }
    function getExecutorBalance(address _executor) external view returns(uint256) {
        return executorBalances[_executor];
    }
    function getGasOutsideGasleftChecks() external view returns(uint256) {
        return gasOutsideGasleftChecks;
    }
    function getGasInsideGasleftChecks() external view returns(uint256) {
        return gasInsideGasleftChecks;
    }
    function getCanExecMaxGas() external view returns(uint256) {
        return canExecMaxGas;
    }
    // =========================

    // ____________ Interface for STATE MUTATIONS ________________________________________
    //_____________ Interface for Executor __________
    event LogExecutorPriceUpdated(uint256 executorPrice,
                                  uint256 newExecutorPrice
    );
    function setExecutorPrice(uint256 _newExecutorGasPrice)
        external
    {
        emit LogExecutorPriceUpdated(executorPrice, _newExecutorGasPrice);
        executorPrices[msg.sender] = _newExecutorGasPrice;
    }

    event LogExecutorBalanceWithdrawal(address indexed executor,
                                       uint256 withdrawAmount
    );
    function withdrawExecutorBalance()
        nonReentrant
        external
    {
        // Checks
        uint256 currentExecutorBalance = executorBalances[msg.sender];
        require(currentExecutorBalance > 0,
            "GelatoCoreAccounting.withdrawExecutorBalance: failed"
        );
        // Effects
        executorBalances[msg.sender] = 0;
        // Interaction
        msg.sender.transfer(currentExecutorBalance);
        emit LogExecutorBalanceWithdrawal(msg.sender,
                                          currentExecutorBalance
        );
    }
    // =========


    //_____________ Interface for GelatoCore Owner __________
    event LogExecutionClaimLifespanUpdated(uint256 oldExecutionClaimLifespan,
                                           uint256 newExecutionClaimLifespan
    );
    function setExecutionClaimLifespan(uint256 _newExecutionClaimLifespan)
        onlyOwner
        external
    {
        emit LogExecutionClaimLifespanUpdated(executionClaimLifespan,
                                              _newExecutionClaimLifespan
        );
        executionClaimLifespan = _newExecutionClaimLifespan;
    }

    event LogGasOutsideGasleftChecksUpdated(uint256 gasOutsideGasleftChecks,
                                            uint256 newGasOutsideGasleftChecks
    );
    function setGasOutsideGasleftChecks(uint256 _newGasOutsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogGasOutsideGasleftChecksUpdated(gasOutsideGasleftChecks,
                                               _newGasOutsideGasleftChecks
        );
        gasOutsideGasleftChecks = _newGasOutsideGasleftChecks;
    }

    event LogGasInsideGasleftChecksUpdated(uint256 gasInsideGasleftChecks,
                                           uint256 newGasInsideGasleftChecks
    );
    function setGasInsideGasleftChecks(uint256 _newGasInsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogGasInsideGasleftChecksUpdated(gasInsideGasleftChecks,
                                              _newGasInsideGasleftChecks
        );
        gasInsideGasleftChecks = _newGasInsideGasleftChecks;
    }

    event LogUpdatedCanExecMaxGas(uint256 canExecMaxGas,
                                  uint256 newcanExecMaxGas
    );
    function setCanExecMaxGas(uint256 _newCanExecMaxGas)
        onlyOwner
        external
    {
        emit LogUpdatedCanExecMaxGas(canExecMaxGas, _newCanExecMaxGas);
        canExecMaxGas = _newCanExecMaxGas;
    }
    // =========================
}
