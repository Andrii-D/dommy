/**
 * Created by Dvoiak on 22.12.2014.
 */
var _ = require('underscore');
var crawler = require('./crawl.js');
var moment = require('moment');

var config = require('../config');
var logger = require('./utils/logger');
var client = require('./utils/redis');

function posts(app) {

    app.post('/signup', function(req, res) {
        console.log(req.body);
        crawler(req.body.website);

        app.mailer.send('email', {
            to: 'dvoyak@gmail.com', // REQUIRED. This can be a comma delimited string just like a normal email to field.
            subject: 'Test Email', // REQUIRED.
            otherProperty: 'Other Property' // All additional properties are also passed to the template as local variables.
        }, function (err) {
            if (err) {
                // handle error
                console.log(err);
                res.send({status: 'crawling', message: "Thank you. There was an error sending the email"});
                return;
            }
            res.send({status: 'crawling', message: "Thank you. Email sent"});
        });

    });

}

module.exports = posts;