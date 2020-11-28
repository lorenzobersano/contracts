//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

library StringLibrary {
  function append(string memory _a, string memory _b)
    internal
    pure
    returns (string memory)
  {
    bytes memory _ba = bytes(_a);
    bytes memory _bb = bytes(_b);
    bytes memory bab = new bytes(_ba.length + _bb.length);
    uint256 k = 0;
    for (uint256 i = 0; i < _ba.length; i++) bab[k++] = _ba[i];
    for (uint256 i = 0; i < _bb.length; i++) bab[k++] = _bb[i];
    return string(bab);
  }
}
