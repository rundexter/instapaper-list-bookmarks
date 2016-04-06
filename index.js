var Instapaper = require('instapaper')
  , _          = require('lodash')
  , q          = require('q')
  , util       = require('./util.js')
;

var apiUrl = 'https://www.instapaper.com/api/1.1';

var outputsPickResult = {
    user       : 'user',
    bookmarks  : 'bookmarks',
    highlights : 'highlights',
    delete_ids : 'delete_ids'
};

var inputPickData = {
    limit     : 'limit',
    folder_id : {
       key    : 'folder_id'
       , type : 'array'
    }
};

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var auth        = dexter.provider('instapaper').credentials()
          , client      = Instapaper(auth.consumer_key, auth.consumer_secret, {apiUrl: apiUrl})
          , folder_ids  = step.input('folder_id')
          , limit       = step.input('limit').first()
          , self        = this
          , connections = []
          , bookmarks   = []
        ;

        //hack to search the root folder when no id is supplied
        if(!folder_ids || !folder_ids.length) folder_ids = [null];

        client.setOAuthCredentials(auth.access_token, auth.access_token_secret);

        var self = this;
        _.each(folder_ids,function(folder_id) {
            var deferred = q.defer();
            client.bookmarks.list({folder_id: folder_id, limit: limit || 25})
               .then(function(result) {
                   result = JSON.parse(result);
                   var _bookmarks = _.map(result.bookmarks, function(bookmark) {
                        return {
                            id     : bookmark.bookmark_id
                            , url  : bookmark.url
                            , time : bookmark.time
                            , title: bookmark.title
                        };
                   });

                   Array.prototype.splice.apply(bookmarks, [bookmarks.length, 0].concat(_bookmarks));
                   deferred.resolve();
               }).catch(function(err) {
                   deferred.reject(err);
               });

            connections.push(deferred.promise);
        });

        q.all(connections)
           .then(this.complete.bind(this, bookmarks))
           .fail(this.fail.bind(this));
    }
};
