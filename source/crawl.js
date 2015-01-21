var Crawler = require("crawler");
var url = require('url');
var pr = require('./page_rank');
var client = require('./utils/redis');
var Logger = require('./utils/logger');
var MAX_PAGES = 60000;
var CONNECT_DELAY = 100;


var isStaticHref = function(h){
    var statics = [
        '/static',
        '.js',
        '.css',
        '.jpeg',
        '.png',
        '.csv',
        '.jpg',
        '.gif',
        '.xml',
        'void(',
        '.ico',
        '.less',
        ',',
        ';'
    ];
    return statics.reduce(function(prev, cur){
                if (prev == true) { return true; } else {return (h.indexOf(cur) != -1)}
           }, false);
};

var isInternalLink = function(h){
    return (!!h && !isStaticHref(h) && !h.startsWith('//') && !h.startsWith('mailto') && !h.startsWith('http') && !!url.parse(h).pathname)
};

var isNumber = function (o) {
    return ! isNaN (o-0) && o !== null && o !== "" && o !== false;
};

module.exports = function(host, email){
    var SITE_HOST = host.toLowerCase();
    var addNewLink = function(new_link, parent_link){
        client.incr(SITE_HOST + "COUNTER", function (error, counter) {
            client.set(SITE_HOST + "URL" + new_link, counter, function (err, resp) {
                client.set(SITE_HOST + "R" + counter, new_link, function(err, resp){
                    client.get(SITE_HOST + "URL" + parent_link, function (err, parent_id) {
                        if (isNumber(parent_id)){
                            client.zincrby(SITE_HOST + "OUT" + parent_id, 1, counter, function(err, resp){
                                client.zincrby(SITE_HOST + "IN" + counter, 1, parent_id, function(err, resp){
//                                    console.log(parent_link + "(" + parent_id + ") -> "+ new_link + "(" + counter + ")");
                                    if (counter < MAX_PAGES) {
                                        c.queue(new_link);
                                    }
                                });
                            });
                        }
                    });
                });
            });
        });
    };

    var addExistedLink = function(new_link, parent_link){
        client.get(SITE_HOST + "URL" + parent_link, function (err, parent_id) {
            if (isNumber(parent_id)){
                client.get(SITE_HOST + "URL" + new_link, function (err, next_id) {
                    if (isNumber(next_id)){
                        client.zincrby(SITE_HOST + "OUT" + parent_id, 1, next_id, function(err, resp){
                            client.zincrby(SITE_HOST + "IN" + next_id, 1, parent_id);
                        });
                    }
                });
            }
        });
    };

    var c = new Crawler({
        callback : function (error, result, $) {
            if (error){
                Logger.error("request error " + error);
                return;
            }
            if (result.statusCode == 200){
                try {
                    var parent_url = url.resolve(SITE_HOST, result.request.uri.pathname).toLowerCase();
                    $('a, link').each(function(index, a) {
                        var href = $(a).attr('href');
                        if (isInternalLink(href)) {
                            var next_url = url.resolve(SITE_HOST, url.parse(href).pathname).toLowerCase();
                            client.sadd(SITE_HOST + "ALLURLS", next_url, function (error, response) {
                                if (response == '1') {
                                    addNewLink(next_url, parent_url);
                                } else {
                                    addExistedLink(next_url, parent_url);
                                }
                            });
                        }
                    });
                } catch(err) {
                    Logger.error(err)
                }

            }
        },
        onDrain: function (){
            client.get(SITE_HOST + "COUNTER", function (err, counter){
                if (counter > 3){
                    Logger.info("Crawled " + counter + " pages");
                    client.set(SITE_HOST, 'crawled', function(err,re){
                        pr(SITE_HOST, email);
                        console.log("Drain")
                    });
                }
            });

        },
        rateLimits: CONNECT_DELAY,
        maxConnections: 1,
        userAgent: "Localizely Crawler",
        skipDuplicates: true
    });

    client.incr(SITE_HOST + "COUNTER", function(err, counter) {
        client.sadd(SITE_HOST + "ALLURLS", SITE_HOST + '/', function(err,res){
            if (res == '0'){
                client.decr(SITE_HOST + "COUNTER", function(err, counter) {
                    Logger.info("Already crawled " + SITE_HOST);
                    client.set(SITE_HOST, 'crawled', function(err,re){
                        pr(SITE_HOST, email);
                    });
                })
            } else {
                client.set(SITE_HOST + "URL" + SITE_HOST + '/', counter);
                client.set(SITE_HOST + "R" + counter, SITE_HOST + '/');
                client.set(SITE_HOST, 'crawling', function(e, r){
                    Logger.info("Start crawling " + SITE_HOST);
                    c.queue(SITE_HOST + '/');
                });

            }
        });

    });
};


if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str){
        return this.slice(-str.length) == str;
    };
}

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
        return this.slice(0, str.length) == str;
    };
}