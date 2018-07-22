gNovelList = [];
gContentRetrieved = [0,0,0,0,0,0,0,0];
gPrefNovelList = [];
gAlarmFrequency = {active: true, frequency: 15};
gUrlNovelList = "https://lnmtl.com/novel?orderBy=name&order=asc&filter=ongoing&page="

function NovelInfo (aName, aUrl){
	this.name = aName;
	this.url = aUrl;
	this.img = "";
	this.latest = "";
	this.latestUrl="";
	this.latestTitle="";
	this.updated = false;
	this.parseMediaInfo = function(mediaInfo){
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
		} else if (nameA > nameB){
			return 1;
		} else{
			return 0;
		}	
}

function hasNovel(novel, novelList){
	if(novelList.find(function (a){ return a.name === novel.name ;}) === undefined)
		return false;
	return true;
}

function getNovelIndex(name, novelList){
	return novelList.findIndex(function (a){ return a.name === name ;})

}

function getLocalTime(){
	var date = new Date();
	
	var time = 	("0" + date.getHours()).slice(-2) + ":" +
				("0" + date.getMinutes()).slice(-2) + ":" + 
				("0" + date.getSeconds()).slice(-2) + "  ";
	return time;
}

function showNotif(id, novelInfo, message){
	console.log(getLocalTime() + "Notification should be displayed");
	var opt = {
		  type: "basic",
		  title: novelInfo.name,
		  message: message,
		  iconUrl: novelInfo.img,
		  priority: 2,
		  isClickable: true,
		  requireInteraction: true
		}
	notif = chrome.notifications.create(id, opt);
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

function parseNovelList(response, param){
	//console.log("Response retrieved");
	var el = document.createElement('html');
	el.innerHTML = response;
	var main = el.getElementsByTagName('main')[0];
	var container = main.getElementsByClassName('container')[1];
	var medias = container.getElementsByClassName('media');
	
	for( var i = 0, l = medias.length; i < l;  ++i){
		var mediaInfo = medias[i];
		var opt = new NovelInfo();
		opt.parseMediaInfo(mediaInfo);
		gNovelList.push(opt);
	}
	gContentRetrieved[param-1] = 1;
	//console.log("Response retrieved for page " + param);
	//console.log("content retrieved updated " + gContentRetrieved);
	// When all asynchronous calls are finished, fire an even to start processing the all the responses receives.
	if(gContentRetrieved.every(x => x === 1)){
		console.log( "All responses received.  !");
		gEv_process = new Event('process_responses');
		document.dispatchEvent(gEv_process);
	}
}
	
function retrieveNovelList(){
	console.log(gContentRetrieved);
	var client = new HttpClient();
	//Sending Asynchronous request to the server
	var maxPages = gContentRetrieved.length + 1;
	for(var pageNum = 1; pageNum < maxPages ; ++pageNum){
		client.get(gUrlNovelList + pageNum, function(response, pageNum){
			parseNovelList(response, pageNum);
		}, pageNum);
	}
}

function AddToPrefList(index){
	//console.log("AddToPrefList");
	console.log("Adding index "+ index);
	gPrefNovelList.push(gNovelList[index]);
	savePrefListToCache();
}

function saveAlarmFrequency(){
	chrome.storage.local.set({"alarmFrequency": gAlarmFrequency}, function(){
		console.log("gAlarmFrequency saved to cache " + gAlarmFrequency);
		for(var name in gAlarmFrequency) {
			console.log( name + ':' + gAlarmFrequency[name]);
		}
	});
}

function retrieveAlarmFrequencyFromCache(){
	chrome.storage.local.get('alarmFrequency', function (result) {
		for(var nov in result){
			gAlarmFrequency = result[nov];
		}
		console.log("gAlarmFrequency retrieved from cache " + gAlarmFrequency.frequency);
		createAlarm();
	});
}

function clearAlarmFrequency(){
	chrome.storage.local.remove('alarmFrequency');
}
function savePrefListToCache(){
	//console.log("savePrefListToCache");
	// Put the object into storage
	chrome.storage.local.set({"novelList": gPrefNovelList},  function() {
		//console.log('Settings saved');
	});
}

// Retrieve the object from storage
function retrievePrefListFromCache(){
	var storage = chrome.storage.local.get('novelList', function (result) {
		for(var nov in result){
			gPrefNovelList = result[nov];
			//console.log(gPrefNovelList.length + " elements retrieved.");
		}
	});
}

function clearPrefList(){
	//console.log("clearing all pref");
	chrome.storage.local.remove('novelList');
	gPrefNovelList.length = 0;
	//displayPrefList();
}

function clearNovel(index){
	gPrefNovelList.splice(index, 1);
	savePrefListToCache();
}

function latestChapterHttpResponse(response, input){
	//console.log("latestChapterHttpResponse");
	var el = document.createElement('html');
	el.innerHTML = response;
	var medias = el.getElementsByClassName( 'col-lg-9 col-md-8' );
	if(medias && 
		medias[0] &&
		medias[0].getElementsByClassName('panel-title')&&
		medias[0].getElementsByClassName('panel-title').length === 0
		){
		console.log('No Lastest for ' + gPrefNovelList[input.index].name);
		return ;	
	}	
		
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
		var chapTitle = latest.getElementsByTagName('a')[0].innerText;
		
		console.log("latest chapter " + chapNum + ", and link is " + chapUrl);
		if(gPrefNovelList[input.index].latest !== chapNum){
			console.log("New chapter of " + gPrefNovelList[input.index].name + " ref will be updated to :" + chapNum);
			if(input.showNotif)
				showNotif(gPrefNovelList[input.index].name, gPrefNovelList[input.index], "New chapter out " + chapNum);
			gPrefNovelList[input.index].latest = chapNum;
			gPrefNovelList[input.index].latestUrl = chapUrl;
			gPrefNovelList[input.index].latestTitle = chapTitle;
		}
	}
	if(input.showNotif)
		gPrefNovelList[input.index].updated = true;
	if(gPrefNovelList.every(function (x){ return x.updated === true;})){
		savePrefListToCache();
	}
}

function getLastChapter(index, showNotif){
	console.log("Checking for "+ gPrefNovelList[index].name + ", with ref: " + gPrefNovelList[index].latest);
	var client = new HttpClient();
	//Sending Asynchronous request to the server
	client.get(gPrefNovelList[index].url, function(response, index){
		latestChapterHttpResponse(response, {index: index, showNotif: showNotif});
	}, index);	
}
function checkForLatestChapter(){
	gPrefNovelList.forEach(function(x){ x.updated = false;});
	console.log(gPrefNovelList);
	for(index in gPrefNovelList){
		getLastChapter(index, true);	
	}
}
function init(){
	retrieveNovelList();
	checkNotifPremission();
	createAlarm();
}

function checkNotifPremission(){
	
}

function createAlarm(){
	if(gAlarmFrequency.active){
		var alarmInfo ={when: Date.now(), periodInMinutes: gAlarmFrequency.frequency};
		chrome.alarms.create("auto-check-update", alarmInfo);
	}
}
function enableAutoCheck(input){
	gAlarmFrequency.active = true;
	gAlarmFrequency.frequency = parseInt(input);
	createAlarm();
	saveAlarmFrequency(gAlarmFrequency);
}

function disableAutoCheck(){
	gAlarmFrequency.active = false;
	
	chrome.alarms.clear("auto-check-update", function(wasCleared){
		console.log("Alarm was cleared:" + wasCleared);
	});
	saveAlarmFrequency();
}

document.addEventListener('process_responses', function(){
	gNovelList.sort(compareNovel);
	console.log("pushing to main " + gNovelList.length);
	chrome.runtime.sendMessage({type: "push-novel-list", content: gNovelList}, function(response) {
	  console.log(response);
	});
}, false);

chrome.notifications.onClicked.addListener(function (notificationId){
	var novelIndex = getNovelIndex(notificationId, gPrefNovelList);
	if(novelIndex === undefined){
		alert("Favorite has been updated");
		return;
	}
	console.log("notification clicked for " + gPrefNovelList[novelIndex].name);
	window.open(gPrefNovelList[novelIndex].url);
	chrome.notifications.clear(notificationId);
	});

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.log(getLocalTime() + "call for " + request.type);
		switch(request.type){
			case "get-novel-list":
				console.log("gNovelList.length " + gNovelList.length);
				if(gNovelList.length === 0)
					retrieveNovelList();
				sendResponse(gNovelList);
				break;
			case "refresh-novel-list":
				gNovelList.length = 0;
				retrieveNovelList();
				sendResponse(gNovelList);
				break;
			case "get-favorite-list":
				console.log("adding " + request);
				sendResponse(gPrefNovelList);
				break;
			case "addto-favorite-list":
				console.log("adding " + request);
				if(!hasNovel(gNovelList[request.index], gPrefNovelList)){
					AddToPrefList(request.index);
					getLastChapter(gPrefNovelList.length - 1, false);
				}
				sendResponse(gPrefNovelList);
				break;
			case "clear-favorite-list":
				console.log("clearing favorite");
				clearPrefList();
				sendResponse(gPrefNovelList);
				break;
			case "remove-novel":
				console.log("clearing novel " + request.index);
				clearNovel(request.index);
				sendResponse(gPrefNovelList);
			case "check-update":
				console.log(getLocalTime() + "Manual check");
				checkForLatestChapter();
				sendResponse();
				break;
			case "get-refresh-frequency":
				sendResponse(gAlarmFrequency);
				break;
			case "enable-auto-check":
				console.log("Automated check enabled with frequency " + request.frequency);
				enableAutoCheck(request.frequency);
				sendResponse(gAlarmFrequency);
				break;
			case "disable-auto-check":
				console.log("Automated check disabled");
				disableAutoCheck();
				sendResponse(gAlarmFrequency);
				break;
			default:
				alert("Request not supported " + request.type);
		}
  });

chrome.runtime.onStartup.addListener(function(){
	console.log("I am started!");
	retrievePrefListFromCache();
	retrieveAlarmFrequencyFromCache();
	init();
});

chrome.runtime.onInstalled.addListener(function(){
	console.log(getLocalTime() + "I am installed!");
	savePrefListToCache();
	saveAlarmFrequency();
	init();
});

chrome.alarms.onAlarm.addListener(function(alarm){
	if(alarm.name === "auto-check-update" ){
		console.log(getLocalTime() + "Alarm called!");
		checkForLatestChapter();
		gContentRetrieved.forEach(function(part, index, theArray){theArray[index] = 0});
	}
});