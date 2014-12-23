require('newrelic');
var express = require('express');
var bodyParser = require('body-parser');
mailer = require('express-mailer');
var logger = require('./source/utils/logger');
var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

var env = process.env.NODE_ENV || 'development';
var port = process.env.PORT || 3006;
var cors = require('cors');
var serveStatic = require('serve-static');
var path = require('path');

mailer.extend(app, {
    from: 'andrii@preply.com',
    host: 'smtp.gmail.com', // hostname
    secureConnection: true, // use SSL
    port: 465, // port for secure SMTP
    transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
    auth: {
        user: 'andrii@preply.com',
        pass: '***'
    }
});

app.use(cors());
app.use('/static', express.static(path.join(__dirname, 'source', 'static')));
app.set('views', path.join(__dirname, 'source', 'static'));
app.set('view engine', 'jade');
require('./source/health')(app);
require('./source/posts')(app);
require('./source/home')(app);

app.listen(port, function () {
	logger.info('Preply(fork from likeastore.com) tracker listening on port ' + port + ' ' + env);
});
