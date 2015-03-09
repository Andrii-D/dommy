var fs = require('fs');
var csv = require('fast-csv');
var stream = fs.createReadStream("static/top-1m.csv");
var request = require('request');

csv.fromStream(stream).on("data", function(data){
        var index = parseInt(data[0]);
        if (index > 1000 && index < 2000){
            var domain = data[1];
            console.log(domain);


            request.post('http://localhost:3006/api',
                { form: { domain: domain } },
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
//                        console.log(body)
                    }
                }
            );
        }
    }).on("end", function(){
        console.log("done");
    });