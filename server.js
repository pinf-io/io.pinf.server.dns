
const ASSERT = require("assert");


require("io.pinf.server.www").for(module, __dirname, function(app, config, HELPERS) {

	var profiles = config.config.profiles || null;

	app.post("/ensure", function (req, res, next) {
		try {

			ASSERT.equal(typeof req.body, "object", "No JSON data posted!");
			ASSERT.equal(typeof req.body.profile, "string", "'profile' property not set to string in JSON body!");
			ASSERT.equal(typeof req.body.records, "object", "'records' property not set to object in JSON body!");
			ASSERT.equal(typeof req.headers.token, "string", "'token' header not set!");

			if (!profiles) {
				return next(new Error("No profiles configured!"));
			}

			if (!profiles[req.body.profile]) {
				return next(new Error("Profile '" + req.body.profile + "' not found!"));
			}

			if (profiles[req.body.profile].tokens.indexOf(req.headers.token) === -1) {
				return next(new Error("Token '" + req.headers.token + "' not found for profile '" + req.body.profile + "'!"));
			}

			if (!profiles[req.body.profile].allow) {
				return next(new Error("No 'allow' rules configured for profile '" + req.body.profile + "'!"));
			}
			if (!profiles[req.body.profile].adapters) {
				return next(new Error("No 'adapters' configured for profile '" + req.body.profile + "'!"));
			}

			var records = req.body.records;

			console.log("profiles", JSON.stringify(profiles, null, 4));
			console.log("records", JSON.stringify(records, null, 4));

			var allow = 0;
			records.forEach(function (record) {
				var matched = profiles[req.body.profile].allow.filter(function (rule) {
					return ((new RegExp(rule)).exec(record.name.replace(/\*/g, "")) !== null);
				});
				if (matched.length > 0) {
					allow += 1;
				} else {
					console.log("Warning: Record '" + record.name + "' did not match any rules for profile '" + req.body.profile + "'!");
				}
			});
			if (allow !== records.length) {
				return next(new Error("Profile '" + req.body.profile + "' does now allow all requested records: " + JSON.stringify(records, null, 4)));
			}

			var waitfor = HELPERS.API.WAITFOR.serial(function (err) {
				if (err) return next(err);
				return res.end(JSON.stringify({}, null, 4));
			});
			for (var name in profiles[req.body.profile].adapters) {
				waitfor(name, profiles[req.body.profile].adapters[name], function (name, settings, callback) {
                    // TODO: Use `require.async`.
                    var adapter = require("pio.dns/adapters/" + name);
                    if (!adapter) {
                        console.error("ERROR: Could not load adapter '" + "pio.dns/adapters/" + name + "'!");
                    }
                    if (!adapter.adapter) {
                        console.error("ERROR: Adapter '" + "pio.dns/adapters/" + name + "' does not export 'adapter.adapter'!");
                    }
                    var adapter = new adapter.adapter(settings);
                    console.log(("Provisioning DNS records using adapter '" + name + "': " + JSON.stringify(records, null, 4)).magenta);
                    return adapter.ensure(records).then(function () {
                		return callback(null);
                    }).fail(function(err) {
                        err.mesage += " (while provisioning DNS using settings '" + JSON.stringify(settings) + "')";
                        err.stack += "\n(while provisioning DNS using settings '" + JSON.stringify(settings) + "')";
                        return callback(err);
                    });
				});
			}
			return waitfor();

		} catch (err) {
			return next(err);
		}
	});

});
