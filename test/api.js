
const PATH = require("path");
const PIO = require("pio");
const REQUEST = require("request");


describe("api", function() {

    var config = null;
    function getConfig(callback) {    
        if (config) return callback(null, config);
        return PIO.forPackage(PATH.dirname(__dirname)).then(function(pio) {
            config = pio._state || pio._config.config["pio.service"].config;
            return callback(null, config);
        }).fail(callback);
    }

    /**
     * API Tests
     */

    it("/ensure", function(done) {
        return getConfig(function (err, config) {
            if (err) return done(err);

            return REQUEST({
                method: "POST",
                url: "http://" + config.test.host + "/ensure",
                json: {
                    hello: "world"
                }
            }, function(err, response, body) {
                if (err) return done(err);

console.log("response.statusCode", response.statusCode);
console.log("response.headers", response.headers);
console.log("body", body);

                return done();
            });
        });
    });

});
