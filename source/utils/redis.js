var env = process.env.NODE_ENV || 'development';
if(env != 'development'){
  var redis = require("redis"), client = redis.createClient(19215, process.env.REDIS_URL, {});
  client.auth(process.env.REDIS_PASS)
}else{
  var redis = require("redis"), client = redis.createClient();

}

client.on("error", function (err) {
  logger.error("Error " + err);
});

module.exports = client;
