// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AdFirewall} from "../src/AdFirewall.sol";

contract DeployScript is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        AdFirewall firewall = new AdFirewall();
        console.log("AdFirewall deployed to:", address(firewall));

        vm.stopBroadcast();
    }
}
