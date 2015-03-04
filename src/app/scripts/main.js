/*jslint browser: true*/
/*global L */

//var center = [0.0, 113];
// var lat = 0.153115115481276;
//var lon = 111.687242798354;
var geohexcode = "PO2670248";
var startZoomlevel=12;
var currentImageDate = null;
var satelliteImages=null;
var map = null;

function timesliderChanged(ctrl){
	var day = satelliteImages.features[ctrl.value].properties.Published;
	document.getElementById('rangeValLabel').innerHTML = day;
	var earthwatchersLayer = findEarthwatchersLayer();
	if(earthwatchersLayer!=null)
	{
		map.removeLayer(earthwatchersLayer);
	}

	var s=getSatelliteImageByDate(day);
	var url = s.properties.UrlTileCache + "/{z}/{x}/{y}.png";
	var minlevel = s.properties.MinLevel;
	var maxlevel = s.properties.MaxLevel;
	var newLayer = L.tileLayer(url, {tms:true, maxZoom:maxlevel, type:'earthwatchers'});
	map.addLayer(newLayer);

}

function getSatelliteImageByDate(date){
	for(var i=0;i<satelliteImages.features.length;i++){
		if(satelliteImages.features[i].properties.Published === date){
			return satelliteImages.features[i];
		}
	}
}

function getGeohexPolygon(geohexcode, style){
	var zone = GEOHEX.getZoneByCode(geohexcode);
    var polygon = L.polygon(zone.getHexCoords(),style);
    return polygon;
}

function satelliteTypeSelectionChanged(sel) {
	currentImageType = sel.value;
	var polygon = getGeohexPolygon(geohexcode);
    var bbox = polygon.getBounds().toBBoxString();
    getSatelliteImageData(bbox, currentImageType, satelliteImagescallback);
}

function getSatelliteImageData(bbox,imagetype, callback) {
	var url = 'api/satelliteimages?bbox=' + bbox + '&imagetype=' + imagetype;

    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    
    request.onload = function () {
        if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            callback(data);
        }
    };
    request.send();
}

function findEarthwatchersLayer(){
	var result=null;
	map.eachLayer(function (layer) {
		if(layer.options.type!=null)
		{
	    	if(layer.options.type === "earthwatchers"){
	    		result=layer;
	    	}
		}
	});
	return result;
}

/**
Sort images based on published date
*/
function compare(a,b) {
  if (a.properties.Published < b.properties.Published)
     return -1;
  if (a.properties.Published > b.properties.Published)
    return 1;
  return 0;
}


function satelliteImagescallback(req) {
	satelliteImages = req;
	var sel = document.getElementById("timeslider");
	satelliteImages.features.sort(compare);
	sel.onchange();
}

(function (window, document, L, undefined) {
    'use strict';
	L.Icon.Default.imagePath = 'images/';

	// fire onchange event of first combobox
	 var selectImageType = document.getElementById("selectImageType");
	 selectImageType.onchange();

	map = L.map('map', {
		zoomControl: false 
	});
	new L.Control.Zoom({ position: 'bottomright' }).addTo(map);

	var myStyle = {
    "color": "#ff0000",
    "weight": 5,
    "opacity": 0.65
	};

	// map.setView(loc, z, {animation: true});
	//	center: [lat, lon],
	//	zoom: 7,

	var polygon = getGeohexPolygon(geohexcode,myStyle);
	var centerHex = polygon.getBounds().getCenter();
	map.setView(centerHex, startZoomlevel, {animation: true});

    var ggl2 = new L.Google('satellite');
	map.addLayer(ggl2);
	//omnivore.topojson('project.topojson').addTo(map);
	map.addLayer(polygon);
	// map.addControl(new L.Control.Layers( {'Google':ggl2, 'Esri':esri}, {}, {collapsed:false}));

}(window, document, L));