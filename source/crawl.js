var Crawler = require("crawler");
var url = require('url');
var urls = [];
var client = require('./utils/redis');
var SITE_HOST = "http://localhost";

var c = new Crawler({
    maxConnections : 10,
    callback : function (error, result, $) {
        if (error){
            console.log("request error " + error)
        } else
        {
            try{
                if (result.statusCode == 200){

                    var parent_url = SITE_HOST + result.request.uri.pathname;

                    $('a, link').each(function(index, a) {
                        var toQueueUrl = $(a).attr('href');

                        if (typeof toQueueUrl != 'undefined')
                            if (toQueueUrl.indexOf('/static') == -1 && toQueueUrl.indexOf('//') != 0)
                                if ( toQueueUrl.indexOf('/') == 0 || toQueueUrl.indexOf('./') == 0 || toQueueUrl.indexOf("http://preply.com") == 0) {
                                    var next_url = SITE_HOST + url.parse(toQueueUrl).pathname;
                                    client.sadd("ALLURLS", next_url, function(err, response){
                                        if (response == '1'){ // next_url is new!!!
                                            console.log(next_url + "(" + parent_url + ")");
                                            client.incr("COUNTER", function(err, counter){
                                                client.set(next_url, counter);
                                                client.set("R" + counter, next_url);
                                                client.get(parent_url, function (err, parent_id){
                                                    client.zincrby("OUT" + parent_id, 1, counter);
                                                    client.zincrby("IN" + counter, 1, parent_id);
                                                    c.queue(next_url);
                                                });
                                            });

                                        } else { // next_url already exists
                                            client.get(parent_url, function (err, parent_id){
                                                client.get(next_url, function (err, next_id){
                                                    client.zincrby("OUT" + parent_id, 1, next_id);
                                                    client.zincrby("IN" + next_id, 1, parent_id);
                                                });
                                            });

                                        }
                                    });
                                }


                    });

                } else
                {
                    client.sadd("ERRORURLS", result.request.uri.href);

                }

            } catch(err)  { console.log(err); }

        }

    },
    onDrain: function (){
        client.get("COUNTER", function (err, counter){

            if (counter > 10){
                console.log(counter);
            }
        });

    },
    rateLimits: 0,
    userAgent: "Preck",
    skipDuplicates: true
});

//Queue just one URL, with default callback
client.incr("COUNTER", function(err, counter) {
    client.sadd("ALLURLS", SITE_HOST + '/');
    client.set(SITE_HOST + '/', counter);
    client.set("R" + counter, SITE_HOST + '/');
    c.queue(SITE_HOST + '/');
});

