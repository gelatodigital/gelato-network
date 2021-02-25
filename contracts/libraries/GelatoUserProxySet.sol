// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import {GelatoUserProxy} from "../user_proxies/gelato_user_proxy/GelatoUserProxy.sol";


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
 * As of v2.5.0, only `GelatoUserProxy` sets are supported.
 *
 * Include with `using EnumerableSet for EnumerableSet.Set;`.
 *
 * _Available since v2.5.0._
 *
 * @author Alberto Cuesta Cañada
 * @author Luis Schliessske (modified to GelatoUserProxySet)
 */
library GelatoUserProxySet {

    struct Set {
        // Position of the proxy in the `gelatoUserProxies` array, plus 1 because index 0
        // means a proxy is not in the set.
        mapping (GelatoUserProxy => uint256) index;
        GelatoUserProxy[] gelatoUserProxies;
    }

    /**
     * @dev Add a proxy to a set. O(1).
     * Returns false if the proxy was already in the set.
     */
    function add(Set storage set, GelatoUserProxy proxy)
        internal
        returns (bool)
    {
        if (!contains(set, proxy)) {
            set.gelatoUserProxies.push(proxy);
            // The element is stored at length-1, but we add 1 to all indexes
            // and use 0 as a sentinel proxy
            set.index[proxy] = set.gelatoUserProxies.length;
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Removes a proxy from a set. O(1).
     * Returns false if the proxy was not present in the set.
     */
    function remove(Set storage set, GelatoUserProxy proxy)
        internal
        returns (bool)
    {
        if (contains(set, proxy)){
            uint256 toDeleteIndex = set.index[proxy] - 1;
            uint256 lastIndex = set.gelatoUserProxies.length - 1;

            // If the element we're deleting is the last one, we can just remove it without doing a swap
            if (lastIndex != toDeleteIndex) {
                GelatoUserProxy lastValue = set.gelatoUserProxies[lastIndex];

                // Move the last proxy to the index where the deleted proxy is
                set.gelatoUserProxies[toDeleteIndex] = lastValue;
                // Update the index for the moved proxy
                set.index[lastValue] = toDeleteIndex + 1; // All indexes are 1-based
            }

            // Delete the index entry for the deleted proxy
            delete set.index[proxy];

            // Delete the old entry for the moved proxy
            set.gelatoUserProxies.pop();

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Returns true if the proxy is in the set. O(1).
     */
    function contains(Set storage set, GelatoUserProxy proxy)
        internal
        view
        returns (bool)
    {
        return set.index[proxy] != 0;
    }

    /**
     * @dev Returns an array with all gelatoUserProxies in the set. O(N).
     * Note that there are no guarantees on the ordering of gelatoUserProxies inside the
     * array, and it may change when more gelatoUserProxies are added or removed.

     * WARNING: This function may run out of gas on large sets: use {length} and
     * {get} instead in these cases.
     */
    function enumerate(Set storage set)
        internal
        view
        returns (GelatoUserProxy[] memory)
    {
        GelatoUserProxy[] memory output = new GelatoUserProxy[](set.gelatoUserProxies.length);
        for (uint256 i; i < set.gelatoUserProxies.length; i++) output[i] = set.gelatoUserProxies[i];
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
        return set.gelatoUserProxies.length;
    }

   /** @dev Returns the element stored at position `index` in the set. O(1).
    * Note that there are no guarantees on the ordering of gelatoUserProxies inside the
    * array, and it may change when more gelatoUserProxies are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function get(Set storage set, uint256 index)
        internal
        view
        returns (GelatoUserProxy)
    {
        return set.gelatoUserProxies[index];
    }
}