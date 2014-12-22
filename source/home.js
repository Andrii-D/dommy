/**
 * Created by Dvoiak on 22.12.2014.
 */
var async = require('async');
var logger = require('./utils/logger');
var client = require('./utils/redis');

function homepage(app) {
    app.route('/').get(function (req, res, next) {
        res.sendfile(__dirname + '/static/index.html');
    });
}

module.exports = homepage;