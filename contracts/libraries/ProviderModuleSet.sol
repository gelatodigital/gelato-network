// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {IGelatoProviderModule} from "../gelato_provider_modules/IGelatoProviderModule.sol";


/**
 * @dev Library for managing
 * https://en.wikipedia.org/wiki/Set_(abstract_data_type)[sets] of primitive
 * types.
 *
 * Sets have the following properties:
 *
 * - Elements are added, removed, and checked for existence in constant time
 * (O(1)).
 * - Elements are enumerated in O(n). No guarantees are made on the ordering.
 *
 * As of v2.5.0, only `IGelatoProviderModule` sets are supported.
 *
 * Include with `using EnumerableSet for EnumerableSet.Set;`.
 *
 * _Available since v2.5.0._
 *
 * @author Alberto Cuesta Cañada
 * @author Luis Schliessske (modified to ProviderModuleSet)
 */
library ProviderModuleSet {

    struct Set {
        // Position of the module in the `modules` array, plus 1 because index 0
        // means a module is not in the set.
        mapping (IGelatoProviderModule => uint256) index;
        IGelatoProviderModule[] modules;
    }

    /**
     * @dev Add a module to a set. O(1).
     * Returns false if the module was already in the set.
     */
    function add(Set storage set, IGelatoProviderModule module)
        internal
        returns (bool)
    {
        if (!contains(set, module)) {
            set.modules.push(module);
            // The element is stored at length-1, but we add 1 to all indexes
            // and use 0 as a sentinel module
            set.index[module] = set.modules.length;
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Removes a module from a set. O(1).
     * Returns false if the module was not present in the set.
     */
    function remove(Set storage set, IGelatoProviderModule module)
        internal
        returns (bool)
    {
        if (contains(set, module)){
            uint256 toDeleteIndex = set.index[module] - 1;
            uint256 lastIndex = set.modules.length - 1;

            // If the element we're deleting is the last one, we can just remove it without doing a swap
            if (lastIndex != toDeleteIndex) {
                IGelatoProviderModule lastValue = set.modules[lastIndex];

                // Move the last module to the index where the deleted module is
                set.modules[toDeleteIndex] = lastValue;
                // Update the index for the moved module
                set.index[lastValue] = toDeleteIndex + 1; // All indexes are 1-based
            }

            // Delete the index entry for the deleted module
            delete set.index[module];

            // Delete the old entry for the moved module
            set.modules.pop();

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Returns true if the module is in the set. O(1).
     */
    function contains(Set storage set, IGelatoProviderModule module)
        internal
        view
        returns (bool)
    {
        return set.index[module] != 0;
    }

    /**
     * @dev Returns an array with all modules in the set. O(N).
     * Note that there are no guarantees on the ordering of modules inside the
     * array, and it may change when more modules are added or removed.

     * WARNING: This function may run out of gas on large sets: use {length} and
     * {get} instead in these cases.
     */
    function enumerate(Set storage set)
        internal
        view
        returns (IGelatoProviderModule[] memory)
    {
        IGelatoProviderModule[] memory output = new IGelatoProviderModule[](set.modules.length);
        for (uint256 i; i < set.modules.length; i++) output[i] = set.modules[i];
        return output;
    }

    /**
     * @dev Returns the number of elements on the set. O(1).
     */
    function length(Set storage set)
        internal
        view
        returns (uint256)
    {
        return set.modules.length;
    }

   /** @dev Returns the element stored at position `index` in the set. O(1).
    * Note that there are no guarantees on the ordering of modules inside the
    * array, and it may change when more modules are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function get(Set storage set, uint256 index)
        internal
        view
        returns (IGelatoProviderModule)
    {
        return set.modules[index];
    }
}