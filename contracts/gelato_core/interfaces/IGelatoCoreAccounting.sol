pragma solidity ^0.5.10;

import "../../actions/IGelatoAction.sol";

interface IGelatoCoreAccounting {

    event LogRegisterExecutor(
        address payable indexed executor,
        uint256 executorPrice,
        uint256 executorClaimLifespan
    );

    event LogDeregisterExecutor(address payable indexed executor);

    event LogSetExecutorPrice(uint256 executorPrice, uint256 newExecutorPrice);

    event LogSetExecutorClaimLifespan(
        uint256 executorClaimLifespan,
        uint256 newExecutorClaimLifespan
    );

    event LogWithdrawExecutorBalance(
        address indexed executor,
        uint256 withdrawAmount
    );

    event LogSetMinExecutionClaimLifespan(
        uint256 minExecutionClaimLifespan,
        uint256 newMinExecutionClaimLifespan
    );

    event LogSetCanExecMaxGas(uint256 canExecMaxGas, uint256 newCanExecMaxGas);

    event LogSetGelatoCoreExecGasOverhead(
        uint256 gelatoCoreExecGasOverhead,
        uint256 _newGasOverhead
    );

    event LogSetUserProxyExecGasOverhead(
        uint256 userProxyExecGasOverhead,
        uint256 _newGasOverhead
    );

    function registerExecutor(uint256 _executorPrice, uint256 _executorClaimLifespan) external;

    function deregisterExecutor() external;

    function setExecutorPrice(uint256 _newExecutorGasPrice) external;

    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan) external;

    function withdrawExecutorBalance() external;

    function setMinExecutionClaimLifespan(uint256 _newMinExecutionClaimLifespan) external;

    function setCanExecMaxGas(uint256 _newCanExecMaxGas) external;

    function setGelatoCoreExecGasOverhead(uint256 _newGasOverhead) external;

    function setUserProxyExecGasOverhead(uint256 _newGasOverhead) external;

    function getMinExecutionGasRequirement(uint256 _actionGasStipend)
        external
        view
        returns(uint256);

    function getMintingDepositPayable(IGelatoAction _action, address _selectedExecutor)
        external
        view
        returns(uint256 mintingDepositPayable);

    function getMinExecutionClaimLifespan() external view returns(uint256);

    function getExecutorPrice(address _executor) external view returns(uint256);

    function getExecutorClaimLifespan(address _executor) external view returns(uint256);

    function getExecutorBalance(address _executor) external view returns(uint256);

    function getCanExecMaxGas() external view returns(uint256);

    function getGelatoCoreExecGasOverhead() external view returns(uint256);

    function getUserProxyExecGasOverhead() external view returns(uint256);

    function getNonActionExecutionGas() external view returns(uint256);
}