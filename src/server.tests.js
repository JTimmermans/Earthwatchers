var assert = require('assert'),
    http = require('http'),
    earthwatchersserver = require('./server.js');

var baseUrl = 'http://localhost:3000/api/';

// test root url
http.get(baseUrl, function (res) {
    res.on('data', function (data) {
        var json = JSON.parse(data);
        var resp = json.message;
        assert.ok(resp.indexOf('Earthwatchers') > -1);
        earthwatchersserver.close();
    });
});

// test satteliteimages
http.get(baseUrl + 'satelliteimages?bbox=-61.33516232281665,-24.641493541968853,-61.298582533150444,-24.61269606648879', function (res) {
    res.on('data', function (data) {
        var json = JSON.parse(data);
        var f = json.features;
        assert.ok(f.length >= 0);
        earthwatchersserver.close();
    });
});

// test version
http.get(baseUrl + 'version', function (res) {
    res.on('data', function (data) {
        var json = JSON.parse(data);
        var resp = json.message;
        assert.ok(resp.indexOf('0.2') > -1);
        earthwatchersserver.close();
    });
});
