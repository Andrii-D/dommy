var Crawler = require("crawler");
var url = require('url');
var pr = require('./page_rank');
var client = require('./utils/redis');
var MAX_PAGES = 1500;

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

var crawl = function(host, email){
    var SITE_HOST = host;
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
//                        console.log(result.request.uri);
//                        console.log("=="+parent_url);
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
                                        if (pathname.indexOf('../') == 0) { pathname = pathname.substring(2, pathname.length);}
                                        if (pathname.indexOf('/') != 0) { pathname = "/" + pathname}

                                        var next_url = SITE_HOST + pathname;
//                                        console.log("     -> "+next_url);
                                        client.sadd(SITE_HOST + "ALLURLS", next_url, function(err, response){
                                            if (response == '1'){ // next_url is new!!!

                                                client.incr(SITE_HOST + "COUNTER", function(err, counter){
                                                    client.set(SITE_HOST + "URL" + next_url, counter);
                                                    client.set(SITE_HOST + "R" + counter, next_url);
                                                    client.get(SITE_HOST + "URL" + parent_url, function (err, parent_id){
                                                        client.zincrby(SITE_HOST + "OUT" + parent_id, 1, counter);
                                                        client.zincrby(SITE_HOST + "IN" + counter, 1, parent_id);
                                                        console.log(parent_url+"("+parent_id+") -> "+ next_url+"("+counter+")");

//                                                        console.log(next_url + "(" + parent_url + ")");
                                                        if (counter < MAX_PAGES){
                                                            c.queue(next_url);
                                                        }

                                                    });
                                                });

                                            } else { // next_url already exists
                                                client.get(SITE_HOST + "URL" + parent_url, function (err, parent_id){
                                                    client.get(SITE_HOST + "URL" + next_url, function (err, next_id){
                                                        client.zincrby(SITE_HOST + "OUT" + parent_id, 1, next_id);
                                                        client.zincrby(SITE_HOST + "IN" + next_id, 1, parent_id);
//                                                        console.log(parent_url+"("+parent_id+") -> "+ next_url+"("+next_id+")");
                                                    });
                                                });

                                            }
                                        });
                                    }


                        });

                    } else {
                        client.sadd(SITE_HOST + "ERRORURLS", result.request.uri.href);

                    }

                } catch(err)  { console.log(err); }

            }

        },
        onDrain: function (){
            client.get(SITE_HOST + "COUNTER", function (err, counter){
//                console.log("drain"+counter);
                if (counter > 3){
                    console.log(counter);
                    client.set(SITE_HOST, 'crawled', function(err,re){
                        pr(SITE_HOST, email);
                    });
                }
            });

        },
        rateLimits: 100,
        maxConnections: 1,
        userAgent: "Preck",
        skipDuplicates: true
    });

    client.incr(SITE_HOST + "COUNTER", function(err, counter) {
        client.sadd(SITE_HOST + "ALLURLS", SITE_HOST + '/', function(err,res){

            if (res == '0'){
                client.decr(SITE_HOST + "COUNTER", function(err, counter) {
                    console.log("Already crawled " + SITE_HOST);
                    client.set(SITE_HOST, 'crawled', function(err,re){
                        pr(SITE_HOST, email);
                    });

                })
            } else {
                client.set(SITE_HOST + "URL" + SITE_HOST + '/', counter);
                client.set(SITE_HOST + "R" + counter, SITE_HOST + '/');
                client.set(SITE_HOST, 'crawling', function(e, r){
                    console.log("Start crawling " + SITE_HOST);
                    c.queue(SITE_HOST + '/');
                });

            }
        });

    });
};

//crawl("http://www.easybusiness.in.ua", "sdfsdf");
//crawl("http://getbootstrap.com", "sdfsdf");
//crawl("http://proukrgov.info", "sdfsdf");
//crawl("http://ugift.com.ua", "sdfsdf");
module.exports = crawl;
