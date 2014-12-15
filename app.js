var express = require('express');
var bodyParser = require('body-parser');

var logger = require('./source/utils/logger');
var app = express();
var env = process.env.NODE_ENV || 'development';
var port = process.env.PORT || 3006;
var cors = require('cors');

app.use(bodyParser.json());
app.use(cors());
require('./source/health')(app);
require('./source/tracker')(app);
require('./source/statistics')(app);

app.listen(port, function () {
	logger.info('Preply(fork from likeastore.com) tracker listening on port ' + port + ' ' + env);
});
