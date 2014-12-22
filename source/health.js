var pack = require('../package');

function health(app) {

	var root = app.route('/health');

	root.get(function (req, res) {
		res.json({app: 'preck.preply.com', env: process.env.NODE_ENV, version: pack.version});
	});
}

module.exports = health;
