/**
 * Created by Dvoiak on 22.12.2014.
 */
var async = require('async');
var logger = require('./utils/logger');
var client = require('./utils/redis');
var url = require('url');

function showpage(app) {
    app.route('/').get(function (req, res, next) {
        client.zrange("EXPIRED", 0, 100, function(e, r){

            var top = "";
            r.forEach(function(element, index){
                client.zscore("EXPIRED", element, function(er, re){
                    var d = new Date(parseInt(re));
                    top += index + " expires " +element+ " " + d + "<br>";
                });
            });
            setTimeout(function() {
                res.send(top);
            }, 300);

        })
    });

}

module.exports = showpage;