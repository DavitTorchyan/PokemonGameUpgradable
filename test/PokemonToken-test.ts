import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";

describe("Pokemon", function () {
  async function deployTokenFixture() {
    
    const name = "PokemonNft";
    const symbol = "PNFT";
    const [owner, acc1, acc2, acc3] = await ethers.getSigners();
    const Nft = await ethers.getContractFactory("Pokemon");
    const nft = await Nft.deploy(name, symbol);

    return { nft, owner, acc1, acc2, acc3, name, symbol };
  }

    describe("Deployment", () => {
      it("Should deploy with correct args.", async () => {
        const { nft, name, symbol } = await loadFixture(deployTokenFixture);
        expect(await nft.name()).to.eq(name);
        expect(await nft.symbol()).to.eq(symbol);
        expect(await nft.totalSupply()).to.eq(0);
      })
    })

    describe("Minting", () => {
      it("Should mint correctly.", async () => {
        const { nft, acc1 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        expect(await nft.totalSupply()).to.eq(1);
        expect(await nft.ownerOf(1)).to.eq(acc1.address);
        expect(await nft.balanceOf(acc1.address)).to.eq(1);
      })

      it("Should revert when trying to mint more than 2 pokemons.", async () => {
        const { nft, acc1 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc1).mint();
        await expect(nft.connect(acc1).mint()).to.be.revertedWith("You can only mint two pokemons!");
      })

      it("Should emit event Transfer when someone mints new pokemon.", async () => {
        const { nft, acc1 } = await loadFixture(deployTokenFixture);
        await expect(nft.connect(acc1).mint()).to.emit(nft, "Transfer").
        withArgs(ethers.constants.AddressZero, acc1.address, 1);
      })
    })

    describe("Approving", () => {
      it("Should approve correctly.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc1).approve(acc2.address, 1);
        expect(await nft.allowance(acc1.address, acc2.address, 1)).to.be.true;
      })

      it("Should disapprove when approve is called second time.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc1).approve(acc2.address, 1);
        await nft.connect(acc1).approve(acc2.address, 1);
        expect(await nft.allowance(acc1.address, acc2.address, 1)).to.be.false;
      })

      it("Should emit Approval when approve is called.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await expect(nft.connect(acc1).approve(acc2.address, 1)).
        to.emit(nft, "Approval").withArgs(acc1.address, acc2.address, 1);
      })

      it("Should revert if you try approving not your nft.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await expect(nft.connect(acc2).approve(acc1.address, 1)).
        to.be.revertedWith("Not your Pokemon!");
      })
    })

    describe("Transfering", () => {
      it("Should transfer correctly.", async () => {
        const { nft, acc1, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        const acc1Balance = await nft.balanceOf(acc1.address);
        const ownerBalance = await nft.balanceOf(owner.address);
        await nft.connect(acc1).transfer(owner.address, 1);
        expect(await nft.ownerOf(1)).to.eq(owner.address);
        expect(await nft.balanceOf(acc1.address)).to.eq(acc1Balance.sub(1));
        expect(await nft.balanceOf(owner.address)).to.eq(ownerBalance.add(1));
      })

      it("Should revert when you try transfering someone elses nft.", async () => {
        const { nft, acc1, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await expect(nft.connect(owner).transfer(acc1.address, 1)).
        to.be.revertedWith("Not your Pokemon!");
      })

      it("Should emit event transfer when calling transfer.", async () => {
        const { nft, acc1, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await expect(nft.connect(acc1).transfer(owner.address, 1)).to.emit(nft, "Transfer").
        withArgs(acc1.address, owner.address, 1);
      })

      it("Should transferFrom correctly.", async () => {
        const { nft, acc1, owner, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc1).approve(acc2.address, 1);
        const acc1Balance = await nft.balanceOf(acc1.address);
        const ownerBalance = await nft.balanceOf(owner.address);
        await nft.connect(acc2).transferFrom(acc1.address, owner.address, 1);
        expect(await nft.balanceOf(acc1.address)).to.eq(acc1Balance.sub(1));
        expect(await nft.balanceOf(owner.address)).to.eq(ownerBalance.add(1));
      })

      it("Should revert when you try transferFrom without approvement.", async () => {
        const { nft, acc1, acc2, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await expect(nft.connect(acc2).transferFrom(acc1.address, owner.address, 1)).
        to.be.revertedWith("NFT not approved!");
      })

      it("Should emit Transfer when transferFrom is called.", async () => {
        const { nft, acc1, acc2, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc1).approve(acc2.address, 1);
        await expect(nft.connect(acc2).transferFrom(acc1.address, owner.address, 1)).
        to.emit(nft, "Transfer").withArgs(acc1.address, owner.address, 1);
      })
    })

    describe("Pausing", () => {
      it("Should pause the contract successfuly.", async () => {
        const { nft, acc1, acc2, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint()
        await nft.connect(owner).pause();
        await expect(nft.connect(acc1).transfer(acc2.address, 1)).to.be.reverted;
        await expect(nft.connect(acc1).approve(acc2.address, 1)).to.be.reverted;
        await expect(nft.connect(acc1).transferFrom(acc1.address, acc2.address, 1)).to.be.reverted;
        await expect(nft.connect(acc1).requestBattle(1, acc2.address, 2)).to.be.reverted;
        await expect(nft.connect(acc2).acceptBattle(2, 1)).to.be.reverted;
      })

      it("Should unpause the contract successfuly.", async () => {
        const { nft, acc1, acc2, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        await nft.connect(owner).mint();
        await nft.connect(owner).pause();
        await expect(nft.connect(acc1).transfer(acc2.address, 1)).to.be.reverted;
        await nft.connect(owner).unpause();
        await expect(nft.connect(acc2).transfer(owner.address, 2)).not.to.be.reverted;
        await expect(nft.connect(acc1).approve(acc2.address, 1)).not.to.be.reverted;
        await expect(nft.connect(acc2).transferFrom(acc1.address, acc2.address, 1)).
        not.to.be.reverted;
        await expect(nft.connect(acc2).requestBattle(1, owner.address, 3)).not.to.be.reverted;
        await expect(nft.connect(owner).acceptBattle(3, 1)).not.to.be.reverted;
      })
    })

    describe("Battle", () => {
      it("Should request battle correctly.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        const tx1 = await nft.connect(acc1).requestBattle(1, acc2.address, 2);
        const timestamp1 = (await ethers.provider.getBlock(tx1.blockNumber as number)).timestamp;
        expect((await nft.pendingBattles(1, 2)).requested).to.be.true;
        expect((await nft.pendingBattles(1, 2)).requestTime).to.eq(timestamp1);
      })
      
      it("Should accept battle correctly.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        let pokemon1 = await nft.pokemon(1);
        let pokemon2 = await nft.pokemon(2);
        const pokemon1StrengthBefore = pokemon1.strength;
        const pokemon2StrengthBefore = pokemon2.strength;
        await nft.connect(acc1).requestBattle(1, acc2.address, 2);
        const tx2 = await nft.connect(acc2).acceptBattle(2, 1);
        const timestamp2 = (await ethers.provider.getBlock(tx2.blockNumber as number)).timestamp;
        pokemon1 = await nft.pokemon(1);
        pokemon2 = await nft.pokemon(2);
        expect(pokemon1.lastBattleTime).to.eq(timestamp2);
        expect(pokemon2.lastBattleTime).to.eq(timestamp2);
        
        if(pokemon1.totalWins.eq(BigNumber.from(1))) {
          expect(pokemon1.strength).to.be.greaterThan(pokemon1StrengthBefore);
          expect(pokemon2.strength).to.be.lessThan(pokemon2StrengthBefore);
        } else {
          expect(pokemon2.strength).to.be.greaterThan(pokemon2StrengthBefore);
          expect(pokemon1.strength).to.be.lessThan(pokemon1StrengthBefore);
        }
      })

      it("Should reject battle correctly.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        await nft.connect(acc1).requestBattle(1, acc2.address, 2);
        await nft.connect(acc2).rejectBattle(2, 1);
        expect((await nft.pokemon(1)).pendingBattle).to.be.false;
        expect((await nft.pokemon(2)).pendingBattle).to.be.false;
        expect((await nft.pendingBattles(2, 1)).requested).to.be.false;
      })

      it("Should be able to battle correctly after cooldown.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        await nft.connect(acc1).requestBattle(1, acc2.address, 2);
        await nft.connect(acc2).acceptBattle(2, 1);
        await time.increase(600);
        await nft.connect(acc1).requestBattle(1, acc2.address, 2);
        await expect(nft.connect(acc2).acceptBattle(2, 1)).not.to.be.reverted;
      })

      it("Should revert when battle is requested with wrong pokemon ids.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc1).mint();
        await expect(nft.connect(acc2).requestBattle(1, acc1.address, 2)).
        to.be.revertedWith("Please enter pokemons you/your opponent own.");
        await expect(nft.connect(acc1).requestBattle(1, acc2.address, 2)).
        to.be.revertedWith("Please enter pokemons you/your opponent own.");
      })

      it("Should revert when acceptBattle is called by the wrong account.", async () => {
        const { nft, acc1, acc2, owner } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        await nft.connect(acc2).requestBattle(2, acc1.address, 1);
        await expect(nft.connect(owner).acceptBattle(1, 2)).
        to.be.revertedWith("Not your pokemon!");
      })

      it("Should revert when accepting battle that is not pending.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        await expect(nft.connect(acc1).acceptBattle(1, 2)).
        to.be.revertedWith("No such pending battle!");
      })

      it("Should revert when trying to battle while in cooldown.", async () => {
        const { nft, acc1, acc2 } = await loadFixture(deployTokenFixture);
        await nft.connect(acc1).mint();
        await nft.connect(acc2).mint();
        await nft.connect(acc2).requestBattle(2, acc1.address, 1);
        await nft.connect(acc1).acceptBattle(1, 2);
        await nft.connect(acc2).requestBattle(2, acc1.address, 1);
        await expect(nft.connect(acc1).acceptBattle(1, 2)).
        to.be.revertedWith("Pokemons still in cooldown!");
      })      

    })
    
}) 