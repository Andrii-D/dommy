var Crawler = require("crawler");
var url = require('url');
var urls = [];
var client = require('./utils/redis');
var SITE_HOST = "http://preply.com";

var isStaticHref = function(href){
    var statics = [
        '/static',
        '.js',
        '.css',
        '.jpeg',
        '.png',
        '.csv',
        '.jpg',
        '.gif',
        'xml',
        'void(0);',
        '.ico'
    ];
    return statics.reduce(function(prev, cur){
                if (prev == true) { return true; } else {return (href.indexOf(cur) != -1)}
           }, false);
};



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
//                        console.log("toQ " + toQueueUrl, isStaticHref(toQueueUrl));
                        if (typeof toQueueUrl != 'undefined')
                            if (isStaticHref(toQueueUrl) == false && toQueueUrl.indexOf('//') != 0 && toQueueUrl.indexOf('mailto') != 0 && toQueueUrl != '' && toQueueUrl != null)
                                if (toQueueUrl.indexOf('http') != 0 || toQueueUrl.indexOf(SITE_HOST) == 0) {
                                    var pathname = url.parse(toQueueUrl).pathname;
//                                    console.log(toQueueUrl, pathname);
                                    if (typeof pathname == 'undefined' || pathname == null) pathname = '/';
                                    if (pathname.indexOf('./') == 0) { pathname = pathname.substring(1, pathname.length);}
                                    if (pathname.indexOf('/') != 0) { pathname = "/" + pathname}

                                    var next_url = SITE_HOST + pathname;
//                                    console.log(next_url);
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

                } else {
                    client.sadd("ERRORURLS", result.request.uri.href);

                }

            } catch(err)  { console.log(err); }

        }

    },
    onDrain: function (){
        client.get("COUNTER", function (err, counter){

            if (counter > 3){
                console.log(counter);
            }
        });

    },
    rateLimits: 1,
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

