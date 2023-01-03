import { ethers } from "hardhat";

async function main() {

  const Nft = await ethers.getContractFactory("Pokemon");
  const nft = await Nft.deploy("NewPokemons", "NP");

  await nft.deployed();

  console.log(`Succesfully deployed at ${nft.address}`);
}

main();