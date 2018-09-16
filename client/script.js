
// Initialize the platform object:
var platform = new H.service.Platform({
  'app_id': 'fF1mVXDKnAlRMVVwdHuO',
  'app_code': 'KyO0DGou-M7uza7g6WGlpQ'
});

// Obtain the default map types from the platform object
var layers = platform.createDefaultLayers();

// Instantiate (and display) a map object:
var map = new H.Map(
  document.getElementById('mapContainer'),
  layers.normal.xbase,
  {
    zoom: 5,
    center: { lng: -100, lat: 40 }
  });

var mapEvents = new H.mapevents.MapEvents(map);

map.addEventListener('tap', function (evt) {
  console.log(evt.type, evt.currentPointer.type);
});

var behavior = new H.mapevents.Behavior(mapEvents);

var ui = H.ui.UI.createDefault(map, layers);

function startClustering(map, data) {
  // First we need to create an array of DataPoint objects,
  // for the ClusterProvider
  var dataPoints = data.map(function (item) {
    return new H.clustering.DataPoint(item[0], item[1]);
  });

  console.log(dataPoints);

  // Create a clustering provider with custom options for clusterizing the input
  var clusteredDataProvider = new H.clustering.Provider(dataPoints, {
    clusteringOptions: {
      // Maximum radius of the neighbourhood
      //eps: 32,
      // minimum weight of points required to form a cluster
      //minWeight: 2
    }
  });

  // Create a layer tha will consume objects from our clustering provider
  var clusteringLayer = new H.map.layer.ObjectLayer(clusteredDataProvider);

  // To make objects from clustering provder visible,
  // we need to add our layer to the map
  map.addLayer(clusteringLayer);
}

var socket = io();
socket.emit('lit fam');
socket.on('oh no', function(data) {
  startClustering(map, data);
});

var options = {
  enableHighAccuracy: true,
  zoom: 5,
  maximumAge: 0
};

// Show traffic tiles
map.setBaseLayer(layers.normal.traffic);

// Enable traffic incidents layer
map.addLayer(layers.incidents);

var here;

function positionSuccess(pos) {
  var crd = pos.coords;
  var ll = { lat: crd.latitude, lng: crd.longitude };

  console.log('Your current position is:');
  console.log(`Latitude : ${crd.latitude}`);
  console.log(`Longitude: ${crd.longitude}`);
  console.log(`More or less ${crd.accuracy} meters.`);

  setTimeout(() => {
    map.setCenter(ll, true);
    map.setZoom(8, true);
    here = new H.map.Marker(ll);
    map.addObject(here);
    reverseGeocode(platform, crd.latitude + ',' + crd.longitude);
  }, 1000);
}

function positionError(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

console.log('GETTING POSITION');
navigator.geolocation.getCurrentPosition(positionSuccess, positionError, options);

var input = document.getElementById('search');
var autocomplete = new google.maps.places.Autocomplete(input);
autocomplete.setFields(['address_components', 'geometry', 'name']);

autocomplete.addListener('place_changed', function () {
  var crd = autocomplete.getPlace().geometry.location;
  map.removeObject(here);
  var ll = { lat: crd.lat(), lng: crd.lng() };
  console.log(ll);
  map.setCenter(ll, true);
  map.setZoom(8, true);
  here = new H.map.Marker(ll);
  map.addObject(here);
  reverseGeocode(platform, crd.lat() + ',' + crd.lng());
});

// search for the address of a known location

/**
 * Calculates and displays the address details of the location found at
 * a specified location in Berlin (52.5309°N 13.3847°E) using a 150 meter
 * radius to retrieve the address of Nokia House. The expected address is:
 * Invalidenstraße 116, 10115 Berlin.
 *
 *
 * A full list of available request parameters can be found in the Geocoder API documentation.
 * see: http://developer.here.com/rest-apis/documentation/geocoder/topics/resource-reverse-geocode.html
 *
 * @param   {H.service.Platform} platform    A stub class to access HERE services
 */
function reverseGeocode(platform, prox) {
  var geocoder = platform.getGeocodingService(),
    reverseGeocodingParameters = {
      prox: prox,
      mode: 'retrieveAddresses',
      maxresults: '1',
      jsonattributes : 1
    };

  geocoder.reverseGeocode(
    reverseGeocodingParameters,
    onSuccess,
    onError
  );
}

/**
 * This function will be called once the Geocoder REST API provides a response
 * @param  {Object} result          A JSONP object representing the  location(s) found.
 *
 * see: http://developer.here.com/rest-apis/documentation/geocoder/topics/resource-type-response-geocode.html
 */
function onSuccess(result) {
  var locations = result.response.view[0].result;
  app.city = locations[0].location.address.city;
  app.location = locations[0].location.address.city + ', ' + locations[0].location.address.state;
  searchNews(app.city);
}

/**
 * This function will be called if a communication error occurs during the JSON-P request
 * @param  {Object} error  The error message received.
 */
function onError(error) {
  alert('Ooops!');
}

// set up news search api

function searchNews(location) {
  var url = 'https://newsapi.org/v2/everything?' +
    'q=+' + location + ' AND +forest AND +fire AND +wildfire&' +
    'excludeDomains=smartbitchestrashybooks.com,stltoday.com,gamasutra.com,newyorker.com,hakaimagazine.com,seekingalpha.com,thepointsguy.com&' +
    // 'from=2018-09-1&' +
    'sortBy=relevancy&' +
    'apiKey=83fa8de5555f42179dca7d75e4184d41';

  var req = new Request(url);

  fetch(req)
    .then(function (response) {
      return response.json();
    }).then(function(data) {
      app.news = data.articles;
      console.log(app.news);
    });
}

// initialize vue

var app = new Vue({
  el: '#app',
  data: {
    city: '',
    location: '',
    news: []
  }
});