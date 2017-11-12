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

function getNovelIndex(name, novelList){
	return novelList.findIndex(function (a){ return a.name === name ;})

}

function showNotif(id, novelInfo, message){
	console.log("showNotif for " + novelInfo.name);
	var opt = {
		  type: "basic",
		  title: novelInfo.name,
		  message: message,
		  iconUrl: novelInfo.img,
		  isClickable: true,
		  requireInteraction: true
		}
	notif = chrome.notifications.create( id ,opt);
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
	
function retrieveNovelList(){
	var client = new HttpClient();
	//Sending Asynchronous request to the server
	for(var pageNum = 1; pageNum < 11 ; ++pageNum){
		client.get("https://lnmtl.com/novel?orderBy=name&order=asc&page=" + pageNum, function(response, pageNum){
			processHttpResponse(response, pageNum);
		}, pageNum);
	}	
}

function AddToPrefList(index){
	//console.log("AddToPrefList");
	var sel = document.getElementById('select-novel');
	console.log("Adding index "+ index);
	if(!hasNovel(gNovelList[index], gPrefNovelList))
		gPrefNovelList.push(gNovelList[index]);

	savePrefListToCache();
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
		for(var nov in result){
			gPrefNovelList = result[nov];
			console.log(gPrefNovelList.length + " elements retrieved.");
		}
	});
}

function clearPrefList(){
	//console.log("clearing all pref");
	chrome.storage.local.remove('novelList');
	gPrefNovelList.length = 0;
	//displayPrefList();
}

function latestChapterHttpResponse(response, novelIndex){
	//console.log("latestChapterHttpResponse");
	var el = document.createElement('html');
	el.innerHTML = response;
	var medias = el.getElementsByClassName( 'col-lg-9 col-md-8' );
	if(medias && 
		medias[0] &&
		medias[0].getElementsByClassName('panel-title')&&
		medias[0].getElementsByClassName('panel-title').length === 0
		){
		console.log('No Lastest for ' + gPrefNovelList[novelIndex].name);
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
			latestChapterHttpResponse(response, index);
		}, index);	
	}
}


document.addEventListener('process_responses', function(){
			gNovelList.sort(compareNovel);
			sendResponse(gNovelList);
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
		if(request.type === "get-novel-list"){
			console.log("length " + gNovelList.length);
			if(gNovelList.length === 0)
				retrieveNovelList();
			gNovelList.sort(compareNovel);
			sendResponse(gNovelList);
		} else if(request.type === "get-favorite-list"){
			console.log("adding " + request);
			sendResponse(gPrefNovelList);
		}else if(request.type === "addto-favorite-list"){
			console.log("adding " + request);
			AddToPrefList(request.index);
			sendResponse(gPrefNovelList);
		} else if(request.type === "clear-favorite-list"){
			console.log("clearing favorite");
			clearPrefList();
			sendResponse(gPrefNovelList);
		} else if(request.type === "check-update"){
			checkForLatestChapter();
			sendResponse();
		}
  });
  

chrome.runtime.onStartup.addListener(function(){
	console.log("I am started!");
	retrieveNovelList();
	retrievePrefListFromCache();
});

chrome.runtime.onInstalled.addListener(function(){
	console.log("I am installed!");
	retrieveNovelList();
});