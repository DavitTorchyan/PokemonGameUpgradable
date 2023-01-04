import { ethers, upgrades } from "hardhat";

const PROXY = "0x372C8570b733051F3Ad41738A457f0Dd028a8651";
async function main() {

    const PokemonV2 = await ethers.getContractFactory("PokemonV2");

    console.log("Upgrading Pokemon...");

    const pokemonV2 = await upgrades.upgradeProxy(PROXY, PokemonV2);

    console.log(`Pokemon upgraded successfully!, Address: ${pokemonV2.address}`);
}

main();