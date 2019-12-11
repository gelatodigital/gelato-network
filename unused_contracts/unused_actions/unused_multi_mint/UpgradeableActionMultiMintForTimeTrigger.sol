pragma solidity ^0.5.14;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../GelatoUpgradeableActionsStandard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../../gelato_core/IGelatoCore.sol";
import "../../../triggers/IGelatoTrigger.sol";

contract UpgradeableActionMultiMintForTimeTrigger is Initializable,
                                                     GelatoUpgradeableActionsStandard
{
    using SafeMath for uint256;

    IGelatoCore internal gelatoCore;
    function getGelatoCore() external view returns(IGelatoCore) {return gelatoCore;}

    function proxyInitializer(
        address _proxysProxyAdmin,
        uint256 _actionTotalGas,
        address _gelatoCore
    )
        external
        initializer
    {
        proxysProxyAdmin = ProxyAdmin(_proxysProxyAdmin);
        actionOperation = ActionOperation.delegatecall;
        actionSelector = this.action.selector;
        actionTotalGas = _actionTotalGas;
        gelatoCore = IGelatoCore(_gelatoCore);
        _initializeImplementationFromProxy();
    }

    function initializeImplementationFromProxy()
        external
    {
        return _initializeImplementationFromProxy();
    }

    function initializerOnImplementation(
        uint256 _actionTotalGas,
        IGelatoCore _gelatoCore
    )
        external
    {
        require(msg.sender != address(this),
            "UpgradeableActionMultiMintForTimeTrigger.implementationInitializer: called proxy instead of implementation"
        );
        require(actionSelector == bytes4(0),
            "UpgradeableActionMultiMintForTimeTrigger.implementationInitializer: already init"
        );
        actionOperation = ActionOperation.delegatecall;
        actionSelector = this.action.selector;
        actionTotalGas = _actionTotalGas;
        gelatoCore = _gelatoCore;
        implementationInit = true;
    }

    modifier initialized() {
        require(gelatoCore != IGelatoCore(0),
            "UpgradeableActionMultiMintForTimeTrigger.initialized: failed"
        );
        _;
    }

    function action(
        // gelatoCore.mintExecutionClaim params
        address _timeTrigger,
        uint256 _startTime,  // will be encoded here
        address _action,
        bytes calldata _actionPayloadWithSelector,
        address payable _selectedExecutor,
        // MultiMintTimeBased params
        uint256 _intervalSpan,
        uint256 _numberOfMints
    )
        external
        payable
        initialized
    {
        uint256 mintingDepositPerMint = gelatoCore.getMintingDepositPayable(
            _action,
            _selectedExecutor
        );
        require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
            "MultiMintTimeBased.multiMint: incorrect msg.value"
        );
        for (uint256 i = 0; i < _numberOfMints; i++) {
            uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
            bytes memory actionPayloadWithSelector = _actionPayloadWithSelector;
            bytes memory triggerPayloadWithSelector = abi.encodeWithSelector(
                IGelatoTrigger(_timeTrigger).getTriggerSelector(),
                _action,
                actionPayloadWithSelector,
                timestamp
            );
            gelatoCore.mintExecutionClaim.value(mintingDepositPerMint)(
                _timeTrigger,
                triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _selectedExecutor
            );
        }
    }

    function _initializeImplementationFromProxy()
        private
        initialized
    {
        UpgradeableActionMultiMintForTimeTrigger implementation = UpgradeableActionMultiMintForTimeTrigger(_askProxyForImplementationAddress());
        require(!implementation.askImplementationIfInit(),
            "UpgradeableActionMultiMintForTimeTrigger.initializeMyImplementation: already init"
        );
        implementation.initializerOnImplementation(actionTotalGas, gelatoCore);
        require(implementation.askImplementationIfInit(),
            "UpgradeableActionMultiMintForTimeTrigger.initializeMyImplementation: failed"
        );
    }
}