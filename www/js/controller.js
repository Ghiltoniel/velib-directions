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
			zoom: 13
		});
		
	    App  = { 
			map :map,
			bounds: new goo.LatLngBounds(),
			directionsService: new goo.DirectionsService(),    
			directionsDisplay1: new goo.DirectionsRenderer({
				map: map,
				preserveViewport: true,
				polylineOptions: {
					strokeColor:'red'
				}
			}),  
			directionsDisplay2: new goo.DirectionsRenderer({
				map: map,
				preserveViewport: true,
				polylineOptions: {
					strokeColor:'blue'
				}
			}),
			directionsDisplay3: new goo.DirectionsRenderer({
				map: map,
				preserveViewport: true,
				polylineOptions: {
					strokeColor:'yellow'
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
						{location: origin},
						function (results, status) {							
							$scope.myPosition = results[0];
							addMarker(origin, 'Départ');
							$scope.$apply();
						}
					);
					map.setCenter(origin);
					map.setZoom(16);
				}, function(err) {
				  // error
			});
		}
		$scope.getMe();

		$scope.$watch('queryFrom', function(){
			if($scope.queryFrom && $scope.queryFrom.length && $scope.queryFrom[0].place_id){
				origin = $scope.queryFrom[0];
				expandViewportToFitPlace(map, origin);
				route();
			}
		});

		$scope.$watch('queryTo', function(){
			if($scope.queryTo && $scope.queryTo.length && $scope.queryTo[0].place_id){
				destination = $scope.queryTo[0];
				expandViewportToFitPlace(map, destination);
				route();
			}
		});
		
		var geocoder = new google.maps.Geocoder();

		$scope.getAddressSuggestions = function(queryString){
			var defer = $q.defer();
			geocoder.geocode(
				{address: queryString},
				function (results, status) {
					if (status == google.maps.GeocoderStatus.OK) { defer.resolve(results); }
					else { defer.reject(results); }
				}
			);
			return defer.promise;
		}

		function route() {
			if (!origin || !destination) {
				return;
			}
			
			clearMarkers();
			console.log('search !!');
			if(origin.place_id){
				origin = origin.geometry.location;
			}
			if(destination.place_id){
				destination = destination.geometry.location;
			}
			
			getNearestVelib(origin, false, function(stationOrigin){
				getNearestVelib(destination, true, function(stationDest){					
					traceRoute(origin, destination, stationOrigin, stationDest);
				});
			});
			
		}

        $scope.map = map;
      }
	  
      google.maps.event.addDomListener(window, 'load', initialize);	  
	  
	  function addMarker(point, text, show = true){						
		var marker = new google.maps.Marker({
			position: point,
			map: map
		});
		markers.push(marker);
		var infowindow = new google.maps.InfoWindow({
			content: text
	    });
		if(show){			
			infowindow.open(map, marker);
		}
	  }
	  
	  function getNearestVelib(point, isEnd, callback){
		  $http.get('https://api.jcdecaux.com/vls/v1/stations?contract=paris&apiKey=' + apiKey).then(function(response){
			  var data = response.data;
			  var dist = 200000;
			  var stations = [];
			  var station;
			  for(var i in data){
				  if(!isEnd && data[i].available_bikes < 1 || isEnd && data[i].available_bike_stands < 1){
					  continue;
				  }
				  var pointStation = new google.maps.LatLng(data[i].position.lat, data[i].position.lng);
				  var newDist = google.maps.geometry.spherical.computeDistanceBetween(pointStation, point);
				  stations.push({station: data[i], location: pointStation});
				  if(newDist < dist){
					  dist = newDist;
					  station = data[i];
				  }
			  }
			  
			  // var bounds = map.getBounds();
			  // stations.forEach(function(s){
				  // if(bounds.contains(s.location)){
					  // addMarker(s.location, 'Available bikes : ' + s.station.available_bikes);
				  // };
			  // });
			  
			  
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
			  var text = 'Vélos disponibles : ' + stationOrigin.available_bikes;
			  addMarker(leg.end_location, text);
			}
	    }); 

	    App.directionsService.route(middleLeg, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
			  App.directionsDisplay2.setDirections(result);
			  App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
			  var leg = result.routes[0].legs[0];
			  $scope.distance.bike += leg.distance.value / 1000;
			  $scope.duration.bike += leg.duration.value / 60;
			}
	    });

	    App.directionsService.route(endLeg, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
			  App.directionsDisplay3.setDirections(result);
			  App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
			  var leg = result.routes[0].legs[0];
			  $scope.distance.walk += leg.distance.value / 1000;
			  $scope.duration.walk += leg.duration.value / 60;
			  var text = 'Places disponibles : ' + stationDest.available_bike_stands;
			  addMarker(leg.start_location, text);
			}
	    });
	  }
      
    });