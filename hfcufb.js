var force = [];
var leaders = [];
var ships = [];
var upgrades = [];
var classOrder = ["super-capital","frigate","corvette","fighter","station","platform"]

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

function setupOptions()
{
    var leaderSection = document.getElementById("addLeaderSection")
    var leaderLabel = document.createElement("span");
    leaderLabel.innerHTML = "Leaders:";
    leaderSection.appendChild(leaderLabel);

    var leaderDropdown = document.createElement("SELECT");
    leaders.forEach(function(leader){
        var option = new Option(leader.name + " (" + leader.cost + ")", leader.name);
        leaderDropdown.add(option);
    });
    leaderSection.appendChild(leaderDropdown);

    var leaderAddButton = document.createElement("button");
    leaderAddButton.innerHTML = "Add Leader";
    leaderAddButton.onclick = function(){
        //TODO: Add leader to force
        alert("Add "+ leaderDropdown.value + " to force");
    }
    leaderSection.appendChild(leaderAddButton);

    var unitSection = document.getElementById("addUnitSection")
    var unitLabel = document.createElement("span");
    unitLabel.innerHTML = "Units:";
    unitSection.appendChild(unitLabel);

    var unitDropdown = document.createElement("SELECT");
    ships.forEach(function(unit){
        var option = new Option(unit.name + " (" + unit.cost + ")", unit.name);
        unitDropdown.add(option);
    });
    unitSection.appendChild(unitDropdown);

    var unitAddButton = document.createElement("button");
    unitAddButton.innerHTML = "Add Unit";
    unitAddButton.onclick = function(){
        //TODO: Add unit to force
        alert("Add "+ unitDropdown.value + " to force");
    }
    unitSection.appendChild(unitAddButton);
}

function shipsLoaded(json){
	ships = json;
    ships.sort(function compareShip(a,b){
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
    });
}