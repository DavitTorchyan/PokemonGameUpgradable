import { ethers, upgrades } from "hardhat";

async function main() {

  const Pokemon = await ethers.getContractFactory("Pokemon"); 
  console.log("Deploying Pokemon...");  
  const pokemon = await upgrades.deployProxy(Pokemon, ["NewPokemons", "NP"], {
    initializer: "initialize", kind: "uups",
  });
  await pokemon.deployed(); 
  console.log("Pokemon deployed to:", pokemon.address);
}

main();