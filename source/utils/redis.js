var env = process.env.NODE_ENV || 'development';
var logger = require('./logger');
if(env != 'development'){
  var redis = require("redis"), client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_URL, {});
  client.auth(process.env.REDIS_PASS)
}else{
  var redis = require("redis"), client = redis.createClient();
}

client.on("error", function (err) {
  logger.error("Redis Error " + err);
});

module.exports = client;
