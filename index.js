var Instapaper = require('instapaper'),
    _ = require('lodash'),
    q = require('q'),
    util = require('./util.js');

var apiUrl = 'https://www.instapaper.com/api/1.1';

var outputsPickResult = {
    'user': 'user',
    'bookmarks': 'bookmarks',
    'highlights': 'highlights',
    'delete_ids': 'delete_ids'
};

var inputPickData = {
    'limit': 'limit',
    'folder_id': { key: 'folder_id', type: 'array' }
};

module.exports = {

    /**
     * Authorize module.
     *
     * @param dexter
     * @returns {*}
     */
    authModule: function (dexter) {
        var auth = {},
            consumerKey = dexter.environment('instapaper_consumer_key'),
            consumerSecret = dexter.environment('instapaper_consumer_secret'),

            username = dexter.environment('instapaper_username'),
            password = dexter.environment('instapaper_password');

        if (consumerKey && consumerSecret && username && password) {

            auth.consumerKey = consumerKey;
            auth.consumerSecret = consumerSecret;
            auth.user = username;
            auth.pass = password;
        } else {

            this.fail('A [instapaper_consumer_key, instapaper_consumer_secret, instapaper_username, instapaper_password] environment need for this module.');
        }

        return _.isEmpty(auth)? false : auth;
    },
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {

        var auth = this.authModule(dexter),
            client = Instapaper(auth.consumerKey, auth.consumerSecret, {apiUrl: apiUrl}),
            inputs = util.pickStringInputs(step, inputPickData),
            connections = [];
console.log(inputs);
        client.setUserCredentials(auth.user, auth.pass);
        connections = _.map(inputs.folder_id, function(folder_id) {
            var deferred = q.defer();
            client.bookmarks.list(_.merge({folder_id: folder_id}, _.pick(inputs, 'limit'))).then(function(bookmarks) {
                deferred.resolve(util.pickResult(bookmarks, outputsPickResult));
            }.bind(this)).catch(function(err) {
                deferred.reject(err);
            }.bind(this));

            return deferred.promise;
        });

        q.all(connections).then(function(results) {
            // merge objects and return result.
            var res = results.reduce(function(result, currentObject) {
                for(var key in currentObject) {
                    if (currentObject.hasOwnProperty(key)) 
                        result[key] = (_.isArray(currentObject[key]) && _.isArray(result[key]))?
                            result[key].concat(currentObject[key]) : currentObject[key];
                }
                return result;
            }, {});
            console.log(res);
            this.complete(res);
        }.bind(this)).fail(this.fail.bind(this));
    }
};
