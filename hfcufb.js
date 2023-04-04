var force = {};
var leaders = [];
var units = [];
var upgrades = [];
var planets = [];
var facilities = [];
var displayText = {};
var factions = ["kushan","taiidan"];
var classOrder = ["super-capital","frigate","corvette","fighter","station","platform"]
var metaClasses = {
    "super-capital" : "capital",
    "frigate" : "capital",
    "station" : "capital",
    "corvette" : "strike-craft",
    "fighter" : "strike-craft",
    "platform" : "strike-craft"
};
var icons = {
    "super-capital" : "▰",
    "frigate" : "◆",
    "station" : "●",
    "corvette":"■",
    "fighter":"▲",
    "platform":"⬣"
};

var indexToLetter = {
    "1" : "A",
    "2" : "B",
    "3" : "C",
    "4" : "D",
    "5" : "E",
    "6" : "F",
    "7" : "G"
}

var unitDropdown, leaderDropdown;
var requiredSlots, optionalSlots, freeSlots, unslottedUnits, freeUnits;
var factionSelection;
var contentCampaign;

function getUrl(url){
	var req = new XMLHttpRequest();
	req.open("GET",url,true);
	return req;
}

function loadURL(url){
	var req = getUrl(url);
	req.send();
	return new Promise(function(resolve, reject) {
		req.onreadystatechange = function() {
			if(req.readyState === 4)
			{
				if(req.status === 200)
				{
					resolve(JSON.parse(req.response));
				}else{
					reject();
				}
			}
		};
	});
}

function newForce() {
    setupForce();
    updateForce();
}

function saveForce() {
    var directory = getSaveDirectory();
    var forceName = document.getElementById("forceName").value + " : " + document.getElementById("forceCost").innerHTML;
    if(directory.indexOf(forceName) < 0){
        directory.push(forceName);
    }
    window.localStorage.setItem('forceDirectory', JSON.stringify(directory));
    window.localStorage.setItem(forceName, JSON.stringify(force));
    console.log("force saved as " + forceName);
}

function loadForce(forceName) {
    force = {};
    forceJson = JSON.parse(window.localStorage.getItem(forceName));
    var forceNameLength = forceName.lastIndexOf(" :");
    document.getElementById("forceName").value = forceName.substring(0,forceNameLength);
    force.units = forceJson.units;
    force.leaders = forceJson.leaders;
    force.faction = forceJson.faction;
    factionSelection.value = force.faction;
    updateForce();
}

function openForceWindow() {
    var forceWindow = document.getElementById("forceWindow");
    forceWindow.classList.remove("hidden")
    var directory = getSaveDirectory();
    var forceList = document.getElementById("forceList");
    forceList.innerHTML = "";
    directory.forEach(function(forceName) {
        var entry = document.createElement("div");
        var name = document.createElement("span");
        name.innerHTML = forceName;
        entry.appendChild(name);
        var load = document.createElement("button");
        load.classList.add("forceWindowButton");
        load.innerHTML = "Load";
        load.onclick = function() {
            loadForce(forceName);
            closeForceWindow();
        }
        entry.appendChild(load);

        var deleteForce = document.createElement("button");
        deleteForce.innerHTML = "Delete";
        deleteForce.onclick = function() {
            window.localStorage.removeItem(forceName);
            directory.splice(directory.indexOf(forceName), 1);
            window.localStorage.setItem('forceDirectory', JSON.stringify(directory));
            forceList.removeChild(entry);
        }
        entry.appendChild(deleteForce);

        forceList.appendChild(entry);
    });
}

function getSaveDirectory() {
    var directory = JSON.parse(window.localStorage.getItem('forceDirectory'));
    if(!directory) {
        directory = [];
    }
    return directory;
}

function closeForceWindow() {
    forceWindow.classList.add("hidden")
}

function addLeader(){
    var newEntry = new LeaderEntry();
    newEntry.leaderId = leaderDropdown.value;
    newEntry.uniqueCode = "" + Date.now()
    force.leaders.push(newEntry);
    updateForce();
}

function addUnit(newUnitId) {
    var newEntry = new UnitEntry();
    newEntry.unitId = newUnitId; 
    force.units.push(newEntry);
    updateForce();
}

function addPlanet(newPlanetId) {
    //TODO: ADD NEW PLANET
}

function updateForce(){
    processSlots();
    renderEntries();
    calculateForceCost();
}

function processSlots() {
    requiredSlots = [];
    optionalSlots = [];
    freeSlots = [];
    unslottedUnits = [];
    freeUnits = [];
    
    //Fill slots lists
    force.leaders.forEach(function(leader) { 
        var leaderData = getLeaderData(leader.leaderId);
        if(leaderData.hasOwnProperty("slots")){
            addSlots(requiredSlots, optionalSlots, freeSlots, leaderData);
        }
    });
    force.units.forEach(function(unit) { 
        var unitData = getUnitData(unit.unitId);
        if(unitData.hasOwnProperty("slots")){
            addSlots(requiredSlots, optionalSlots, freeSlots, unitData);
        }
        if(unit.hasOwnProperty("upgrades")){
            unit.upgrades.forEach(upgrade =>{
                var upgradeData = getUpgradeData(upgrade);
                if(upgradeData.hasOwnProperty("slots")){
                    addSlots(requiredSlots, optionalSlots, freeSlots, upgradeData);
                }
            })
        }
    });
    //TODO: Get Slots from planets and facilities

    //Consume slots lists
    force.units.forEach(function(unit) { 
        var unitData = getUnitData(unit.unitId);
        if(freeSlots.indexOf(unitData.name) >= 0){
            freeSlots.splice(freeSlots.indexOf(unitData.name), 1);
            freeUnits.push(unit);
            return;
        }
        if(freeSlots.indexOf(unitData.class) >= 0){
            freeSlots.splice(freeSlots.indexOf(unitData.class), 1);
            freeUnits.push(unit);
            return;
        }
        if(requiredSlots.indexOf(unitData.name) >= 0){
            requiredSlots.splice(requiredSlots.indexOf(unitData.name), 1);
            return;
        }
        if(requiredSlots.indexOf(unitData.class) >= 0){
            requiredSlots.splice(requiredSlots.indexOf(unitData.class), 1);
            return;
        }
        if(optionalSlots.indexOf(unitData.name) >= 0){
            optionalSlots.splice(optionalSlots.indexOf(unitData.name), 1);
            return;
        }
        if(optionalSlots.indexOf(unitData.class) >= 0){
            optionalSlots.splice(optionalSlots.indexOf(unitData.class), 1);
            return;
        }
        var metaClass = metaClasses[unitData.class];
        if(optionalSlots.indexOf(metaClass) >= 0){
            optionalSlots.splice(optionalSlots.indexOf(metaClass), 1);
            return;
        }
        unslottedUnits.push(unit);
    });
}

function renderEntries(){
    var leaderSection = document.getElementById("unassignedLeaders");
    leaderSection.innerHTML = "";
    force.leaders.forEach(function(leader) { 
        if(leader.assignedUnit == null){
            renderLeader(leader, leaderSection) 
        }
    });

    var unitSection = document.getElementById("units");
    unitSection.innerHTML = "";

    force.units.sort(function compareUnit(a,b){
        var aData = getUnitData(a.unitId);
        var bData = getUnitData(b.unitId);
        checkClass(aData);
        checkClass(bData);

        if(classOrder.indexOf(aData.class) != classOrder.indexOf(bData.class)){
            return classOrder.indexOf(aData.class) - classOrder.indexOf(bData.class);
        }
        if(aData.cost != bData.cost){
            return bData.cost - aData.cost;
        }
        return aData.name.localeCompare(bData.name);
    });

    var classCount = {};

    force.units.forEach(function(unit) { 
        var unitData = getUnitData(unit.unitId);
        var unitCount = 1;
        if(classCount.hasOwnProperty(unitData.class)) {
            unitCount += classCount[unitData.class];
        }
        classCount[unitData.class] = unitCount;
        renderUnit(unit, unitCount, unitSection);
    });

    //TODO: Render planets

    var emptySlotSection = document.getElementById("emptySlots");
    emptySlotSection.innerHTML = "";
    freeSlots.forEach(freeSlot => {
        var emptyFreeSlotSection = document.createElement("div");
        emptyFreeSlotSection.classList.add("emptySlot");
        emptyFreeSlotSection.classList.add("emptyFreeSlot");
        emptyFreeSlotSection.innerHTML = "Free: " + displayText[freeSlot];
        emptySlotSection.appendChild(emptyFreeSlotSection);
    });
    requiredSlots.forEach(requiredSlot => {
        var emptyRequiredSlotSection = document.createElement("div");
        emptyRequiredSlotSection.classList.add("emptySlot");
        emptyRequiredSlotSection.classList.add("emptyRequiredSlot");
        emptyRequiredSlotSection.innerHTML = "⚠ REQUIRED: " + displayText[requiredSlot];
        emptySlotSection.appendChild(emptyRequiredSlotSection);
    });
    optionalSlots.forEach(optionalSlot => {
        var emptyOptionalSlotSection = document.createElement("div");
        emptyOptionalSlotSection.classList.add("emptySlot");
        emptyOptionalSlotSection.classList.add("emptyOptionalSlot");
        emptyOptionalSlotSection.innerHTML = "Optional: " + displayText[optionalSlot];
        emptySlotSection.appendChild(emptyOptionalSlotSection);
    });
}

function addSlots(requiredSlots, optionalSlots, freeSlots, entryData) {
    entryData.slots.forEach(slot => {
        var slotCount = 1;
        if(slot.hasOwnProperty("count")) {
            slotCount = slot.count;
        }
        for(var slotIndex = 0; slotIndex < slotCount; slotIndex++){
            if(slot.purchase == "free"){
                freeSlots.push(slot.class);
            }
            if(slot.purchase == "required"){
                requiredSlots.push(slot.class);
            }
            if(slot.purchase == "optional"){
                optionalSlots.push(slot.class);
            }
        }
    });
}

function renderLeader(leader, leaderSection){
    var leaderContainer = document.createElement("div");
    leaderContainer.classList.add("entry");
    var leaderData = getLeaderData(leader.leaderId);

    var removeButton = document.createElement("button");
    removeButton.classList.add("removeButton");
    removeButton.innerHTML = "Remove Leader";
    removeButton.onclick = function(){

        if(leader.assignedUnit != null){
            if(leaderData.hasOwnProperty("staff")){
                leader.assignedUnit.staff.splice(leader.assignedUnit.staff.indexOf(leader.uniqueCode),1);
                leader.assignedUnit = null;
            } else {
                leader.assignedUnit.commander = null;
            }
        }

        const index = force.leaders.indexOf(leader);
        if(index > -1){
            force.leaders.splice(index, 1);
        }

        updateForce();
    }
    leaderContainer.appendChild(removeButton);

    var leaderNameLabel = document.createElement("h2");
    leaderNameLabel.innerHTML = displayText[leaderData.name];
    leaderContainer.appendChild(leaderNameLabel);

    var leaderCostLabel = document.createElement("label");
    leaderCostLabel.innerHTML = "Cost";
    leaderContainer.appendChild(leaderCostLabel);

    var leaderCostValue = document.createElement("span");
    leaderCostValue.innerHTML = leaderData.cost + "★";
    leaderContainer.appendChild(leaderCostValue);

    var leaderHandLabel = document.createElement("label");
    leaderHandLabel.innerHTML = "Hand";
    leaderContainer.appendChild(leaderHandLabel);

    var leaderHandValue = document.createElement("span");
    leaderHandValue.innerHTML = leaderData.hand;
    leaderContainer.appendChild(leaderHandValue);

    var leaderPlayLabel = document.createElement("label");
    leaderPlayLabel.innerHTML = "Play";
    leaderContainer.appendChild(leaderPlayLabel);

    var leaderPlayValue = document.createElement("span");
    leaderPlayValue.innerHTML = leaderData.play;
    leaderContainer.appendChild(leaderPlayValue);

    leaderSection.appendChild(leaderContainer);
}

function renderUnit(unit, unitCount, unitSection){
    var unitContainer = document.createElement("div");
    unitContainer.classList.add("entry")
    var unitData = getUnitData(unit.unitId);

    var removeButton = document.createElement("button");
    removeButton.classList.add("removeButton");
    removeButton.innerHTML = "Remove Unit";
    removeButton.onclick = function(){

        if(unit.commander != null){
            var currentLeader = force.leaders.find(leader => leader.uniqueCode.localeCompare(unit.commander) == 0);
            currentLeader.assignedUnit = null;
        }

        const index = force.units.indexOf(unit);
        if(index > -1){
            force.units.splice(index, 1);
        }
        updateForce();
    }
    unitContainer.appendChild(removeButton);

    var unitWarningDiv = document.createElement("div");

    var unitNameLabel = document.createElement("h2");
    unitNameLabel.innerHTML = displayText[unitData.name] + " <div class='identifier'><span class='shipIcon-"+unitData.class+"'>" + icons[unitData.class] + "</span><span class='shipIndex-"+unitData.class+"'>" + indexToLetter[unitCount] + "</span></div>";
    unitContainer.appendChild(unitNameLabel);

    var unitCostLabel = document.createElement("label");
    unitCostLabel.innerHTML = "Cost";
    unitContainer.appendChild(unitCostLabel);

    var unitCostValue = document.createElement("span");
    unitCostValue.innerHTML = unitData.cost + "★";
    unitContainer.appendChild(unitCostValue);

    var unitClassLabel = document.createElement("label");
    unitClassLabel.innerHTML = "Class:";
    unitContainer.appendChild(unitClassLabel);

    var unitClassValue = document.createElement("span");
    unitClassValue.innerHTML = displayText[unitData.class];
    unitContainer.appendChild(unitClassValue);

    var commanderSection = document.createElement("div");
    commanderSection.classList.add("commanderSection");

    var unitCommanderLabel = document.createElement("span");
    unitCommanderLabel.innerHTML = "Commander:";
    commanderSection.appendChild(unitCommanderLabel);

    var leaderOptions = document.createElement("SELECT");
    leaderOptions.add(new Option("No Commander", null));
    force.leaders.forEach(function(leader){
        var leaderData = getLeaderData(leader.leaderId);
        if((leader.assignedUnit == null  || unit.commander == leader.uniqueCode)
            && canLeaderBeOn(leaderData, unitData) && !leaderData.hasOwnProperty("staff")){
            var option = new Option(displayText[leaderData.name], leader.uniqueCode);
            leaderOptions.add(option);
        }
    });
    if(unit.commander != null){
        leaderOptions.value = unit.commander;
    }
    leaderOptions.onchange = function(){

        if(unit.commander != null){
            var currentLeader = force.leaders.find(leader => leader.uniqueCode.localeCompare(unit.commander) == 0);
            currentLeader.assignedUnit = null;
        }

        if(leaderOptions.selectedIndex == 0){
            unit.commander = null;
        } else {
            var assignedLeader = force.leaders.find(leader => leader.uniqueCode.localeCompare(leaderOptions.value) == 0);
            unit.commander = assignedLeader.uniqueCode;
            assignedLeader.assignedUnit = unit;
        }
        updateForce();
    }
    commanderSection.appendChild(leaderOptions);

    if(unit.commander != null){
        var unitCommanderDiv = document.createElement("div");
        renderLeader(force.leaders.find(leader => leader.uniqueCode.localeCompare(unit.commander) == 0), unitCommanderDiv);
        commanderSection.appendChild(unitCommanderDiv);
    }

    unitContainer.appendChild(commanderSection);

    if(contentCampaign.checked){

        var unitStaffLabel = document.createElement("span");
        unitStaffLabel.innerHTML = "Staff:";
        commanderSection.appendChild(unitStaffLabel);

        var staffOptions = document.createElement("SELECT");
        var addStaffButton = document.createElement("button");
        staffOptions.add(new Option("- Select a Staff Hero to Add-", null));
        addStaffButton.disabled = "disabled";
        force.leaders.forEach(function(leader){
            addStaffButton.disabled = "enabled";
            var leaderData = getLeaderData(leader.leaderId);
            if((leader.assignedUnit == null)
                && canLeaderBeOn(leaderData, unitData) 
                && leaderData.hasOwnProperty("staff")){
                var option = new Option(displayText[leaderData.name], leader.uniqueCode);
                staffOptions.add(option);
            }
        });
        staffOptions.onchange = function() {
            if(staffOptions.selectedIndex == 0){
                addStaffButton.disabled = true;
            } else {
                addStaffButton.disabled = false;
            }
        }
        commanderSection.appendChild(staffOptions);
        
        
        addStaffButton.innerHTML = "Add Staff";
        addStaffButton.onclick = function(){
            var newStaff = force.leaders.find(leader => leader.uniqueCode.localeCompare(staffOptions.value) == 0);
            if(!unit.hasOwnProperty("staff")){
                unit.staff = [];
            }
            unit.staff.push(newStaff.uniqueCode);
            newStaff.assignedUnit = unit;
            updateForce();
        }
        commanderSection.appendChild(addStaffButton);

        if(unit.hasOwnProperty("staff")){
            unit.staff.forEach(staffId =>{
                var unitStaffDiv = document.createElement("div");
                renderLeader(force.leaders.find(leader => leader.uniqueCode.localeCompare(staffId) == 0), unitStaffDiv);
                commanderSection.appendChild(unitStaffDiv);
            });
            if(unit.staff.length > 0 && unit.commander == null){
                var staffWarningdiv = document.createElement("span");
                staffWarningdiv.innerHTML = "⚠ Staff cannot be assigned unless a Commander is also assigned.";
                unitWarningDiv.appendChild(staffWarningdiv);
            }
        }

        var unitUpgradeDiv = document.createElement("div");
        var unitUpgradeLabel = document.createElement("span");
        unitUpgradeLabel.innerHTML = "Upgrades:";
        unitUpgradeDiv.appendChild(unitUpgradeLabel);
        var upgradeOptions = document.createElement("SELECT");
        var addUpgradeButton = document.createElement("button");
        addUpgradeButton.disabled = "disabled";
        upgradeOptions.add(new Option("- Select an Upgrade to add -", null));
        upgrades.forEach(upgrade => {
            if((!unit.hasOwnProperty("upgrades")
            || unit.upgrades.indexOf(upgrade.name) < 0)
            && (upgrade.restriction.localeCompare(unitData.name) == 0
            || upgrade.restriction.localeCompare(unitData.class) == 0)) {
                var option = new Option(displayText[upgrade.name] + " (" + upgrade.cost + ")", upgrade.name);
                upgradeOptions.add(option);
            }
        });        
        upgradeOptions.onchange = function() {
            if(upgradeOptions.selectedIndex == 0){
                addUpgradeButton.disabled = true;
            } else {
                addUpgradeButton.disabled = false;
            }
        }
        unitUpgradeDiv.appendChild(upgradeOptions);
        
        
        addUpgradeButton.innerHTML = "Add Upgrade";
        addUpgradeButton.onclick = function(){
            if(!unit.hasOwnProperty("upgrades")){
                unit.upgrades = [];
            }
            unit.upgrades.push(upgradeOptions.value);
            updateForce();
        }
        unitUpgradeDiv.appendChild(addUpgradeButton);

        if(unit.hasOwnProperty("upgrades")){
            unit.upgrades.sort(compareUpgrade);
            unit.upgrades.forEach(upgrade => {
                renderUpgrade(upgrade,unitUpgradeDiv, unit);
            })
        }

        unitContainer.appendChild(unitUpgradeDiv);
    }

    if(unslottedUnits.indexOf(unit) >= 0){
        var slotWarningdiv = document.createElement("span");
        slotWarningdiv.innerHTML = "⚠ This Unit is not in any available slot"
        unitWarningDiv.appendChild(slotWarningdiv);
    }

    if(unitData.faction.indexOf(force.faction) < 0){
        var factionWarningdiv = document.createElement("span");
        factionWarningdiv.innerHTML = "⚠ This Unit is not available for the " + force.faction + " faction";
        unitWarningDiv.appendChild(factionWarningdiv);
    }

    unitContainer.appendChild(unitWarningDiv);

    unitSection.appendChild(unitContainer);
}

function renderUpgrade(upgrade, upgradeSection, unit){
    var container = document.createElement("div");
    container.classList.add("entry");
    var upgradeData = getUpgradeData(upgrade);

    var removeButton = document.createElement("button");
    removeButton.classList.add("removeButton");
    removeButton.innerHTML = "Remove Upgrade";
    removeButton.onclick = function(){
        unit.upgrades.splice(unit.upgrades.indexOf(upgrade),1);
        updateForce();
    }
    container.appendChild(removeButton);

    var nameLabel = document.createElement("h3");
    nameLabel.innerHTML = displayText[upgradeData.name];
    container.appendChild(nameLabel);

    var costLabel = document.createElement("label");
    costLabel.innerHTML = "Cost";
    container.appendChild(costLabel);

    var costValue = document.createElement("span");
    costValue.innerHTML = upgradeData.cost + "★";
    container.appendChild(costValue);

    upgradeSection.appendChild(container);``
}

function calculateForceCost(){

    //Both Kushan and Taiidan both have 2-hand 1-play as a base
    var totalHand = 2;
    var totalPlay = 1;

    var totalCost = 0;
    force.leaders.forEach(function(leader) { 
        var leaderData = getLeaderData(leader.leaderId);
        totalCost += leaderData.cost;
        totalHand += leaderData.hand;
        totalPlay += leaderData.play;
     });
    force.units.forEach(function(unit) { 
        if(freeUnits.indexOf(unit) < 0){
            var unitData = getUnitData(unit.unitId);
            totalCost += unitData.cost;
        }
        if(unit.hasOwnProperty("upgrades")){
            unit.upgrades.forEach(upgrade =>{
                var upgradeData = getUpgradeData(upgrade);
                totalCost += upgradeData.cost;
            })
        }
     });
     
     document.getElementById("forceCost").innerHTML = totalCost + "★";
     document.getElementById("totalHand").innerHTML = totalHand;
     document.getElementById("totalPlay").innerHTML = totalPlay;
}

function getLeaderData(leaderId){
    var result = leaders.find(leader => {
        return leader.name.localeCompare(leaderId) == 0;
    });
    if(result == null) {
        alert("No leader data found for id " + leader);
    }
    return result;
}

function getUnitData(unitId){
    var result = units.find(unit => {
        return unit.name.localeCompare(unitId) == 0;
    });
    if(result == null) {
        alert("No unit data found for id " + unitId);
    }
    return result;
}

function getUpgradeData(upgradeId) {
    var result = upgrades.find(upgrade => {
        return upgrade.name.localeCompare(upgradeId) == 0;
    });
    if(result == null) {
        alert("No upgrade data found for id " + upgradeId);
    }
    return result;
}

function canLeaderBeOn(leader, unit){
    var matchingAssingment = leader.classAssignment.find(allowedClass => 
        unit.class.localeCompare(allowedClass) == 0 
        || unit.name.localeCompare(allowedClass) == 0);
    return matchingAssingment != null;
}

function compareUpgrade(a,b){
    var dataA = getUpgradeData(a);
    var dataB = getUpgradeData(b);
    if(dataA.cost != dataB.cost){
        return dataB.cost - dataA.cost;
    }
    return dataA.name.localeCompare(dataB.name);
}

function changeContentSettings(){
    var leaderSection = document.getElementById("addLeaderSection")
    leaderSection.innerHTML = "";
    var unitSection = document.getElementById("addUnitSection")
    unitSection.innerHTML = "";
    setupOptions();
    //TODO: Remove upgrades and staff from units that have them
    updateForce();
}

function validSource(entry) {
    return entry.source == "base"
        || (contentCampaign.checked && entry.source == "campaign");
}

function setupOptions(){

    factionSelection = document.getElementById("factionSelector");
    factions.forEach(faction =>{
        var option = new Option(displayText[faction], faction);
        factionSelection.add(option);
    });
    factionSelection.onchange = function() {
        force.faction = factionSelection.value;
        updateForce();
    }

    var leaderSection = document.getElementById("addLeaderSection")
    var leaderLabel = document.createElement("span");
    leaderLabel.innerHTML = "Leaders:";
    leaderSection.appendChild(leaderLabel);

    leaderDropdown = document.createElement("SELECT");
    leaders.forEach(function(leader){
        if(validSource(leader)) {
            var option = new Option(displayText[leader.name] + " (" + leader.cost + ")", leader.name);
            leaderDropdown.add(option);
        }
    });
    leaderSection.appendChild(leaderDropdown);

    var leaderAddButton = document.createElement("button");
    leaderAddButton.innerHTML = "Add Leader";
    leaderAddButton.onclick = function(){
        addLeader(leaderDropdown);
    }
    leaderSection.appendChild(leaderAddButton);

    var unitSection = document.getElementById("addUnitSection")
    var unitLabel = document.createElement("span");
    unitLabel.innerHTML = "Units:";
    unitSection.appendChild(unitLabel);

    unitDropdown = document.createElement("SELECT");
    units.forEach(function(unit){
        if(validSource(unit)){
            var option = new Option(displayText[unit.name] + " (" + unit.cost + ")", unit.name);
            unitDropdown.add(option);
        }
    });
    unitSection.appendChild(unitDropdown);

    var unitAddButton = document.createElement("button");
    unitAddButton.innerHTML = "Add Unit";
    unitAddButton.onclick = function(){
        addUnit(unitDropdown.value);
    }
    unitSection.appendChild(unitAddButton);

    var planetSection = document.getElementById("addPlanetSection");
    if(!contentCampaign.checked){
        planetSection.classList.add("hidden");
    } else {
        planetSection.classList.remove("hidden")
    }
    var planetLabel = document.createElement("span");
    planetLabel.innerHTML = "Planets:";
    planetSection.appendChild(planetLabel);

    planetDropdown = document.createElement("SELECT");
    planets.forEach(function(planet){
        var option = new Option(displayText[planet.name] + " (" + planet.cost + ")", planet.name);
        planetDropdown.add(option);
    });
    planetSection.appendChild(planetDropdown);

    var planetAddButton = document.createElement("button");
    planetAddButton.innerHTML = "Add Unit";
    planetAddButton.onclick = function(){
        addPlanet(planetDropdown.value);
    }
    planetSection.appendChild(planetAddButton);
}

function setupForce(){
    force.faction = factionSelection.value;
    force.leaders = [];
    force.units = [];
}

function shipsLoaded(json){
	units = json;
    units.sort(function compareShip(a,b){
        checkClass(a);
        checkClass(b);

        if(classOrder.indexOf(a.class) != classOrder.indexOf(b.class)){
            return classOrder.indexOf(a.class) - classOrder.indexOf(b.class);
        }
        if(a.cost != b.cost){
            return b.cost - a.cost;
        }
        return a.name.localeCompare(b.name);
    });
}

function checkClass(ship){
    if(classOrder.indexOf(ship.class) < 0){
        console.log("No ship class ranked for " + ship.class + "of unit " + ship.name);
    }
}

function leadersLoaded(json){
	leaders = json;
    leaders.sort(function compareleader(a,b){
        if(a.cost != b.cost){
            return b.cost - a.cost;
        }
        return a.name.localeCompare(b.name);
    });
}

function upgradesLoaded(json){
	upgrades = json;
}

function planetsLoaded(json){
    planets = json;
}

function facilitiesLoaded(json){
    facilities = json;
}

function displayTextLoaded(json){
    displayText = json;
}

function initialize()
{
    contentCampaign = document.getElementById("content-campaign");
    contentCampaign.addEventListener("click", changeContentSettings);
    contentCampaign.checked = true;

    var shipsLoadPromise = loadURL("data/ships.json");
	shipsLoadPromise.then(shipsLoaded);
	shipsLoadPromise.catch(function(){alert("ships data load failed");});

    var leadersLoadPromise = loadURL("data/leaders.json");
	leadersLoadPromise.then(leadersLoaded);
	leadersLoadPromise.catch(function(){alert("leaders data load failed");});

    var upgradesLoadPromise = loadURL("data/upgrades.json");
	upgradesLoadPromise.then(upgradesLoaded);
	upgradesLoadPromise.catch(function(){alert("upgrades data load failed");});

    var planetsLoadPromise = loadURL("data/planets.json");
	planetsLoadPromise.then(planetsLoaded);
	planetsLoadPromise.catch(function(){alert("planets data load failed");});

    var facilitiesLoadPromise = loadURL("data/facilities.json");
	facilitiesLoadPromise.then(facilitiesLoaded);
	facilitiesLoadPromise.catch(function(){alert("facilities data load failed");});

    var displayTextPromise = loadURL("data/displayText.json");
    displayTextPromise.then(displayTextLoaded);
	displayTextPromise.catch(function(){alert("display text data load failed");});

    Promise.all([shipsLoadPromise, leadersLoadPromise, upgradesLoadPromise, planetsLoadPromise, facilitiesLoadPromise, displayTextPromise]).then(_ => {
        setupOptions();
        setupForce();
        calculateForceCost();
    });
}

class UnitEntry {
    unitId = "";
    commander = null;
    staff = [];
    upgrades = [];
}

class LeaderEntry{
    leaderId = "";
    assignedUnit = null;
    uniqueCode = "";
}