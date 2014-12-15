var _ = require('underscore');
var moment = require('moment');

var config = require('../config');
var logger = require('./utils/logger');
var client = require('./utils/redis');

function tracker(app) {
	var validate = function (req, res, next) {
    if (!req.query.partner) {
			return res.send(200);
		}
		next();
	};

	app.route('/api/track').get(validate, function (req, res, next) {
    client.incr(req.query.partner);
    client.incr(req.query.partner + moment().utc().toDate().toString().substring(0, 10)); //write to website+date key e.g.: "preply.com10-09-2014"
    client.hsetnx("websites", req.query.partner, true);
    return res.send(200);
	});
}

module.exports = tracker;
