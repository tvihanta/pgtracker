Track = function(){
	this.positionList = [];
	this.startTime = null;
	this.stopTime = null;
	this.positionList = [];
};

Track.prototype.getTrackJSON = function(){
	console.log("track.getTrackJSON");
	var res = {};
	res.coordinates = [];
	for(var i=0, len=this.positionList.length; i < len; i++) {
		res.coordinates.push({
								lat: this.positionList[i].coords.latitude,
								lon: this.positionList[i].coords.longitude
							});	
	}
	res.startTime = this.startTime;
	res.stopTime = this.stopTime;
	
	return res;
}

Tracker = function () {
	this.persistUrl = "SERVER_URL_HERE";
	this.deviceId = DEVICE_UID;
	this.watchId = null;
	this.track =null;
	this.tracking= false;
	//dom elements
	this.networkingButton = null;
	this.mapContainer=null;
	this.startButton=null;
	
}
	Tracker.prototype.init=function(){
		this.setDomObjs();
		
		if(navigator.network.connection.type==Connection.NONE){
			this.networkingButton.text("no internet").attr("data-icon", "delete").button("refresh");
		}
		
		this.setEvents();
		trackerMap.init();
	}; 
	Tracker.prototype.setDomObjs= function(){
		console.log("set dom objects to tracker");
		this.networkingButton = $('#network-button');
		this.mapContainer = $('#track-map-container');
		this.startButton = $("track-get-position");
		$("#upload-track").parent().addClass('ui-disabled');
	};
	Tracker.prototype.startTracking= function(){
		var self = this;
		this.tracking = true;
		$("#track-get-position").text("stop tracking").attr("data-icon", "delete").button("refresh");
		this.track = new Track();
		$("#upload-track").parent().addClass('ui-disabled');
		
		var d = new Date();
		this.track.startTime = d.getTime();
		this.track.positionList = []
		this.watchId = navigator.geolocation.watchPosition(function (position){
				// Set the initial Lat and Long of the Google Map
				console.log("pos fix:" +position.coords.latitude+" : "+position.coords.longitude);
				self.track.positionList.push(position);
				trackerMap.updateRoute(position);	
			}, 
			function(error){
				if(error.code == PositionError.TIMEOUT){
					console.log("gps timed out");
				}
				else {
					alert("error getting position. "+error.code+' message: '+error.message)
				}
				
			}, {enableHighAccuracy:true, timeout: 30000, maximumAge: 300000 });
			
	};
	Tracker.prototype.stopTracking=function(){
		this.tracking = false;
	    $("#track-get-position").text("start tracking").attr("data-icon", "refresh").button("refresh");
		if(this.watchId != null){
			navigator.geolocation.clearWatch(this.watchId);
			this.watchId = null;
			var d = new Date();
			this.track.stopTime = d.getTime();
			$("#upload-track").parent().removeClass('ui-disabled');
			trackerMap.setMarker(this.track.positionList[ this.track.positionList.length -1 ]);
			alert("tracked "+this.track.positionList.length+" points");
		}
	};
	Tracker.prototype.postTrack=function(self){
		console.log("postTrack");
		var jsonTrack = self.track.getTrackJSON();
		if(typeof(self.track.startTime) != "undefined")
		{
			$.ajax({ 
					 type: "POST",
					 url: self.persistUrl, 
				     data: {device:self.deviceId, data:jsonTrack},
				     success: function (data){
				     							alert(data);
				     							$("#upload-track").parent().addClass('ui-disabled');
				     						},
				     error: function(e, status, error){alert(e.statusText)},
				     complete: function(){console.log("complete")},
				     dataType: 'text'
				    });
		}	
	};
	Tracker.prototype.setEvents=function(){
		var self = this;
		$("#track-get-position").live("click", function(){
			if(self.tracking === false){
				self.startTracking();
			}
			else { 
				self.stopTracking(self);
			} 
		});
		$("#upload-track").live("click", function() {self.postTrack(self)});
	};


TrackerMap= function(){
	this.map = null;
	this.trackPolyline = null;
	this.trackCoords= [];
	
};
	TrackerMap.prototype.init=function(){
		var myLatLng = new google.maps.LatLng(64.00,26.00);
		 
		// Google Map options
		var myOptions = {
		  zoom: 8,
		  center: myLatLng,
		  mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		 
		// Create the Google Map, set options
		this.map = new google.maps.Map(document.getElementById("track-map-container"), myOptions);
		google.maps.event.trigger(this.map, "resize");
		
		this.trackPolyline = new google.maps.Polyline({ path:[], 
															strokeColor:'#ff0000', 
															strokeOpacity: 1.0, 
															strokeWeight:2 });
		this.trackPolyline.setMap(this.map);
	},
	TrackerMap.prototype.setMarker=function(position){
		var marker = new google.maps.Marker({
			map:this.map,
			position: new google.maps.LatLng(position.coords.latitude,position.coords.longitude)
		});
	};
	TrackerMap.prototype.setMarkerLatLon=function(latitude, longitude){
		var marker = new google.maps.Marker({
			map: this.map,
			position: new google.maps.LatLng(latitude,longitude)
		});
	};
	TrackerMap.prototype.updateRoute = function(position){
		if(this.trackCoords.length === 0 )
			this.setMarker(position);
	
		this.trackCoords.push( new google.maps.LatLng(position.coords.latitude, position.coords.longitude) );
		this.trackPolyline.setPath(trackerMap.trackCoords);
		console.log("nro of coords: " +this.trackCoords.length);
		this.map.setCenter(new google.maps.LatLng(position.coords.latitude,position.coords.longitude));
	};

document.addEventListener("deviceready", function(){
	trackerMap = new TrackerMap();
	tracker    = new Tracker();
	tracker.init();
}, true);
