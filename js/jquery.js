gNovelList = [];
gContentRetreived = [0,0,0,0,0,0,0,0,0,0];
gPrefNovelList = [];

function NovelInfo (aName, aUrl){
	this.name = aName;
	this.url = aUrl;
	this.img = "";
	this.latest = "";
	this.updated = false;
	this.fillFromMedia = function(mediaInfo){
		// A sample of mediaInfo is available in ../miscellaneous/media.xml
		this.name = mediaInfo.getElementsByTagName('a')[1].innerHTML;
		this.url = mediaInfo.getElementsByTagName('a')[1].getAttribute('href');
		this.img = mediaInfo.getElementsByTagName('img')[0].getAttribute('src');
	}
}

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

function hasNovel(novel, novelList){
	if(novelList.find(function (a){ return a.name === novel.name ;}) === undefined)
		return false;
	return true;
}

function getNovelIndex(novel, novelList){
	if(hasNovel(novel, novelList)){
		return novelList.findIndex(function (a){ return a.name === novel.name ;})
	}
	return -1;
}

function showNotif(id, novelInfo, message){
	console.log("showNotif");
	
	var opt = {
		  type: "basic",
		  title: novelInfo.name,
		  message: message,
		  iconUrl: novelInfo.img,
		  requireInteraction: true
		  /* iconUrl: "../images/icon.png" */
		}
	notif = chrome.notifications.create( id ,opt);
	
	chrome.notifications.onClicked.addListener(function (notificationId){ 
		console.log("notification clicked");
		window.open(novelInfo.url);
		chrome.notifications.clear(notificationId);
		});
}

function showDefaultNotif(id){
	showNotif(id, gNovelList[50], "New chapter out.");
}

// An wrapper to perform HTTP request
// aCallback is called, when the response is received with status 200
function HttpClient () {
	this.get = function(aUrl, aCallback, param) {
		var anHttpRequest = new XMLHttpRequest();
		//Define a listener
		anHttpRequest.onreadystatechange = function() { 
			if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
				aCallback(anHttpRequest.responseText, param);
		}
		//Send an asynchronous request
		anHttpRequest.open( "GET", aUrl, true /* Asynchronous call*/);            
		anHttpRequest.send( null );
	}
}

function processHttpResponse(response, param){
	//console.log("Response retrieved");
	var el = document.createElement('html');
	el.innerHTML = response;
	var medias = el.getElementsByClassName( 'col-lg-6 col-md-6' );
	for( var i = 0, l = medias.length; i < l;  ++i){
		var mediaInfo = medias[i];
		var opt = new NovelInfo();
		opt.fillFromMedia(mediaInfo);
		gNovelList.push(opt);
	}
	console.log("Response retrieved for page " + param);
	gContentRetreived[param-1] = 1;
	
	// When all asynchronous calls are finished, fire an even to start processing the all the responses receives.
	if(gContentRetreived.every(x => x == 1)){
		console.log( "All responses received.  !");
		gEv_process = new Event('process_responses');
		document.dispatchEvent(gEv_process);
	}
}
	
function RetrieveNovelList(){
	var client = new HttpClient();
	//Sending Asynchronous request to the server
	for(var pageNum = 1; pageNum < 11 ; ++pageNum){
		client.get("https://lnmtl.com/novel?orderBy=name&order=asc&page=" + pageNum, function(response, pageNum){
			processHttpResponse(response, pageNum);
		}, pageNum);
	}	
}

function buildNovelSelectBox(){
	// Create a select box
	var novels = document.createElement('div');
	novels.id = "novel-list";
	
	var sel = document.getElementById('select-novel');
	if( sel == null){
		var sel = document.createElement('select');
		sel.name = "NovelList";
		sel.id = "select-novel";
	}
	gNovelList.sort(compareNovel);
	console.log(gNovelList);
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
	addButton.addEventListener("click", AddToPrefList, true);
	
	document.body.appendChild(novels);
}


function AddToPrefList(){
	//console.log("AddToPrefList");
	var sel = document.getElementById('select-novel')
	console.log("Adding index "+ sel.selectedIndex+ " with title: " + sel.options[sel.selectedIndex].innerHTML );
	if(!hasNovel(gNovelList[sel.selectedIndex], gPrefNovelList))
		gPrefNovelList.push(gNovelList[sel.selectedIndex]);

	savePrefListToCache();
	displayPrefList();
}

function displayPrefList(){
	//console.log("displayPrefList");
	var el = document.getElementById("pref-novel");
	if(el)
		el.remove();
	
	if(gPrefNovelList.length == 0)
		return;
	
	el = document.createElement('div');
	el.id = "pref-novel";
	for(var i = 0, l = gPrefNovelList.length; i<l; ++i){
		var novel = document.createElement('div');
		novel.innerHTML = gPrefNovelList[i].name;
		el.appendChild(novel);
	}
	document.body.appendChild(el);
}

function savePrefListToCache(){
	console.log("savePrefListToCache");
	// Put the object into storage
	chrome.storage.local.set({"novelList": gPrefNovelList},  function() {
		//console.log('Settings saved');
	});
}

// Retrieve the object from storage
function retrievePrefListFromCache(){
	var storage = chrome.storage.local.get('novelList', function (result) {
		//console.log(result);
		for(var nov in result){
			gPrefNovelList = result[nov];
			console.log(gPrefNovelList.length + " elements retrieved.");
		}
		displayPrefList();
	});
}

function clearPrefList(){
	//console.log("clearing all pref");
	chrome.storage.local.remove('novelList');
	gPrefNovelList.length = 0;
	displayPrefList();
}

function processLastestHttpResponse(response, novelIndex){
	//console.log("processLastestHttpResponse");
	var el = document.createElement('html');
	el.innerHTML = response;
	var medias = el.getElementsByClassName( 'col-lg-9 col-md-8' );
	if(medias && 
		medias[0] && 
		medias[0].getElementsByTagName('table') && 
		medias[0].getElementsByTagName('table')[0] && 
		medias[0].getElementsByTagName('table')[0].getElementsByTagName('tr') && 
		medias[0].getElementsByTagName('table')[0].getElementsByTagName('tr')[0] && 
		medias[0].getElementsByTagName('table')[0].getElementsByTagName('tr')[0].getElementsByTagName('td') && 
		medias[0].getElementsByTagName('table')[0].getElementsByTagName('tr')[0].getElementsByTagName('td')[0]){
		var latest = medias[0].getElementsByTagName('table')[0].getElementsByTagName('tr')[0].getElementsByTagName('td')[0];
		var chapNum = latest.getElementsByTagName('span')[0].innerHTML;
		var chapUrl = latest.getElementsByTagName('a')[0].getAttribute('href');
		
		console.log("latest chapter " + chapNum + ", and link is " + chapUrl);
		if(gPrefNovelList[novelIndex].latest !== chapNum){
			console.log("New chapter of " + gPrefNovelList[novelIndex].name + " ref will be updated to :" + chapNum);
			showNotif(gPrefNovelList[novelIndex].name, gPrefNovelList[novelIndex], "New chapter out " + chapNum);
			gPrefNovelList[novelIndex].latest = chapNum;
		} else {
			console.log("We already have the lastest chapter: " + chapNum);
			
		}
	}
	gPrefNovelList[novelIndex].updated = true;
	if(gPrefNovelList.every(function (x){ return x.updated === true;})){
		savePrefListToCache();
	}
}

function checkForLatestChapter(){
	gPrefNovelList.forEach(function(x){ x.updated = false;});
	console.log(gPrefNovelList);
	for(index in gPrefNovelList){
		console.log("Checking for "+ gPrefNovelList[index].name + ", with ref: " + gPrefNovelList[index].latest);
		var client = new HttpClient();
		//Sending Asynchronous request to the server
		client.get(gPrefNovelList[index].url, function(response, index){
			processLastestHttpResponse(response, index);
		}, index);	
	}
}

function init() {
    console.log("DOM fully loaded and parsed");

	// Listen for the event.
	// Build a select box and append it to the document
	document.addEventListener('process_responses', buildNovelSelectBox, false);

	// Get the list of novel to display for the user
	RetrieveNovelList();
	
	var id1 = "azer";
	document.getElementById("but1").addEventListener("click", function (){showDefaultNotif(id1);}, true);
	
	
	retrievePrefListFromCache();
	document.getElementById("but3").addEventListener("click", clearPrefList , true);
	
	document.getElementById("but2").addEventListener("click", checkForLatestChapter, true);
	
	document.getElementById("but4").addEventListener("click", function(){ console.log(gPrefNovelList);}, true);
	
	// Create an alram
	var alarmInfo = {
		when: Date.now(),
		periodInMinutes: 1
	}
	chrome.alarms.create("check-updates", alarmInfo);
	
	chrome.alarms.onAlarm.addListener(processAlarm);
	
	//setInterval(checkForLatestChapter, 60000);
	
};

function processAlarm(){
	retrievePrefListFromCache();
	checkForLatestChapter();
}

document.addEventListener("DOMContentLoaded", init, false);

