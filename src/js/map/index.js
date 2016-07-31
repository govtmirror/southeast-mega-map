(function () {

  var L = require('leaflet');
  var emitter = require('../mediator');
  var mapLayers = require('./layers');

  var _  = require('../util');

  L.Icon.Default.imagePath = './images';

  var opts, map, cluster, index, layers;
  var defaults = {
    zoom: 7,
    mapId: 'map'
  };

  function init(options) {
    opts = _.defaults({}, options, defaults);
    createMap();
    opts.fullExtent = _.create('button', ['tt-w', 'zoom-to-full-extent', 'leaflet-control-roy'], document.body);
    opts.fullExtent.setAttribute('data-tt', 'Zoom to full extent');
    opts.nearest = _.create('button', ['find-nearest', 'tt-w', 'leaflet-control-roy'], document.body);
    opts.nearest.setAttribute('data-tt', 'Find nearest offices');
    opts.imgLocate = _.create('img', '', opts.nearest);
    opts.imgLocate.setAttribute('src', './svg/current-location.svg');
    opts.imgExtent = _.create('img', '', opts.fullExtent);
    opts.imgExtent.setAttribute('src', './svg/full-extent.svg');
    registerHandlers();
    if (opts.data) addMarkers();
    return map;
  }

  function flyToOffice(office) {
    // Clone the coordinates array
    var latlng = office.geometry.coordinates.slice(0).reverse();
    // Account for detail panel opening
    latlng[1] = latlng[1] - 0.135;
    map.flyTo(latlng, 11);
  }

  function registerHandlers() {
    emitter.on('office:selected', flyToOffice);
    emitter.on('detail:hide', panMap);
    emitter.on('detail:show', panMap);
    opts.fullExtent.addEventListener('click', zoomToFullExtent);
    opts.nearest.addEventListener('click', getLocation);
    map.on('click', blurInput);
    map.on('locationfound', findNearest);
    map.on('overlayadd', layerAdd);
    map.on('overlayremove', layerRemove);
  }

  function layerAdd(layer) {
    cluster.addLayer(layers[layer.name]);
  }

  function layerRemove(layer) {
    cluster.removeLayer(layers[layer.name]);
  }

  function getLocation() {
    _.addClass(opts.nearest, 'loading');
    opts.imgLocate.setAttribute('src', './svg/loading.svg');
    map.locate();
  }

  function panMap(distance) {
    map.panBy([distance, 0]);
  }

  function blurInput() {
    emitter.emit('blur:input');
  }

  function zoomToFullExtent() {
    map.flyToBounds(cluster.getBounds());
    emitter.emit('zoom:fullextent');
  }

  function createMap() {

    var mapOptions = {
      zoomControl: false,
      layers: [mapLayers.baseLayers['Open Street Map']]
    };
    map = L.map(opts.mapId, mapOptions);
    map.fitBounds(opts.bounds);

    var overlays = {
      "Refuges": L.layerGroup().addTo(map),
      "Hatcheries": L.layerGroup().addTo(map),
      "Ecological Services": L.layerGroup().addTo(map),
      "Fish and Wildlife Conservation Offices": L.layerGroup().addTo(map)
    };

    new L.Control.Zoom({ position: 'bottomleft' }).addTo(map);
    L.control.layers(mapLayers.baseLayers, mapLayers.overlays).addTo(map);
  }

  function onEachFeature(feature, layer) {
    layer.bindPopup(feature.properties.name);
    layer.on({ click: onMarkerClick });
  }

  function pointToLayer(feature, latlng) {
    var icons = require('../icons');
    var type = feature.properties.type;
    if (type === 'National Wildlife Refuge')
      return L.marker(latlng, { icon: icons.blueGoose });
    else if (type === 'National Fish Hatchery')
      return L.marker(latlng, { icon: icons.fisheries });
    else
      return L.marker(latlng, { icon: icons.office });
  }

  function onMarkerClick(feature) {
    var office = feature.target.feature;
    flyToOffice(office);
    emitter.emit('marker:click', office);
  }

  function findNearest(e) {
    L.popup().setLatLng(e.latlng).setContent('Your Current Location').openOn(map);
    var nearest = index.nearest(e.latlng, 10);
    _.removeClass(opts.nearest, 'loading');
    opts.imgLocate.setAttribute('src', './svg/current-location.svg');
    emitter.emit('found:nearest', nearest);
  }

  function createOfficeLayer(type) {
    return L.geoJson(opts.data, {
      filter: function (feature, latlng) {
        switch (feature.properties.type) {
          case type: return true;
          default: return false;
        }
      },
      onEachFeature: onEachFeature,
      pointToLayer: pointToLayer
    }).on('mouseover', function(e) {
      e.layer.openPopup();
    }).on('mouseout', function(e) {
      e.layer.closePopup();
    });
  }

  function addMarkers() {
    layers = {
      "Refuges": createOfficeLayer('National Wildlife Refuge'),
      "Hatcheries": createOfficeLayer('National Fish Hatchery'),
      "Ecological Services": createOfficeLayer('Ecological Services Field Office'),
      "Fish and Wildlife Conservation Offices": createOfficeLayer('Fish And Wildlife Conservation Office')
    };

    cluster = L.markerClusterGroup({
      showCoverageOnHover: false
    });

    cluster.addLayer(layers.Refuges);
    cluster.addLayer(layers.Hatcheries);
    cluster.addLayer(layers["Ecological Services"]);
    cluster.addLayer(layers["Fish and Wildlife Conservation Offices"]);

    // There seems to be an issue with adding multiple layers in markercluster beta
    // https://github.com/Leaflet/Leaflet.markercluster/issues/623
    // cluster.addLayers([ refuges, hatcheries, es, conservationOffices ]);

    map.addLayer(cluster);
  }

  module.exports.init = init;

})();


// Map.js
//
// Deal with query parameters first
//  Figure out the bounds of the map (?office= or ?state=)
//  Figure out what layers to enable
//
// Pass in some options to a Map constructor

// Map buttons
//
// Should be in a separate file

// Refactor
// Use jade to template out tool buttons