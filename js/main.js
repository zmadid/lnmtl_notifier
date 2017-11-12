function compareNovel(a, b){
		var nameA = a.name.toUpperCase(); // ignore upper and lowercase
		var nameB = b.name.toUpperCase(); // ignore upper and lowercase
		if (nameA < nameB){
			return -1;
		}
		if (nameA > nameB){
			return 1;
		}
		return 0;
}

function buildNovelSelectBox(gNovelList){
	// Create a select box
	var novels = document.getElementById('novel-list');
	
	var sel = document.getElementById('select-novel');
	if( sel == null){
		var sel = document.createElement('select');
		sel.name = "NovelList";
		sel.id = "select-novel";
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
	addButton.setAttribute('class', 'button');
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

	for(var i = 0, l = gPrefNovelList.length; i<l; ++i){
		var novel = document.createElement('div');
		novel.innerHTML = gPrefNovelList[i].name;
		el.appendChild(novel);
	}
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

