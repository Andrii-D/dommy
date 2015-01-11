var BETA = 0.8; // 1-BETA - jump probability
var BASE = 1; // sum(rank) = BASE
var EPS = 0.000001;
var TOP = 20;
var env = process.env.NODE_ENV || 'development';
var client = require('./utils/redis');
var async = require('async');
var sendgrid  = require('sendgrid')('preck', 'NoOneCanHackThis');
var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var url = require('url');
var Logger = require('./utils/logger');

module.exports = function(host, email){
    var HOST = host;
    var EMAIL = email;
    var N = 0;
    var last_iteration = 0;

    Logger.info("Calculation for " + HOST + EMAIL + BETA);

    var send_email = function(vars){
        if (env != 'production'){
            var email     = new sendgrid.Email({
                to:       vars.email,
                from:     'seo@localizely.com',
                subject:  "Report on PageRank weights for top " + vars.top + " " + vars.DOMAIN + " pages",
                text:     ''
            });
            var email2     = new sendgrid.Email({
                to:       'andrii@preply.com',
                from:     'seo@localizely.com',
                subject:  "Top " + vars.top + " " + vars.DOMAIN + " pages, to " + vars.email + ", made " + vars.iterations + " iterations, crawled " + vars.N + " pages",
                text:     ''
            });
            email.setCategories(['initial']);
            email2.setCategories(['to_admin']);

            var file = fs.readFileSync(path.join(__dirname, 'static', 'prod_email.html'), 'utf-8');
            var html = ejs.render(file, vars);

            email.setHtml(html);
            email2.setHtml(html);


            sendgrid.send(email, function(err, json) {
                if (err) {
                    email2.setText("Error by sending initial email to " + vars.email + " " + vars.host + " err:" + err);
                    sendgrid.send(email2);
                    return Logger.error(err); }
                sendgrid.send(email2);
                Logger.info("We send Email" + json);
            });

        }
    };

    var reduceIngoings = function (runk, id, callback) {
        client.zscore(HOST + "RANK", id, function (err, old_rank) {
            client.zcount(HOST + "OUT" + id, 0, '+inf', function (err, countout) {
                if (err) {
                    return callback(err, rank);
                }
                setImmediate(function () { callback(null, runk + BETA * (old_rank / countout)); });

            });
        });
    };

    var newRank = function(id, cb){
        client.zcount(HOST + "IN"+id, 0, '+inf', function(err, count) {
            if (count != 0) {
                client.zrange(HOST + "IN" + id, 0, -1, function (err, ingoings) {
                    async.reduce(ingoings, 0, reduceIngoings, function (err, runk) {
                        setImmediate(function () {  cb(null, runk); });
                    });
                });
            } else {
                Logger.info("Zero ingoing links for url id=" + id);
                setImmediate(function () {  cb(null, 0); });
            }

        });
    };

    var Iteration = function(i){
        last_iteration = i;
        var ranks = []; // array of ids
        for (var j = 1; j <= N; j++) {
            ranks.push(j);
        }

        async.map(ranks, newRank, function (e, new_ranks) { // got unincremented ranks
            async.reduce(new_ranks, 0, function(prev, next, cb){
                setImmediate(function () { cb(null, prev + next); });

            }, function(err, sum_rank){
                async.map(new_ranks, function(old_rank, callback){
                    old_rank += (BASE - sum_rank) / N ; // add delta to each ranks
                    callback(null, old_rank);

                }, function (e, final_ranks) { // got final ranks

                    async.map(ranks, function(id, callback){ //save new_ranks to redis
                        client.zscore(HOST + "RANK", id, function(err, score){
                            client.zadd(HOST + "RANK", final_ranks[id-1], id, function(err1, res){
                                callback(null, Math.abs(score - final_ranks[id-1]));
                            });
                        });

                    }, function (e, epses) {
                        async.reduce(epses, 0, function(prev, next, cb){
                            setImmediate(function () { cb(null, prev + next); });
                        }, function(err, eps){
                            if (eps > EPS){
                                Iteration(i+1);
                            } else Results();
                        });

                    });
                });
            });
        });
    };

    client.get(HOST + "COUNTER", function (err, counter){
        client.get(HOST, function(er, re){
            if (re == 'crawled'){
                N = counter;
                client.del(HOST + "RANK", function(err, res){
                    var array_of_ids = []; // array of ids
                    for (var j = 1; j <= N; j++) {
                        array_of_ids.push(j);
                    }
                    async.map(array_of_ids, function(id, callback){
                        client.zadd(HOST + "RANK", BASE / N, id, function(e, r){
                            callback(null, id );
                        });
                    }, function (err, results) {
                        Iteration(1);
                    });
                });

            } else {
                Logger.info("Im' not going to recalculate")
            }
        });
    });

    var Results = function(){
        client.zrevrange(HOST + "RANK", 0, TOP - 1, function(err, top){
            Logger.info(top);
            client.set(HOST, 'ranked');

            async.map(top, function(id, callback){
                client.get(HOST + "R"+id, function(err, url){
                    client.zscore(HOST + "RANK", id, function(err, score){
                        callback(null,{'url':url, 'score':score});
                    })
                });

            }, function(err, finals){
                var locals = {
                    finals: finals,
                    email: EMAIL,
                    host: HOST,
                    N: N,
                    DOMAIN: url.parse(HOST).hostname,
                    top: TOP,
                    iterations: last_iteration
                };
                Logger.info(last_iteration + " iterations");
                Logger.info(locals);
                send_email(locals);
            });


        });
    };

};


