
var _ = require('underscore');
var moment = require('moment');
var config = require('../config');
var logger = require('./utils/logger');
//var client = require('./utils/redis');
var parser = require('url');
var sys   = require('sys');


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

function treat(domain){

    client.zscore("EXPIRED", domain, function(e, r){
        if (!r){
            var whois = require('node-whois');
            whois.lookup(domain, {"follow":  1}, function(err, data) {
                if (!!data){
                    data.split('\r\n').forEach(function(element){
                        if (element.indexOf('Registrar Registration Expiration Date:') == 0){
                            var d = new Date(element.substring(40));
                            console.log(d.getTime());
                            client.zadd("EXPIRED", d.getTime(), domain, function(err, resp){
                                if (resp == '1'){
                                    console.log(domain + " expires " + d);
                                }

                            });
                            return;
                        }
                    });
                }

            });
        } else {
            console.log(domain + " already in our database");
        }
    });

}


function api(app) {
    app.post('/api', function(req, res) {
        console.log(req.body.domain);
        if (!req.body.domain){
            var domain = getDomain(req.body.url);
            treat(domain);
        } else {
            treat(req.body.domain);
        }
        res.send('ok');

        });
}

module.exports = api;
