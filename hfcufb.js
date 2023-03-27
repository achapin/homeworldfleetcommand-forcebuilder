var force = {};
var leaders = [];
var units = [];
var upgrades = [];
var classOrder = ["super-capital","frigate","corvette","fighter","station","platform"]

var unitDropdown, leaderDropdown;

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

function openForceWindow() {
    var forceWindow = document.getElementById("forceWindow");
    forceWindow.classList.remove("hidden")
    var directory = getSaveDirectory();
    var forceList = document.getElementById("forceList");
    forceList.innerHTML = "";
    directory.forEach(function(forceName) {
        var entry = document.createElement("div");
        entry.classList.add("forceEntry")
        var name = document.createElement("span");
        name.innerHTML = forceName;
        entry.appendChild(name);
        var load = document.createElement("button");
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
    force.leaders.push(newEntry);
    updateForce();
}

function addUnit(){
    var newEntry = new UnitEntry();
    newEntry.unitId = unitDropdown.value; 
    force.units.push(newEntry);
    updateForce();
}

function updateForce(){
    renderEntries();
    calculateForceCost();
}

function renderEntries(){
    var leaderSection = document.getElementById("unassignedLeaders");
    leaderSection.innerHTML = "";
    force.leaders.forEach(function(leader) { renderLeader(leader, leaderSection) });

    var unitSection = document.getElementById("units");
    unitSection.innerHTML = "";
    force.units.forEach(function(unit) { renderUnit(unit, unitSection)});
}

function renderLeader(leader, leaderSection){
    var leaderContainer = document.createElement("div");
    var leaderData = getLeaderData(leader.leaderId);

    var leaderNameLabel = document.createElement("span");
    leaderNameLabel.innerHTML = leaderData.name;
    leaderContainer.appendChild(leaderNameLabel);

    var leaderCostLabel = document.createElement("span");
    leaderCostLabel.innerHTML = "Cost";
    leaderContainer.appendChild(leaderCostLabel);

    var leaderCostValue = document.createElement("span");
    leaderCostValue.innerHTML = leaderData.cost + "★";
    leaderContainer.appendChild(leaderCostValue);

    var leaderHandLabel = document.createElement("span");
    leaderHandLabel.innerHTML = "Hand";
    leaderContainer.appendChild(leaderHandLabel);

    var leaderHandValue = document.createElement("span");
    leaderHandValue.innerHTML = leaderData.hand;
    leaderContainer.appendChild(leaderHandValue);

    var leaderPlayLabel = document.createElement("span");
    leaderPlayLabel.innerHTML = "Hand";
    leaderContainer.appendChild(leaderPlayLabel);

    var leaderPlayValue = document.createElement("span");
    leaderPlayValue.innerHTML = leaderData.play;
    leaderContainer.appendChild(leaderPlayValue);

    var removeButton = document.createElement("button");
    removeButton.innerHTML = "X";
    removeButton.onclick = function(){
        const index = force.leaders.indexOf(leader);
        if(index > -1){
            force.leaders.splice(index, 1);
        }
        //TODO: Remove leader from ship, if they are assigned
        updateForce();
    }
    leaderContainer.appendChild(removeButton);

    leaderSection.appendChild(leaderContainer);
}

function renderUnit(unit, unitSection){
    var unitContainer = document.createElement("div");
    var unitData = getUnitData(unit.unitId);

    var unitNameLabel = document.createElement("span");
    unitNameLabel.innerHTML = unitData.name;
    unitContainer.appendChild(unitNameLabel);

    var unitCostLabel = document.createElement("span");
    unitCostLabel.innerHTML = "Cost";
    unitContainer.appendChild(unitCostLabel);

    var unitCostValue = document.createElement("span");
    unitCostValue.innerHTML = unitData.cost + "★";
    unitContainer.appendChild(unitCostValue);

    var unitClassLabel = document.createElement("span");
    unitClassLabel.innerHTML = "Class:";
    unitContainer.appendChild(unitClassLabel);

    var unitClassValue = document.createElement("span");
    unitClassValue.innerHTML = unitData.class;
    unitContainer.appendChild(unitClassValue);

    var removeButton = document.createElement("button");
    removeButton.innerHTML = "X";
    removeButton.onclick = function(){
        const index = force.units.indexOf(unit);
        if(index > -1){
            force.units.splice(index, 1);
        }
        updateForce();
    }
    unitContainer.appendChild(removeButton);

    unitSection.appendChild(unitContainer);
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
        var unitData = getUnitData(unit.unitId);
        totalCost += unitData.cost;
     });
     
     document.getElementById("forceCost").innerHTML = totalCost;
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
        alert("No unit data found for id " + unit);
    }
    return result;
}

function setupOptions(){
    var leaderSection = document.getElementById("addLeaderSection")
    var leaderLabel = document.createElement("span");
    leaderLabel.innerHTML = "Leaders:";
    leaderSection.appendChild(leaderLabel);

    leaderDropdown = document.createElement("SELECT");
    leaders.forEach(function(leader){
        var option = new Option(leader.name + " (" + leader.cost + ")", leader.name);
        leaderDropdown.add(option);
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
        var option = new Option(unit.name + " (" + unit.cost + ")", unit.name);
        unitDropdown.add(option);
    });
    unitSection.appendChild(unitDropdown);

    var unitAddButton = document.createElement("button");
    unitAddButton.innerHTML = "Add Unit";
    unitAddButton.onclick = function(){
        addUnit(unitDropdown);
    }
    unitSection.appendChild(unitAddButton);
}

function setupForce(){
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
        console.log("No ship class ranked for " + a.class + "of unit " + ship.name);
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

function initialize()
{
    var shipsLoadPromise = loadURL("data/ships.json");
	shipsLoadPromise.then(shipsLoaded);
	shipsLoadPromise.catch(function(){alert("ships data load failed");});

    var leadersLoadPromise = loadURL("data/leaders.json");
	leadersLoadPromise.then(leadersLoaded);
	leadersLoadPromise.catch(function(){alert("leaders data load failed");});

    var upgradesLoadPromise = loadURL("data/upgrades.json");
	upgradesLoadPromise.then(upgradesLoaded);
	upgradesLoadPromise.catch(function(){alert("upgrades data load failed");});

    Promise.all([shipsLoadPromise, leadersLoadPromise, upgradesLoadPromise]).then(_ => {
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
    leaderId;
}