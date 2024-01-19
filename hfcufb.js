var force = {};
var leaders = [];
var units = [];
var upgrades = [];
var planets = [];
var facilities = [];
var displayText = {};
var factions = ["kushan","taiidan"];
var factionsScoutBox = ["kadesh", "turanic-raiders"];
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
var contentScout;

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
    if(forceJson.hasOwnProperty("planets")){
        force.planets = forceJson.planets;
    }
    force.faction = forceJson.faction;
    factionSelection.value = force.faction;
    contentCampaign.checked = forceJson.useCampaign;
    contentScout.checked = forceJson.useScout;
    setupOptions();
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
    var newEntry = new PlanetEntry();
    newEntry.planetId = newPlanetId;
    if(!force.hasOwnProperty("planets")){
        force.planets = [];
    }
    force.planets.push(newEntry);
    updateForce();
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
    if(force.hasOwnProperty("planets")){
    force.planets.forEach(planet => {
            var planetData = getPlanetData(planet.planetId);
            if(planetData.hasOwnProperty("slots")){
                addSlots(requiredSlots, optionalSlots, freeSlots, planetData);
            }
            if(planet.hasOwnProperty("facilities")){
                planet.facilities.forEach(facility =>{
                    var facilityData = getFacilityData(facility);
                    if(facilityData.hasOwnProperty("slots")){
                        addSlots(requiredSlots, optionalSlots, freeSlots, facilityData);
                    }
                })
            }
        });
    }

    //Consume slots lists
    while(freeSlots.indexOf('facility') >= 0){
        freeSlots.splice(freeSlots.indexOf('facility'), 1);
    }
    while(requiredSlots.indexOf('facility') >= 0){
        requiredSlots.splice(requiredSlots.indexOf('facility'), 1);
    }
    while(optionalSlots.indexOf('facility') >= 0){
        optionalSlots.splice(optionalSlots.indexOf('facility'), 1);
    }

    force.units.forEach(function(unit) { 
        var unitData = getUnitData(unit.unitId);
        var metaClass = metaClasses[unitData.class];
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
        if(freeSlots.indexOf(metaClass) >= 0){
            freeSlots.splice(freeSlots.indexOf(metaClass), 1);
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
        if(requiredSlots.indexOf(metaClass) >= 0){
            requiredSlots.splice(requiredSlots.indexOf(metaClass), 1);
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

    if(force.hasOwnProperty("planets")){
        force.planets.forEach(function(planet){
            renderPlanet(planet, unitSection);
        });
    }

    var emptySlotSection = document.getElementById("emptySlots");
    emptySlotSection.innerHTML = "";
    renderEmptySlots(freeSlots, requiredSlots, optionalSlots, emptySlotSection);
}

function renderEmptySlots(free, required, optional, emptySlotSection) {
    free.forEach(freeSlot => {
        var emptyFreeSlotSection = document.createElement("div");
        emptyFreeSlotSection.classList.add("emptySlot");
        emptyFreeSlotSection.classList.add("emptyFreeSlot");
        emptyFreeSlotSection.innerHTML = "Free: " + displayText[freeSlot];
        emptySlotSection.appendChild(emptyFreeSlotSection);
    });
    required.forEach(requiredSlot => {
        var emptyRequiredSlotSection = document.createElement("div");
        emptyRequiredSlotSection.classList.add("emptySlot");
        emptyRequiredSlotSection.classList.add("emptyRequiredSlot");
        emptyRequiredSlotSection.innerHTML = "⚠ REQUIRED: " + displayText[requiredSlot];
        emptySlotSection.appendChild(emptyRequiredSlotSection);
    });
    optional.forEach(optionalSlot => {
        var emptyOptionalSlotSection = document.createElement("div");
        emptyOptionalSlotSection.classList.add("emptySlot");
        emptyOptionalSlotSection.classList.add("emptyOptionalSlot");
        emptyOptionalSlotSection.innerHTML = "Optional: " + displayText[optionalSlot];
        emptySlotSection.appendChild(emptyOptionalSlotSection);
    });
}

function addSlots(required, optional, free, entryData) {
    entryData.slots.forEach(slot => {
        var slotCount = 1;
        if(slot.hasOwnProperty("count")) {
            slotCount = slot.count;
        }
        for(var slotIndex = 0; slotIndex < slotCount; slotIndex++){
            if(slot.purchase == "free"){
                free.push(slot.class);
            }
            if(slot.purchase == "required"){
                required.push(slot.class);
            }
            if(slot.purchase == "optional"){
                optional.push(slot.class);
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
        removeLeader(leader);
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

    if(leaderData.hasOwnProperty("medals")){
        var medalValue = document.createElement("span");
        medalValue.innerHTML = leaderData.medals + "🥇";
        leaderContainer.appendChild(medalValue);
    }

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

function removeLeader(leader) {
    var leaderData = getLeaderData(leader.leaderId);
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
}

function removePlanet(planet){
    const index = force.planets.indexOf(planet);
    if(index > -1){
        force.planets.splice(index, 1);
    }
}

function renderUnit(unit, unitCount, unitSection){
    var unitContainer = document.createElement("div");
    unitContainer.classList.add("entry")
    var unitData = getUnitData(unit.unitId);

    var removeButton = document.createElement("button");
    removeButton.classList.add("removeButton");
    removeButton.innerHTML = "Remove Unit";
    removeButton.onclick = function(){
        removeUnit(unit);
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
    unitCommanderLabel.innerHTML = "Leader:";
    commanderSection.appendChild(unitCommanderLabel);

    var leaderOptions = document.createElement("SELECT");
    leaderOptions.add(new Option("No Leader", null));
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
                staffWarningdiv.innerHTML = "⚠ Staff cannot be assigned unless a Leader is also assigned.";
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
            && upgrade.faction.indexOf(force.faction) >= 0
            && (upgrade.classAssignment.indexOf(unitData.name) >= 0
            || upgrade.classAssignment.indexOf(unitData.class) >= 0
            || upgrade.classAssignment.indexOf(metaClasses[unitData.class]) >= 0)) {
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
                renderUpgrade(upgrade,unitUpgradeDiv, unit, unitWarningDiv);
            })
        }

        unitContainer.appendChild(unitUpgradeDiv);
    }

    var reservesLabel = document.createElement("label");
    reservesLabel.innerHTML = "Unit In Reserve:";
    unitContainer.appendChild(reservesLabel);

    var reservesCheckbox = document.createElement("input");
    reservesCheckbox.setAttribute("type", "checkbox");
    reservesCheckbox.checked = unit.hasOwnProperty("reserve");
    reservesCheckbox.addEventListener("click", () => {
        if(unit.hasOwnProperty("reserve")){
            delete(unit.reserve);
        } else{
            unit.reserve = "true";
        }
        updateForce();
    });
    unitContainer.appendChild(reservesCheckbox);

    if(unslottedUnits.indexOf(unit) >= 0){
        var slotWarningdiv = document.createElement("span");
        slotWarningdiv.innerHTML = "⚠ There is no Unit Tab available for this unit."
        unitWarningDiv.appendChild(slotWarningdiv);
    }

    if(unitData.faction.indexOf(force.faction) < 0){
        var factionWarningdiv = document.createElement("span");
        factionWarningdiv.innerHTML = "⚠ This Unit is not available for the " + displayText[force.faction] + " faction";
        unitWarningDiv.appendChild(factionWarningdiv);
    }

    unitContainer.appendChild(unitWarningDiv);

    unitSection.appendChild(unitContainer);
}

function removeUnit(unit) {
    if(unit.commander != null){
        var currentLeader = force.leaders.find(leader => leader.uniqueCode.localeCompare(unit.commander) == 0);
        currentLeader.assignedUnit = null;
    }

    const index = force.units.indexOf(unit);
    if(index > -1){
        force.units.splice(index, 1);
    }
}

function renderUpgrade(upgrade, upgradeSection, unit, warningDiv){
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

    if(upgradeData.hasOwnProperty("medals")){
        var medalValue = document.createElement("span");
        medalValue.innerHTML = upgradeData.medals + "🥇";
        container.appendChild(medalValue);
    }

    upgradeSection.appendChild(container);

    if(upgradeData.faction.indexOf(force.faction) < 0){
        var factionWarningdiv = document.createElement("span");
        factionWarningdiv.innerHTML = "⚠ Upgrade " + displayText[upgradeData.name] + " is not allowed in the " + displayText[force.faction] + " faction";
        warningDiv.appendChild(factionWarningdiv);
    }
}

function renderPlanet(planet, section) {
    var planetContainer = document.createElement("div");
    planetContainer.classList.add("entry")
    var planetData = getPlanetData(planet.planetId);

    var removeButton = document.createElement("button");
    removeButton.classList.add("removeButton");
    removeButton.innerHTML = "Remove Planet";
    removeButton.onclick = function(){

        if(planet.commander != null){
            var currentLeader = force.leaders.find(leader => leader.uniqueCode.localeCompare(planet.commander) == 0);
            currentLeader.assignedUnit = null;
        }

        const index = force.planets.indexOf(planet);
        if(index > -1){
            force.planets.splice(index, 1);
        }
        updateForce();
    }
    planetContainer.appendChild(removeButton);

    var planetWarningDiv = document.createElement("div");

    var planetNameLabel = document.createElement("h2");
    planetNameLabel.innerHTML = displayText[planetData.name] + " <div class='identifier'><span class='shipIcon-planet'>" + icons["station"] + "</span></div>";
    planetContainer.appendChild(planetNameLabel);

    var planetCostLabel = document.createElement("label");
    planetCostLabel.innerHTML = "Cost";
    planetContainer.appendChild(planetCostLabel);

    var planetCostValue = document.createElement("span");
    planetCostValue.innerHTML = planetData.cost + "★";
    planetContainer.appendChild(planetCostValue);

    var planetClassLabel = document.createElement("label");
    planetClassLabel.innerHTML = "Class:";
    planetContainer.appendChild(planetClassLabel);

    var planetClassValue = document.createElement("span");
    planetClassValue.innerHTML = "Planet";
    planetContainer.appendChild(planetClassValue);

    if(force.useCampaign) {
        var commanderSection = document.createElement("div");
        commanderSection.classList.add("commanderSection");

        var planetCommanderLabel = document.createElement("span");
        planetCommanderLabel.innerHTML = "Commander:";
        commanderSection.appendChild(planetCommanderLabel);

        var leaderOptions = document.createElement("SELECT");
        leaderOptions.add(new Option("No Commander", null));
        force.leaders.forEach(function(leader){
            var leaderData = getLeaderData(leader.leaderId);
            if((leader.assignedUnit == null  || planet.commander == leader.uniqueCode)
                && canLeaderBeOn(leaderData, planetData) && !leaderData.hasOwnProperty("staff")){
                var option = new Option(displayText[leaderData.name], leader.uniqueCode);
                leaderOptions.add(option);
            }
        });
        if(planet.commander != null){
            leaderOptions.value = planet.commander;
        }
        leaderOptions.onchange = function(){

            if(planet.commander != null){
                var currentLeader = force.leaders.find(leader => leader.uniqueCode.localeCompare(planet.commander) == 0);
                currentLeader.assignedUnit = null;
            }

            if(leaderOptions.selectedIndex == 0){
                planet.commander = null;
            } else {
                var assignedLeader = force.leaders.find(leader => leader.uniqueCode.localeCompare(leaderOptions.value) == 0);
                planet.commander = assignedLeader.uniqueCode;
                assignedLeader.assignedUnit = planet;
            }
            updateForce();
        }
        commanderSection.appendChild(leaderOptions);

        if(planet.commander != null){
            var planetCommanderDiv = document.createElement("div");
            renderLeader(force.leaders.find(leader => leader.uniqueCode.localeCompare(planet.commander) == 0), planetCommanderDiv);
            commanderSection.appendChild(planetCommanderDiv);
        }

        planetContainer.appendChild(commanderSection);

        var planetStaffLabel = document.createElement("span");
        planetStaffLabel.innerHTML = "Staff:";
        commanderSection.appendChild(planetStaffLabel);

        var staffOptions = document.createElement("SELECT");
        var addStaffButton = document.createElement("button");
        staffOptions.add(new Option("- Select a Staff Hero to Add-", null));
        addStaffButton.disabled = "disabled";
        force.leaders.forEach(function(leader){
            addStaffButton.disabled = "enabled";
            var leaderData = getLeaderData(leader.leaderId);
            if((leader.assignedUnit == null)
                && canLeaderBeOn(leaderData, planetData) 
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
            if(!planet.hasOwnProperty("staff")){
                planet.staff = [];
            }
            planet.staff.push(newStaff.uniqueCode);
            newStaff.assignedUnit = planet;
            updateForce();
        }
        commanderSection.appendChild(addStaffButton);

        if(planet.hasOwnProperty("staff")){
            planet.staff.forEach(staffId =>{
                var planetStaffDiv = document.createElement("div");
                renderLeader(force.leaders.find(leader => leader.uniqueCode.localeCompare(staffId) == 0), planetStaffDiv);
                commanderSection.appendChild(planetStaffDiv);
            });
            if(planet.staff.length > 0 && planet.commander == null){
                var staffWarningdiv = document.createElement("span");
                staffWarningdiv.innerHTML = "⚠ Staff cannot be assigned unless a Commander is also assigned.";
                planetWarningDiv.appendChild(staffWarningdiv);
            }
        }
    }

    var planetRequiredSlots = [];
    var planetOptionalSlots = [];
    var planetFreeSlots = []

    addSlots(planetRequiredSlots, planetOptionalSlots, planetFreeSlots, planetData);

    planet.facilities.forEach(facility => { 
        if(planetFreeSlots.length > 0){
            planetFreeSlots.splice(0, 1);
            return;
        }
        if(planetRequiredSlots.length > 0){
            planetRequiredSlots.splice(0, 1);
            return;
        }
        if(planetOptionalSlots.length > 0){
            planetOptionalSlots.splice(0, 1);
            return;
        }
        console.log("Could not remove facility " + facility + " from Free:[" + planetFreeSlots + "] Required:[" + planetRequiredSlots + "] Optional:[" + planetOptionalSlots +"]");
    });

    //We only need to show slots for this specific planet. Units are covered by the force as a whole
    classOrder.forEach(shipClass => {
        while(planetFreeSlots.indexOf(shipClass) >= 0){
            planetFreeSlots.splice(planetFreeSlots.indexOf(shipClass), 1);
        }
        while(planetRequiredSlots.indexOf(shipClass) >= 0){
            planetRequiredSlots.splice(planetRequiredSlots.indexOf(shipClass), 1);
        }
        while(planetOptionalSlots.indexOf(shipClass) >= 0){
            planetOptionalSlots.splice(planetOptionalSlots.indexOf(shipClass), 1);
        }
    });

    var planetfacilityDiv = document.createElement("div");
    var planetfacilityLabel = document.createElement("span");
    planetfacilityLabel.innerHTML = "Facilities:";
    planetfacilityDiv.appendChild(planetfacilityLabel);
    var facilityOptions = document.createElement("SELECT");
    var addfacilityButton = document.createElement("button");
    addfacilityButton.disabled = "disabled";
    facilityOptions.add(new Option("- Select a Facility to add -", null));
    if(planetFreeSlots.length > 0 || planetRequiredSlots.length > 0 || planetOptionalSlots.length > 0){
        facilities.forEach(facility => {
            if(validSource(facility)){
                if(!planet.hasOwnProperty("facilities")) {
                    var option = new Option(displayText[facility.name] + " (" + facility.cost + ")", facility.name);
                    facilityOptions.add(option);
                } else {
                    var currentCount = 0;
                    planet.facilities.forEach(localFacility => {
                        if(localFacility.localeCompare(facility.name) == 0) {
                            currentCount++;
                        }
                    });
                    if(currentCount < facility.max) {
                        var option = new Option(displayText[facility.name] + " (" + facility.cost + ")", facility.name);
                        facilityOptions.add(option);
                    }
                }
            }
        });
}
    facilityOptions.onchange = function() {
        if(facilityOptions.selectedIndex == 0){
            addfacilityButton.disabled = true;
        } else {
            addfacilityButton.disabled = false;
        }
    }
    planetfacilityDiv.appendChild(facilityOptions);

    addfacilityButton.innerHTML = "Add facility";
    addfacilityButton.onclick = function(){
        if(!planet.hasOwnProperty("facilities")){
            planet.facilities = [];
        }
        planet.facilities.push(facilityOptions.value);
        updateForce();
    }
    planetfacilityDiv.appendChild(addfacilityButton);

    planetContainer.appendChild(planetfacilityDiv);

    if(planet.hasOwnProperty("facilities")){
        planet.facilities.sort(compareFacility);
        planet.facilities.forEach(facility => {
            renderFacility(facility,planetfacilityDiv, planet);
        })
    }

    var emptySlotSection = document.createElement("div");
    renderEmptySlots(planetFreeSlots, planetRequiredSlots, planetOptionalSlots, emptySlotSection);

    planetContainer.appendChild(emptySlotSection);

    section.appendChild(planetContainer);
}

function renderFacility(facility,facilitySection, planet) {
    var container = document.createElement("div");
    container.classList.add("entry");
    var facilityData = getFacilityData(facility);

    var removeButton = document.createElement("button");
    removeButton.classList.add("removeButton");
    removeButton.innerHTML = "Remove Facility";
    removeButton.onclick = function(){
        planet.facilities.splice(planet.facilities.indexOf(facility),1);
        updateForce();
    }
    container.appendChild(removeButton);

    var nameLabel = document.createElement("h3");
    nameLabel.innerHTML = displayText[facilityData.name];
    container.appendChild(nameLabel);

    var costLabel = document.createElement("label");
    costLabel.innerHTML = "Cost";
    container.appendChild(costLabel);

    var costValue = document.createElement("span");
    costValue.innerHTML = facilityData.cost + "★";
    container.appendChild(costValue);

    facilitySection.appendChild(container);
}

function calculateForceCost(){

    // All factions (Kushan, Taiidan, Kadesh, Turanic Raiders) have 2-hand 1-play as a base
    var totalHand = 2;
    var totalPlay = 1;

    var totalCost = 0;
    var mainCost = 0;
    var reserveCost = 0;
    var totalMedals = 0;
    force.leaders.forEach(function(leader) { 
        var leaderData = getLeaderData(leader.leaderId);
        totalCost += leaderData.cost;
        totalHand += leaderData.hand;
        totalPlay += leaderData.play;
        if(leader.assignedUnit != null){
            if(leader.assignedUnit.hasOwnProperty("reserve")){
                reserveCost += leaderData.cost;
            } else{
                mainCost += leaderData.cost;
            }
        }
        if(leaderData.hasOwnProperty("medals")){
            totalMedals += leaderData.medals;
        }
     });
    
    force.units.forEach(function(unit) { 
        if(freeUnits.indexOf(unit) < 0){
            var unitData = getUnitData(unit.unitId);
            totalCost += unitData.cost;

            // Kadesh Mothership and Fuel Pod have Hand & Play values
            if(unitData.hasOwnProperty("hand")){
                totalHand += unitData.hand;
            }
            if(unitData.hasOwnProperty("play")){
                totalPlay += unitData.play;
            }

            if(unit.hasOwnProperty("reserve")){
                reserveCost += unitData.cost;
            } else {
                mainCost += unitData.cost;
            }
        }

        if(unit.hasOwnProperty("upgrades")){
            unit.upgrades.forEach(upgrade =>{
                var upgradeData = getUpgradeData(upgrade);
                totalCost += upgradeData.cost;

                if(unit.hasOwnProperty("reserve")){
                    reserveCost += upgradeData.cost;
                } else {
                    mainCost += upgradeData.cost;
                }

                if(upgradeData.hasOwnProperty("medals")){
                    totalMedals += upgradeData.medals;
                }
            })
        }
     });

     if(force.hasOwnProperty("planets")){
        force.planets.forEach(planet => {
            var planetData = getPlanetData(planet.planetId);
            totalCost += planetData.cost;
            mainCost += planetData.cost; //Assuming here that planets won't be able to come in from reserve...
            if(planet.hasOwnProperty("facilities")){
                planet.facilities.forEach(facility => {
                    var facilityData = getFacilityData(facility);
                    totalCost += facilityData.cost;
                    mainCost += facilityData.cost;
                });
            }
        });
     }
     
     document.getElementById("forceCost").innerHTML = totalCost + "★";
     if(force.useCampaign){
        document.getElementById("medalCost").innerHTML = totalMedals + "🥇";
        document.getElementById("medalCost").classList.remove("hidden");
     } else{
        document.getElementById("medalCost").innerHTML = "";
        document.getElementById("medalCost").classList.add("hidden");
     }
     document.getElementById("totalHand").innerHTML = totalHand;
     document.getElementById("totalPlay").innerHTML = totalPlay;
     document.getElementById("mainForceCost").innerHTML = mainCost + "★";
     document.getElementById("reservesCost").innerHTML = reserveCost + "★";
}

function getLeaderData(leaderId){
    return getData(leaderId, leaders);
}

function getUnitData(unitId){
    return getData(unitId, units);
}

function getUpgradeData(upgradeId) {
    return getData(upgradeId, upgrades);
}

function getPlanetData(planetId) {
    return getData(planetId, planets);
}

function getFacilityData(facilityId) {
    return getData(facilityId, facilities);
}

function getData(key, collection){
    var result = collection.find(entry => {
        return entry.name.localeCompare(key) == 0;
    });
    if(result == null) {
        alert("No upgrade data found for id " + key);
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

function compareFacility(a,b) {
    var dataA = getFacilityData(a);
    var dataB = getFacilityData(b);
    return compareFacilities(dataA, dataB);
}

function compareFacilities(dataA,dataB){
    if(dataA.cost != dataB.cost){
        return dataB.cost - dataA.cost;
    }
    if(dataA.max != dataB.max){
        return dataB.max - dataA.max;
    }
    return dataA.name.localeCompare(dataB.name);
}

function changeContentSettings(){
    force.useCampaign = contentCampaign.checked;
    force.useScout = contentScout.checked;
    var leaderSection = document.getElementById("addLeaderSection")
    leaderSection.innerHTML = "";
    var unitSection = document.getElementById("addUnitSection")
    unitSection.innerHTML = "";
    var planetSection = document.getElementById("addPlanetSection")
    planetSection.innerHTML = "";
    setupOptions();
    
    force.leaders.forEach(leader => {
        var leaderData = getLeaderData(leader.leaderId);
        if(!validSource(leaderData)){
            removeLeader(leader);
        }
    });
    force.units.forEach(unit => {
        var unitData = getUnitData(unit.unitId);
        if(!validSource(unitData)){
            removeUnit(unit);
        } 
        if(!force.useCampaign){ //Only source of upgrades is from the campaign
            delete(unit.upgrades);
        }
    })

    force.planets.forEach(planet => {
        var planetData = getPlanetData(planet.planetId);
        if(!validSource(planetData)){
            removePlanet(planet);
        } else{
            planet.facilities.forEach(facility => {
                var facilityData = getFacilityData(facility);
                if(!validSource(facilityData)){
                    planet.facilities.splice(planet.facilities.indexOf(facility),1);
                }
            });
        }
    });
    updateForce();
}

function validSource(entry) {
    return entry.source == "base"
        || (contentCampaign.checked && entry.source == "campaign")
        || (contentScout.checked && entry.source == "kickstarter-scout-box");
}

function setupOptions(){

    factionSelection = document.getElementById("factionSelector");


    while (factionSelection.options.length > 0) {                
        factionSelection.options.remove(0);
    }   

    factions.forEach(faction =>{
        var option = new Option(displayText[faction], faction);
        factionSelection.add(option);
    });

    if(force.useScout){
        factionsScoutBox.forEach(faction =>{
            var option = new Option(displayText[faction], faction);
            factionSelection.add(option);
        });
    }

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
    var planetLabel = document.createElement("span");
    planetLabel.innerHTML = "Planets:";
    planetSection.appendChild(planetLabel);

    planetDropdown = document.createElement("SELECT");
    planets.forEach(function(planet){
        if(validSource(planet)){
            var option = new Option(displayText[planet.name] + " (" + planet.cost + ")", planet.name);
            planetDropdown.add(option);
        }
    });
    planetSection.appendChild(planetDropdown);

    var planetAddButton = document.createElement("button");
    planetAddButton.innerHTML = "Add Planet";
    planetAddButton.onclick = function(){
        addPlanet(planetDropdown.value);
    }
    planetSection.appendChild(planetAddButton);
}

function setupForce(){
    force.faction = factionSelection.value;
    force.leaders = [];
    force.units = [];
    force.planets = [];
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

    contentScout = document.getElementById("content-scoutbox");
    contentScout.addEventListener("click", changeContentSettings);

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
        facilities.sort(compareFacilities);
        checkDisplayText();
        setupOptions();
        setupForce();
        calculateForceCost();
    });
}

function checkDisplayText() {
    var missing = [];
    toCheck = [units, leaders, planets, upgrades, facilities];
    toCheck.forEach(category => {
        category.forEach(entry => {
            if(!displayText.hasOwnProperty(entry.name)){
                missing.push(entry.name);
            }
        })
    });
    if(missing.length > 0){
        console.log("Missing display text " + missing);
    }
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

class PlanetEntry {
    planetId = "";
    commander = null;
    staff = [];
    facilities = [];
}