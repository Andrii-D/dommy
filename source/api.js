
var _ = require('underscore');
var moment = require('moment');
var config = require('../config');
var logger = require('./utils/logger');
var client = require('./utils/redis');
var parser = require('url');

function getDomain(url) {
    var hostName = parser.parse(url).hostname;
    var domain = hostName;

    if (hostName != null) {
        var parts = hostName.split('.').reverse();

        if (parts != null && parts.length > 1) {
            domain = parts[1] + '.' + parts[0];

            if (hostName.toLowerCase().indexOf('.co.uk') != -1
                && parts.length > 2) {
                domain = parts[2] + '.' + domain;
            }
        }
    }

    return domain;
}
function api(app) {

    app.post('/api', function(req, res) {

        var domain = getDomain(req.body.url);
        console.log(domain);
//        var Host_Name = parsed.protocol + "//" + parsed.hostname;

        });



}

module.exports = api;
