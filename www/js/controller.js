angular.module('starter')
	.controller('MapCtrl', function($scope, $ionicLoading, $compile, $http, $q, $cordovaGeolocation) {
		var apiKey = 'bcfd315d85337c27406702b8c117b0d8763d3036';
		var origin;
		var destination;
		var map;	 
		var markers = [];		
		var goo;
		var App;

		// Sets the map on all markers in the array.
		function setMapOnAll(map) {
		  for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(map);
		  }
		}

		// Removes the markers from the map, but keeps them in the array.
		function clearMarkers() {
		  setMapOnAll(null);
		}

		// Deletes all markers in the array by removing references to them.
		function deleteMarkers() {
		  clearMarkers();
		  markers = [];
		}
		
      function initialize() {		
	    goo = google.maps;
		
		
		map = new google.maps.Map(document.getElementById('map'), {
			mapTypeControl: false,
			center: {lat: -33.8688, lng: 151.2195},
			zoom: 13,
			disableDefaultUI: true
		});
		
		var lineSymbol = {
			path: 'M 0,-1 0,1',
			strokeOpacity: 1,
			strokeWeight: 2,
			scale: 3
		};
		
	    App  = { 
			map :map,
			bounds: new goo.LatLngBounds(),
			directionsService: new goo.DirectionsService(),    
			directionsDisplay1: new goo.DirectionsRenderer({
				map: map,
				preserveViewport: true,
				suppressMarkers: true,
				suppressBicyclingLayer: true,
				polylineOptions: {
					strokeColor:'#3B0E7A',
					strokeWeight:2,
					strokeOpacity: 0,
					icons: [{
						icon: lineSymbol,
						offset: '0',
						repeat: '15px'
					}],
				}
			}),  
			directionsDisplay2: new goo.DirectionsRenderer({
				map: map,
				preserveViewport: true,
				suppressMarkers: true,
				suppressBicyclingLayer: true,
				polylineOptions: {
					strokeColor:'#3B0E7A',
					strokeWeight:4
				}
			}),
			directionsDisplay3: new goo.DirectionsRenderer({
				map: map,
				preserveViewport: true,
				suppressMarkers: true,
				suppressBicyclingLayer: true,
				polylineOptions: {
					strokeColor:'#3B0E7A',
					strokeOpacity: 0,
					strokeWeight:2,
					icons: [{
						icon: lineSymbol,
						offset: '0',
						repeat: '15px'
					}],
				}
			})  
		};

		function expandViewportToFitPlace(map, place) {
			if (place.geometry.viewport) {
			  map.fitBounds(place.geometry.viewport);
			} else {
			  map.setCenter(place.geometry.location);
			  map.setZoom(17);
			}
		}
		
		
		$scope.getMe = function(){
			var posOptions = {timeout: 10000, enableHighAccuracy: false};
			$cordovaGeolocation
				.getCurrentPosition(posOptions)
				.then(function (position) {
					origin = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
					geocoder.geocode(
						{
							location: origin
						},
						function (results, status) {
							$scope.queryFrom = results[0].formatted_address;
							
							var pinIcon = new google.maps.MarkerImage(
								"https://maps.gstatic.com/mapfiles/ms2/micons/purple-dot.png",
								null, /* size is determined at runtime */
								null, /* origin is 0,0 */
								null, /* anchor is bottom center of the scaled image */
								new google.maps.Size(28, 28)
							);  
							addMarker(origin, 'Départ', true, pinIcon);
							$scope.$apply();
						}
					);
					map.setCenter(origin);
					map.setZoom(16);
				}, function(err) {
				  console.log(err);
			});
		}
		$scope.getMe();

		$scope.pickAddress = function(address){
			if(typeSearch == "origin"){
				origin = address.geometry.location;
				expandViewportToFitPlace(map, address);
				$scope.queryFrom = address.formatted_address;
			}
			else if(typeSearch == "destination"){
				destination = address.geometry.location;
				expandViewportToFitPlace(map, address);
				$scope.queryTo = address.formatted_address;
			}
			route();
			delete $scope.results;
		}
		
		var geocoder = new google.maps.Geocoder();
		var typeSearch;
		
		$scope.getAddressSuggestions = function(queryString, type){
			typeSearch = type;
			
			geocoder.geocode(
				{
					address: queryString,
					bounds: map.getBounds()
				},
				function (results, status) {
					if (status == google.maps.GeocoderStatus.OK){						
						$scope.results = results;
					}
				}
			);
		}

		function route() {
			if (!origin || !destination) {
				return;
			}
			$scope.loading = true;
			clearMarkers();
			
			getNearestVelib(origin, false, function(stationOrigin){
				getNearestVelib(destination, true, function(stationDest){					
					traceRoute(origin, destination, stationOrigin, stationDest);
				});
			});
			
		}

        $scope.map = map;
      }
	  
      google.maps.event.addDomListener(window, 'load', initialize);	  
	  
	  function addMarker(point, text, show, icon, label){
		show = typeof(show) != 'undefined' ? show : true;
		var marker = new google.maps.Marker({
			position: point,
			map: map,
			icon: icon,
		});
		if(label){
			marker.setLabel({
				text: label,
				fontWeight: 'bold',
				fontSize: '12px',
				fontFamily: '"Courier New", Courier,Monospace',
				color: 'white'
			});
		}
		markers.push(marker);
		
		if(text){			
			var infowindow = new google.maps.InfoWindow({
				content: '<div class="info-window">' + text + '</div>'
			});
			if(show){			
				infowindow.open(map, marker);
			}
			marker.addListener('click', function() {
				infowindow.open(map, marker);
			});
		}
	  }
	  
	  function getNearestVelib(point, isEnd, callback){
		  $http.get('https://api.jcdecaux.com/vls/v1/stations?contract=paris&apiKey=' + apiKey).then(function(response){
			  var data = response.data;
			  var dist = 200000;
			  var stations = [];
			  var station;
			  
			  var pinIcon = {
				url: "https://maps.gstatic.com/mapfiles/ms2/micons/" + (isEnd ? "green.png" : "purple.png"),
				size: null,
				origin: new google.maps.Point(0, -4),
				anchor: null,
				scaledSize: new google.maps.Size(28, 28)
			  };
			  
			  for(var i in data){
				  if(!isEnd && data[i].available_bikes < 1 || isEnd && data[i].available_bike_stands < 1 || data[i].status != 'OPEN'){
					  continue;
				  }
				  var pointStation = new google.maps.LatLng(data[i].position.lat, data[i].position.lng);
				  var newDist = google.maps.geometry.spherical.computeDistanceBetween(pointStation, point);
				  			  
				  if(newDist < 400){
					stations.push({station: data[i], location: pointStation, dist: newDist});
				  }
				  if(newDist < dist){
					  dist = newDist;
					  station = data[i];
				  }
			  }
			  
			  for(var i in stations){	
				if(stations[i].station == station)
					continue;
				
				addMarker(stations[i].location, '', false, pinIcon, isEnd ? stations[i].station.available_bike_stands.toString() : stations[i].station.available_bikes.toString());
			  }
			  
			  callback(station);
		  }, function(err){
			  
		  });
	  }
	  
	  function traceRoute(start, end, stationOrigin, stationDest){
		$scope.duration = {
			bike: 0,
			walk: 0
		};
		
		$scope.distance = {
			bike: 0,
			walk: 0			
		};
		
		var velibStart = new google.maps.LatLng(stationOrigin.position.lat, stationOrigin.position.lng);
		var velibEnd = new google.maps.LatLng(stationDest.position.lat, stationDest.position.lng);
	    
		var startLeg = {  
		   origin: start,
		   destination: velibStart,
		   travelMode:  goo.TravelMode.WALKING
	    };
	    var middleLeg = {  
		   origin: velibStart,
		   destination: velibEnd,
		   travelMode:  goo.TravelMode.BICYCLING
	    };
	    var endLeg   = {  
		   origin: velibEnd,
		   destination: end,
		   travelMode:  goo.TravelMode.WALKING
	    };  
		
	    App.directionsService.route(startLeg, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
			  App.directionsDisplay1.setDirections(result);
			  App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
			  var leg = result.routes[0].legs[0];
			  $scope.distance.walk += leg.distance.value / 1000;
			  $scope.duration.walk += leg.duration.value / 60;
			  var text = stationOrigin.address + '</br>Vélos disponibles : ' + stationOrigin.available_bikes;
			  
			  var pinIcon = new google.maps.MarkerImage(
				"https://maps.gstatic.com/mapfiles/ms2/micons/blue.png",
				null, /* size is determined at runtime */
				null, /* origin is 0,0 */
				null, /* anchor is bottom center of the scaled image */
				new google.maps.Size(28, 28)
			  );  
			  
			  addMarker(leg.end_location, text, false, 'img/velib.gif', stationOrigin.available_bikes);
			  addMarker(leg.start_location, 'Départ', false, pinIcon);
			  
			  if(!$scope.$$phase){
				  $scope.$apply();
			  }
			}
	    }); 

	    App.directionsService.route(middleLeg, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
			  App.directionsDisplay2.setDirections(result);
			  App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
			  var leg = result.routes[0].legs[0];
			  $scope.distance.bike += leg.distance.value / 1000;
			  $scope.duration.bike += leg.duration.value / 60;
			  if(!$scope.$$phase){
				  $scope.$apply();
			  }
			}
	    });

	    App.directionsService.route(endLeg, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
			  App.directionsDisplay3.setDirections(result);
			  App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
			  var leg = result.routes[0].legs[0];
			  $scope.distance.walk += leg.distance.value / 1000;
			  $scope.duration.walk += leg.duration.value / 60;
			  var text = stationDest.address + '</br>Places disponibles : ' + stationDest.available_bike_stands;	  
			  
			  var pinIcon = new google.maps.MarkerImage(
				"https://maps.gstatic.com/mapfiles/ms2/micons/orange.png",
				null, /* size is determined at runtime */
				null, /* origin is 0,0 */
				null, /* anchor is bottom center of the scaled image */
				new google.maps.Size(28, 28)
			  );
			  
			  addMarker(leg.start_location, text, false, 'img/velib.gif', stationDest.available_bike_stands);		
			  addMarker(leg.end_location, 'Arrivée', false, pinIcon);
			  
			  if(!$scope.$$phase){
				  $scope.$apply();
			  }
			}
	    });
		
		$scope.loading = false;
	  }
      
});