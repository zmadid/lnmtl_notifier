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
	while (sel.firstChild){
		sel.removeChild(sel.firstChild);
	}
	for (var i = 0, l = gNovelList.length; i < l; ++i) {
		var opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = gNovelList[i].name;
		sel.appendChild(opt);
	}
	novels.appendChild(sel);
	
	
	// Create an Add button to add Novel to the preference list
	var addButton = document.getElementById('add-novel');
	if(addButton == null){
		addButton = document.createElement('div');
		addButton.innerHTML = '<i class="fa fa-archive" aria-hidden="true"></i> Add';
		addButton.id = "add-novel";
		addButton.setAttribute('class', 'pure-button button-add');
		addButton.setAttribute('title', 'Add to favorite list');
		addButton.addEventListener("click", addToFavoriteNovelList, true);
	}
	novels.appendChild(addButton);
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
		var novel_link = document.createElement('a');
		if(gPrefNovelList[i].latest !== ""){
			novel_link.innerHTML = gPrefNovelList[i].latest;
			novel_link.setAttribute('href', gPrefNovelList[i].latestUrl);
			novel_link.setAttribute('title', gPrefNovelList[i].latestTitle);
		} else {
			novel_link.innerHTML = 'view';
			novel_link.setAttribute('href', gPrefNovelList[i].url);
			novel_link.setAttribute('title', 'link to novel');
		}
		
		td_2.appendChild(novel_link);
		
		var td_3 = document.createElement('td');
		td_3.setAttribute('class', 'pure-button');
		td_3.setAttribute('title', 'Remove from favorite');
		td_3.innerHTML = '<i class="fa fa-trash-o" aria-hidden="true"></i> remove';
		
		
		td_3.addEventListener("click", clearNovel, true);
		
		tr.appendChild(td_1);
		tr.appendChild(td_2);
		tr.appendChild(td_3);
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

processing = true;
function refreshNovelList(){
	
	chrome.runtime.sendMessage({type: "refresh-novel-list"}, function(response) {
		console.log(response);
		processing = false;
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

function hideAllTabs(){
	var tabs = document.getElementsByClassName('tab-content');
	for( var i = 0, l = tabs.length; i < l;  ++i){
		tabs[i].setAttribute('style', 'display: none;');
	}
}

function displayRefreshFrequency(input){
	var slider = document.getElementById("myRange");
	slider.value = input.frequency;

	var output = document.getElementById("frequency");
	output.innerHTML = input.frequency;
	if(input.active){
		showDisabledAutorefresh();
	} else {
		showEnabledAutorefresh();
	}
	slider.oninput = function() {
	output.innerHTML = this.value;
	}
}

function showEnabledAutorefresh(){
	document.getElementById("disable-auto-refresh").setAttribute('style', 'display: none;');
	document.getElementById("enable-auto-refresh").setAttribute('style', '');
}

function showDisabledAutorefresh(){
	document.getElementById("enable-auto-refresh").setAttribute('style', 'display: none;');
	document.getElementById("disable-auto-refresh").setAttribute('style', '');
}

function getRefreshFrequency(){
	chrome.runtime.sendMessage({type: "get-refresh-frequency"}, function(response) {
		console.log("refresh-frequency: " + response);
		displayRefreshFrequency(response);
	});

}

function enableAutoRefresh(){
	var value = document.getElementById("myRange").value;
	chrome.runtime.sendMessage({type: "enable-auto-check", frequency: value}, function(response) {
		displayRefreshFrequency(response);
	});
}

function disableAutoRefresh(){
	var value = document.getElementById("myRange").value;
	chrome.runtime.sendMessage({type: "disable-auto-check"}, function(response) {
		displayRefreshFrequency(response);
	});
}

function start() {
    console.log("DOM fully loaded and parsed");
	var info = { name: "main"};
	getNovelList();
	getFavoriteList();
	getRefreshFrequency();
	
	document.getElementById("display-help").addEventListener("click", function(){
		hideAllTabs();
		document.getElementById('help').setAttribute('style', '');
		}, true);
	document.getElementById("display-novels").addEventListener("click", function(){
		hideAllTabs();
		document.getElementById('lnmtl-novel').setAttribute('style', '');
		}, true);
	
	document.getElementById("display-settings").addEventListener("click", function(){
		hideAllTabs();
		document.getElementById('settings').setAttribute('style', '');
		}, true);
		
	document.getElementById("refresh").addEventListener("click", refreshNovelList , true);
	
	document.getElementById("clear").addEventListener("click", clearFavoriteList , true);
	
	document.getElementById("check").addEventListener("click", checkUpdate, true);
	
	document.getElementById("enable-auto-refresh").addEventListener("click", enableAutoRefresh , true);
	
	document.getElementById("disable-auto-refresh").addEventListener("click", disableAutoRefresh , true);
	
};

document.addEventListener("DOMContentLoaded", start, false);

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
	if(request.type === "push-novel-list"){
		//console.log("push received"+ request.content);
		buildNovelSelectBox(request.content);
		sendResponse("Novel list received");
	}
});

