function compareNovel(a, b){
	var nameA = a.name.toUpperCase(); // ignore upper and lowercase
	var nameB = b.name.toUpperCase(); // ignore upper and lowercase
	if (nameA < nameB){
		return -1;
	} else if (nameA > nameB){
		return 1;
	} else {
		return 0;
	}	
}

function buildNovelSelectBox(gNovelList){
	// Create a select box
	var novels = document.getElementById('novel-list');
	
	var sel = document.getElementById('select-novel');
	if( sel == null){
		var sel = document.createElement('select');
		sel.name = "NovelList";
		sel.id = "select-novel";
		sel.setAttribute('class', 'select-novel');
	}
	gNovelList.sort(compareNovel);
	for (var i = 0, l = gNovelList.length; i < l; ++i) {
		var opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = gNovelList[i].name;
		sel.appendChild(opt);
	}
	novels.appendChild(sel);
	
	
	// Create an Add button to add Novel to the preference list
	var addButton = document.createElement('div');
	addButton.innerHTML = "Add";
	addButton.id = "AddButton";
	addButton.setAttribute('class', 'pure-button button-add');
	novels.appendChild(addButton);
	addButton.addEventListener("click", addToFavoriteNovelList, true);
	
}

function addToFavoriteNovelList(){
	//console.log("addToFavoriteNovelList");
	var sel = document.getElementById('select-novel')
	console.log("Adding index "+ sel.selectedIndex+ " with title: " + sel.options[sel.selectedIndex].innerHTML );
	chrome.runtime.sendMessage({type: "addto-favorite-list", index: sel.selectedIndex}, function(response) {
	  console.log(response);
	  displayPrefList(response);
	});
}

function displayPrefList(gPrefNovelList){
	//console.log("displayPrefList");
	var el = document.getElementById("pref-novel");
	while (el.firstChild) {
	  el.removeChild(el.firstChild);
	}
	
	if(gPrefNovelList.length == 0)
		return;

	// Create a table
	var table = document.createElement('table');
	table.setAttribute('class', 'pure-table');
	var tbody = document.createElement('tbody');
	var odd = true;
	for(var i = 0, l = gPrefNovelList.length; i<l; ++i){
		var tr = document.createElement('tr');
		if(odd){
			tr.setAttribute('class', 'pure-table-odd');
		}
		var td_1 = document.createElement('td');
		td_1.innerHTML = gPrefNovelList[i].name;
		var td_2 = document.createElement('td');
		td_2.setAttribute('class', 'pure-button');
		td_2.innerHTML = 'remove';
		
		td_2.addEventListener("click", clearNovel, true);
		
		tr.appendChild(td_1);
		tr.appendChild(td_2);
		tbody.appendChild(tr);
		
		odd = !odd;
	}
	table.appendChild(tbody);
	el.appendChild(table);
}

function clearNovel(e){
	chrome.runtime.sendMessage({type: "remove-novel", index: e.target.parentNode.rowIndex}, function(response) {
	  console.log(response);
	  displayPrefList(response);
	});
}

function getNovelList(){
	chrome.runtime.sendMessage({type: "get-novel-list"}, function(response) {
	  console.log(response);
	  buildNovelSelectBox(response);
	});
}

function getFavoriteList(){
	chrome.runtime.sendMessage({type: "get-favorite-list"}, function(response) {
	  console.log(response);
	  displayPrefList(response);
	});
}

function clearFavoriteList(){
	chrome.runtime.sendMessage({type: "clear-favorite-list"}, function(response) {
	  console.log(response);
	  displayPrefList(response);
	});
}

function checkUpdate(){
	chrome.runtime.sendMessage({type: "check-update"}, function(response) {
	  console.log(response);
	});
}

function start() {
    console.log("DOM fully loaded and parsed");
	var info = { name: "main"};
	getNovelList();
	getFavoriteList();	
	
	document.getElementById("clear").addEventListener("click", clearFavoriteList , true);
	
	document.getElementById("check").addEventListener("click", checkUpdate, true);
	
};

document.addEventListener("DOMContentLoaded", start, false);

