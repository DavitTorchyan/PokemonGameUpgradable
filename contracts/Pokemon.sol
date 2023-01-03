// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Pokemon is IERC721, Ownable, Pausable {

    string public name;
    string public symbol;
    uint256 public totalSupply;   //totalSupply is also the id
    uint256 private randNonce; 

    struct PokemonData {
        uint256 id;
        string dna;
        string name;
        uint256 age;
        uint256 birthTime;
        uint256 lastBattleTime;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 strength;
        bool pendingBattle;
        uint256 lastTrainingTime;
        bool inABattle;
    }

    struct BattleRequest {
        bool requested;
        uint256 requestTime;
    }

    event BattleStarted(address indexed opponent1, address indexed opponent2, uint256 pokemon1Id, uint256 pokemon2Id, uint256 startTime);
    event BattleEnded(address indexed winner, address indexed loser, uint256 winnerPokemonId, uint256 loserPokemonId, uint256 endTime);

    // tokenId => PokemonData
    mapping(uint256 => PokemonData) private pokemons;
    mapping(uint256 => mapping(uint256 => BattleRequest)) public pendingBattles;
    mapping(address => uint256) private balances;
    mapping(uint256 => address) private ownerOfPokemon;
    mapping(address => mapping(address => mapping(uint256 => bool))) private allowances;

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
        totalSupply = 0;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    function ownerOf(uint256 _tokenId) external view returns (address) {
        return ownerOfPokemon[_tokenId];
    }

    function allowance(address _owner, address _approved, uint256 _tokenId) public view returns (bool) {
        return allowances[_owner][_approved][_tokenId];
    }

    function pokemon(uint256 id) public view returns(PokemonData memory) {
        return(pokemons[id]);
    }

    function mint() external whenNotPaused {
        require(balanceOf(msg.sender) < 2, "You can only mint two pokemons!");
        
        totalSupply += 1;
        ownerOfPokemon[totalSupply] = msg.sender;
        balances[msg.sender] += 1;                                                  
        pokemons[totalSupply] = PokemonData({
        id: totalSupply, dna: _randomDna(), name: name, age: 0,
        birthTime: block.timestamp, lastBattleTime: 0, totalWins: 0, totalLosses: 0,
        strength: _randomStrength(), pendingBattle: false, lastTrainingTime: 0, inABattle: false
        });

        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address _to, uint256 _tokenId) external whenNotPaused {
        require(ownerOfPokemon[_tokenId] == msg.sender, "Not your Pokemon!");

        ownerOfPokemon[_tokenId] = _to;
        balances[msg.sender] -= 1;
        balances[_to] += 1;

        emit Transfer(msg.sender, _to, _tokenId);
    }

    function approve(address _approved, uint256 _tokenId) external whenNotPaused {
        require(ownerOfPokemon[_tokenId] == msg.sender, "Not your Pokemon!");

        if (allowances[msg.sender][_approved][_tokenId] == true) {
            allowances[msg.sender][_approved][_tokenId] = false; //calling approve on an already approved token disapproves it
        } else {
            allowances[msg.sender][_approved][_tokenId] = true;
            emit Approval(msg.sender, _approved, _tokenId);
        }
    }

    function transferFrom(address _owner, address _recepient, uint256 _tokenId) external whenNotPaused {
        require(allowances[_owner][msg.sender][_tokenId] == true, "NFT not approved!");

        ownerOfPokemon[_tokenId] = _recepient;
        balances[_owner] -= 1;
        balances[_recepient] += 1;

        emit Transfer(_owner, _recepient, _tokenId);
    }

    function _randomDna() private returns(string memory) {
        uint256 maxNumber = 16;
        uint256 minNumber = 1;
        string memory hat = Strings.toString(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % (maxNumber-minNumber));
        bytes memory hat_ = bytes(hat);
        if(hat_.length < 2) {hat = string(abi.encodePacked("0", hat));}
        randNonce++;
        string memory head = Strings.toString(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % (maxNumber-minNumber));
        bytes memory head_ = bytes(head);
        if(head_.length < 2) {head = string(abi.encodePacked("0", head));}
        randNonce++;
        string memory body = Strings.toString(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % (maxNumber-minNumber));
        bytes memory body_ = bytes(body);
        if(body_.length < 2) {body = string(abi.encodePacked("0", body));}
        randNonce++;
        string memory legs = Strings.toString(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % (maxNumber-minNumber));
        bytes memory legs_ = bytes(legs);
        if(legs_.length < 2) {legs = string(abi.encodePacked("0", legs));}
        string memory randDna = string(abi.encodePacked(hat, head, body, legs));

        return(randDna);
    }

    function _randomStrength() private view returns (uint256 amount) {
        uint256 maxNumber = 400;
        uint256 minNumber = 100;
        amount = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.number))) % (maxNumber-minNumber);
        amount += minNumber;

        return amount;
    }

    function requestBattle(uint256 ownId, address opponent, uint256 oppId) external whenNotPaused {
        require(ownerOfPokemon[ownId] == msg.sender && ownerOfPokemon[oppId] == opponent, "Please enter pokemons you/your opponent own.");
        require(block.timestamp - pokemons[ownId].lastTrainingTime >= 1 days && block.timestamp - pokemons[oppId].lastTrainingTime >= 1 days,
        "Can not request battle while in training cooldown!");
        pendingBattles[ownId][oppId] = BattleRequest({requested: true, requestTime: block.timestamp});
        pokemons[ownId].pendingBattle = true;
        pokemons[oppId].pendingBattle = true;
    }

    function acceptBattle(uint256 ownId, uint256 oppId) external whenNotPaused {
        require(ownerOfPokemon[ownId] == msg.sender, "Not your pokemon!");
        require(pokemons[ownId].inABattle != true && pokemons[oppId].inABattle != true, "Pokemons currently in a battle!");
        if(block.timestamp - pendingBattles[oppId][ownId].requestTime >= 1 days) {
            pendingBattles[oppId][ownId].requested = false;
            pokemons[ownId].pendingBattle = false;
            pokemons[oppId].pendingBattle = false;
            }
        require(pendingBattles[oppId][ownId].requested == true, "No such pending battle!");
        battle(ownId, oppId, ownerOfPokemon[oppId]);
    }

    function rejectBattle(uint256 ownId, uint256 oppId) external whenNotPaused {
        require(ownerOfPokemon[ownId] == msg.sender, "Not your pokemon!");
        require(pendingBattles[oppId][ownId].requested == true, "No such pending battle!");
        pendingBattles[oppId][ownId].requested = false;
        pokemons[ownId].pendingBattle = false;
        pokemons[oppId].pendingBattle = false;
    }

    function battle(uint256 ownId, uint256 oppId, address opponent) private whenNotPaused {
        require(ownerOfPokemon[oppId] == opponent, "Opponent does'nt own that pokemon!");
        require(block.timestamp - pokemons[ownId].lastBattleTime >= 600 &&
        block.timestamp - pokemons[oppId].lastBattleTime >= 600, "Pokemons still in cooldown!"
        );

        PokemonData storage pokemon1 = pokemons[oppId];
        PokemonData storage pokemon2 = pokemons[ownId];
        pokemon1.lastBattleTime = block.timestamp;
        pokemon2.lastBattleTime = block.timestamp;
        pokemon1.inABattle = true;
        pokemon2.inABattle = true;
        emit BattleStarted(msg.sender, opponent, ownId, oppId, block.timestamp);
        uint256 combinedStrength = pokemon1.strength + pokemon2.strength;
        uint256 pokemon1WinProb = pokemon1.strength * 100 / combinedStrength;
        uint256 pokemon2WinProb = 100 - pokemon1WinProb;
        randNonce++;
        uint256 winningNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % (100 - 1);

        if(winningNumber <= pokemon1WinProb) {
            pokemon1.totalWins += 1;
            pokemon1.strength += pokemon1WinProb;   
            if(pokemon1.strength > 1500) {pokemon1.strength = 1500;}
            pokemon2.totalLosses += 1;
            pokemon2.strength -= pokemon2WinProb / 2;
            emit BattleEnded(msg.sender, opponent, ownId, oppId, block.timestamp);

        } else {
            pokemon2.totalWins += 1;
            pokemon2.strength += pokemon2WinProb;
            if(pokemon2.strength > 1500) {pokemon2.strength = 1500;}
            pokemon1.totalLosses += 1;
            pokemon1.strength -= pokemon1WinProb / 2;
            emit BattleEnded(opponent, msg.sender, oppId, ownId, block.timestamp);
        }
        
        pokemon1.inABattle = false;
        pokemon2.inABattle = false;
    }

    function trainPokemon(uint256 id) external whenNotPaused {
        require(ownerOfPokemon[id] == msg.sender, "Not your pokemon!");
        require(pokemons[id].strength < 100, "Pokemon doesn't need training yet!");
        require(pokemons[id].inABattle != true, "Can not train during a battle!");
        require(pokemons[id].pendingBattle != true, "Can not train while having a pending battle!");
        pokemons[id].strength = 100;
        pokemons[id].lastTrainingTime = block.timestamp;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external view override returns (bool) {}

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external override {}

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external override {}

    function setApprovalForAll(
        address operator,
        bool _approved
    ) external override {}

    function getApproved(
        uint256 tokenId
    ) external view override returns (address operator) {}

    function isApprovedForAll(
        address owner,
        address operator
    ) external view override returns (bool) {}
}
