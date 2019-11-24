pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../GelatoUpgradeableActionsStandard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../../gelato_core/IGelatoCore.sol";
import "../../../triggers/IGelatoTrigger.sol";

contract UpgradeableActionMultiMintForTimeTrigger is Initializable,
                                                     GelatoUpgradeableActionsStandard
{
    using SafeMath for uint256;

    IGelatoCore internal gelatoCore;

    function getGelatoCore() external view returns(IGelatoCore) {return gelatoCore;}

    function proxyInitializer(address _proxyAdmin,
                              uint256 _actionGasStipend,
                              address _gelatoCore
    )
        external
        initializer
    {
        myProxyAdmin = ProxyAdmin(_proxyAdmin);
        actionOperation = ActionOperation.proxydelegatecall;
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
        gelatoCore = IGelatoCore(_gelatoCore);
        _initializeImplementation();
    }

    modifier initialized() {
        require(gelatoCore != IGelatoCore(0),
            "UpgradeableActionMultiMintForTimeTrigger.initialized: failed"
        );
        _;
    }

    function _initializeImplementation()
        private
        initialized
    {
        UpgradeableActionMultiMintForTimeTrigger implementation
            = UpgradeableActionMultiMintForTimeTrigger(_getMyImplementationAddress());
        require(implementation.getGelatoCore() == IGelatoCore(0),
            "UpgradeableActionMultiMintForTimeTrigger.initializeMyImplementation: already init"
        );
        implementation.implementationInitializer(actionGasStipend, gelatoCore);
        require(implementation.getGelatoCore() != IGelatoCore(0),
            "UpgradeableActionMultiMintForTimeTrigger.initializeMyImplementation: failed"
        );
    }
    function initializeImplementation() external {return _initializeImplementation();}
    
    function implementationInitializer(uint256 _actionGasStipend,
                                       IGelatoCore _gelatoCore
    )
        external
    {
        require(msg.sender != address(this),
            "UpgradeableActionMultiMintForTimeTrigger.implementationInitializer: failed"
        );
        require(actionSelector == bytes4(0),
            "UpgradeableActionMultiMintForTimeTrigger.implementationInitializer: already init"
        );
        actionOperation = ActionOperation.proxydelegatecall;
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
        gelatoCore = _gelatoCore;
    }

    function action(// gelatoCore.mintExecutionClaim params
                    address _timeTrigger,
                    uint256 _startTime,  // will be encoded here
                    address _action,
                    bytes calldata _actionPayload,
                    address payable _selectedExecutor,
                    // MultiMintTimeBased params
                    uint256 _intervalSpan,
                    uint256 _numberOfMints
    )
            external
            payable
            initialized
        {
            uint256 mintingDepositPerMint
                = gelatoCore.getMintingDepositPayable(_action, _selectedExecutor);
            require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
                "MultiMintTimeBased.multiMint: incorrect msg.value"
            );
            for (uint256 i = 0; i < _numberOfMints; i++)
            {
                uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
                bytes memory triggerPayload
                    = abi.encodeWithSelector(
                        IGelatoTrigger(_timeTrigger).getTriggerSelector(),
                        timestamp
                );
                gelatoCore.mintExecutionClaim
                          .value(mintingDepositPerMint)
                          (_timeTrigger,
                           triggerPayload,
                           _action,
                           _actionPayload,
                           _selectedExecutor
                );
            }
        }
}