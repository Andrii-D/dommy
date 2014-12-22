/**
 * Created by Dvoiak on 22.12.2014.
 */
var _ = require('underscore');
var crawler = require('./crawl.js');
var moment = require('moment');

var config = require('../config');
var logger = require('./utils/logger');
var client = require('./utils/redis');
var url = require('url');

function posts(app) {

    app.post('/signup', function(req, res) {
        console.log(req.body);
        var parsed = url.parse(req.body.website);
        var Host_Name = parsed.protocol + "//" + parsed.hostname;
        var Email = req.body.email;

        client.get(Host_Name, function(err, resp){
            if (resp == 'pending') {
                res.send({status: 'error', message: "I've already submited this website"});
                return;
            }
            if (resp == 'crawling') {
                res.send({status: 'error', message: "We are crawling your website right now!"});
                return;
            }
            if (resp == 'ranking') {
                res.send({status: 'error', message: "We are ranking your website right now!"});
                return;
            }
            if (resp == 'ranked') {
                res.send({status: 'error', message: "Your website is already ranked, check your email!"});
                return;
            }
            client.set(Host_Name, 'pending', function(err,re){
                res.send({status: 'ok', message: "Thnaks", host: Host_Name});
                crawler(Host_Name, Email);
            });
        });
//        app.mailer.send('email', {
//            to: req.body.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
//            subject: 'Internal Page Rank', // REQUIRED.
//            otherProperty: 'Other Property' // All additional properties are also passed to the template as local variables.
//        }, function (err) {
//            if (err) {
//                // handle error
//                console.log(err);
//                res.send({status: 'error', message: "Error with sending an email :("});
//                return;
//            }
//            res.send({status: 'ok', message: "Thank you. Email sent", host: Host_Name});
//        });

    });

}

module.exports = posts;