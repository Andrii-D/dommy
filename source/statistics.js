var async = require('async');
var logger = require('./utils/logger');
var client = require('./utils/redis');

function statistics(app) {
	app.route('/api/stats').get(function (req, res, next) {
		client.hgetall("websites", function (err, websites) {
			var getCounterByUrl = function (counter, url, callback) {
				client.get(url, function (err, count) {
					if (err) {
						return callback(err);
					}

					counter[url] = count;
					callback(null, counter);
				});
			};

			async.reduce(Object.keys(websites), {}, getCounterByUrl, function (err, counter) {
				if (err) {
					return next(err);
				}

				res.json(counter);
			});
		});
	});
}

module.exports = statistics;
