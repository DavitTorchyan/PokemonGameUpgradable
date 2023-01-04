// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./Pokemon.sol";

contract PokemonV2 is Pokemon {
    function contractVersion() public pure returns(string memory) {
        return "Contract upgraded! Contract version: 2";
    }
}