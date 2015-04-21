/*jslint browser: true*/
/*global L */
/*global GEOHEX */
var geohexCode = null;
var startZoomLevel = 10;
var localStoragePrefix = 'EW_'; // earthWatchers
var user = localStorage.getItem(localStoragePrefix + 'user') || 'anonymous';
var satelliteImages = null;
var map = null;
var defaultGeohexLevel = null;
var defaultSatelliteType = 'Landsat';
var defaultProject = 'Borneo';
var selectedObservationType = null;
var project = null;
var projectObservationTypes = null;
var dragMarkerPosition = null;
var projectName = null;


function timeSliderChanged(ctrl) {
    if (satelliteImages.features.length > 0) {
        var day = satelliteImages.features[ctrl.value].properties.Published;
        var label = document.getElementById('rangeValLabel');
        label.innerHTML = day;
        // update label positioning
        label.className = 'value' + ctrl.value;

        var earthwatchersLayer = findLayerByType('earthWatchers');

        var s = getSatelliteImageByDate(satelliteImages, day);
        var url = s.properties.UrlTileCache + '/{z}/{x}/{y}.png';
        var maxLevel = s.properties.MaxLevel;
        var newLayer = L.tileLayer(url, {
            tms: true,
            maxZoom: maxLevel,
            type: 'earthWatchers'
        });
        map.addLayer(newLayer);

        if (earthwatchersLayer !== null) {
            map.removeLayer(earthwatchersLayer);
        }
    }
}

function getObservationsCount(){
    var i=0;
    map.eachLayer(function (layer) {
        if(layer.id!=null) {
            i++;
        }
    });
    return i;
}

function gotoNextHexagon(){
    var url = location.href.replace(location.hash, '#/' + projectName);
    location.href = url;
    window.location.reload();
}


function next() {
    // todo count observation
    var observations = getObservationsCount();
    if(observations===0){
        // send message that nothing is observed
        postObservation('clear', user, geohexCode,0,0, project.properties.Name, function (resp) {
            gotoNextHexagon();
        });
    }
    else{
        gotoNextHexagon()        
    }

}

function toggleSatelliteType(sel) {
    var labels = {
            Landsat: 'Landsat 8',
            Sentinel: 'Sentinel 1'
        },
        newtype = sel.value === 'Landsat' ? 'Sentinel' : 'Landsat';

    // change map layer
    satelliteTypeSelectionChanged({value: newtype});

    // update satellite type value
    sel.parentNode.classList.remove(sel.value.toLowerCase());
    sel.setAttribute('value', newtype);
    sel.parentNode.classList.add(sel.value.toLowerCase());

    // update satellite type label
    document.getElementById('satTypeLabel').innerText = labels[newtype];
}

function satelliteTypeSelectionChanged(sel) {
    var currentImageType = sel.value;
    var polygon = getGeohexPolygon(geohexCode);
    var bbox = polygon.getBounds().toBBoxString();
    getSatelliteImageData(bbox, currentImageType, function (resp) {
        satelliteImages = resp;
        var sel = document.getElementById('timeSlider');
        satelliteImages.features.sort(compare);
        sel.onchange();
    });
}

function setObservationType(observationType) {
    selectedObservationType = observationType;
    styleObservationTypeButtons(projectObservationTypes, observationType.type);
}

function onMapClick(e) {
    var isInside = isPointInHexagon(geohexCode, e.latlng);
    if (isInside) {
        var markerIcon = L.icon({
            iconUrl: "./images/" + selectedObservationType.icon,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });

        var newMarker = new L.marker(e.latlng, {icon: markerIcon, draggable: true});
        var div = document.createElement('div');
        div.innerHTML = selectedObservationType.name + '<br/>';

        var inputButton = document.createElement('input');
        inputButton.className = 'marker-delete-button';
        inputButton.value = 'remove';
        inputButton.type = 'button';
        inputButton.onclick = function () {
            // alert('delete: ' + newMarker.id);
            map.removeLayer(newMarker);
            deleteObservation(newMarker.id, function(res){
                alert('marker is deleted');
            });
        };
        div.appendChild(inputButton);
        newMarker.bindPopup(div);
        newMarker.on('dragend', function (event) {
            var marker = event.target;
            var position = marker.getLatLng();
            var isInside = isPointInHexagon(geohexCode, position);
            if (isInside) {
                updateObservationPosition(marker.id, position.lng, position.lat, function (resp) {
                    alert(resp);
                });
            }
            else {
                newMarker.setLatLng(dragMarkerPosition);
            }

        });
        newMarker.on('dragstart', function (event) {
            dragMarkerPosition = event.target.getLatLng();
        });

        newMarker.addTo(map);

        postObservation(selectedObservationType.type, user, geohexCode, e.latlng.lng, e.latlng.lat, project.properties.Name, function (resp) {
            newMarker.id = resp.id;
        });
    }
}


function onPopupOpen() {
    var tempMarker = this;

    var list = document.getElementsByClassName('marker-delete-button');
    for (var i = 0; i < list.length; i++) {
        list[i].click(function () {
        });
    }
}

function changeName(event) {
    var form = event.target;
    var newName = form.children[0].value;

    // stop from saving empty name
    if (!newName) return false;

    user = newName;
    updateUsername(newName);

    // clean and hide form
    form.parentElement.classList.add('hide');
    form.children[0].value = '';

    updateUserInfo();
    return false;
}

function initializeRouting(){
    Path.map("#/:project").to(function () {
        // sample: #/borneo
        geohexCode = null;
        projectName = this.params['project'];
    });
    Path.map("#/:project/:hex").to(function () {
        // sample: #/borneo/PO2670248
        projectName = this.params['project'];
        geohexCode = this.params['hex'];
    });
    Path.listen();
}

function drawObservations(observations){
    // alert('draw obs: ' + observations.length);
}


(function (window, document, L) {
    'use strict';
    L.Icon.Default.imagePath = 'images/';
    initializeRouting();

    initUserPanel();

    loadJSON('data/observationTypes.json', function (observationTypes) {
        loadJSON('data/projects.geojson', function (projects) {
            if (projectName === null) {
                projectName = defaultProject;
            }
            project = getProjectByName(projects, projectName);
            projectObservationTypes = project.properties.ObservationCategories.split(',');

            addObservationTypeButtons(projectObservationTypes, observationTypes);

            defaultGeohexLevel = project.properties.GeohexLevel;

            if (geohexCode === null) {
                geohexCode = getRandomHexagon(project, defaultGeohexLevel);
                location.hash = '#/' + projectName + '/' + geohexCode;
            }

            loadJSON('/api/observations/' + projectName + '/' + geohexCode + '/' + user,function(observations){
                if(observations.length > 0){
                    drawObservations(observations);
                }
                satelliteTypeSelectionChanged({value: defaultSatelliteType});

                map = L.map('map', {
                    zoomControl: false,
                    attributionControl: false
                });
                map.on('click', onMapClick);

                var myStyle = {
                    'color': '#000000',
                    'weight': 5,
                    'opacity': 0.65,
                    fillOpacity: 0
                };

                var polygon = getGeohexPolygon(geohexCode, myStyle);
                var centerHex = polygon.getBounds().getCenter();
                map.setView(centerHex, startZoomLevel, {
                    animation: true
                });

                map.addControl(new L.Control.ZoomMin({
                    position: 'topright', startLevel: startZoomLevel, startCenter: centerHex
                }));

                L.control.scale({imperial: false, position: 'topleft'}).addTo(map);

                var ggl2 = new L.Google('satellite');
                map.addLayer(ggl2);
                map.addLayer(polygon);

                L.geoJson(projects, {fill: false}).addTo(map);
            });
        });
    });

}(window, document, L));
