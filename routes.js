var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var mongoUri = process.env.MONGOLAB_URI ||
               process.env.MONGOHQ_URL ||
               'mongodb://127.0.0.1:27017/QueueMongo';
var db = null;

mongoClient.connect(mongoUri, function(err, d) {
  db = d;
});

exports.index = function(req, res) {
  res.render('index', { queueName: req.params.id });
};

exports.all_queues = function(req, res) {
  db.collectionNames(function(err, items) {
    var collectionNames = _.reject(items, function(i) { return i['name'] == 'QueueMongo.system.indexes'; });
    collectionNames = _.map(collectionNames, function(val) {
      return val['name'].replace('QueueMongo.', '');
    });
    countItemsInCollections(_.clone(collectionNames), { }, function(counts) {
      res.json(_.map(counts, function(counts, name) {
        return { name: name, counts: counts };
      }));
    });
  });
};

exports.queue = function(req, res) {
  db.collection(req.params.id).find({ }).toArray(function(err, docs) {
    res.json(docs);
  });
};

exports.queue_pending = function(req, res) {
  getQueueItems(req, { $in: [ 'pending' ] }, { type: 1 }, function(docs) {
    res.json(docs);
  });
};

exports.queue_in_progress = function(req, res) {
  getQueueItems(req, { $in: [ 'in-progress' ] }, { }, function(docs) {
    res.json(docs);
  });
};

exports.queue_done = function(req, res) {
  getQueueItems(req, { $in: [ 'done' ] }, { timestamp: -1 }, function(docs) {
    res.json(docs);
  });
};

exports.queue_failed = function(req, res) {
  getQueueItems(req, { $nin: [ 'pending', 'in-progress', 'done' ] }, { }, function(docs) {
    res.json(docs);
  });
};

var countItemsInCollections = function(collectionNames, counts, callback) {
  var collectionName = collectionNames.pop();
  if(collectionName) {
    db.collection(collectionName).group({ status: 1 }, { }, { count: 0 },
                                        "function (obj, prev) { prev.count++; }",
                                        function(err, results) {
      counts[collectionName] = { };
      _.each(results, function(result) {
        if([ 'pending', 'in-progress', 'done' ].indexOf(result.status) === -1) {
          result.status = 'failed';
        }
        counts[collectionName][result.status] = result.count;
      });
      countItemsInCollections(collectionNames, counts, callback);
    });
  } else callback(counts);
};

var getQueueItems = function(req, statusCondition, sort, callback) {
  queue = db.collection(req.params.id).find({ status: statusCondition }).sort(sort).toArray(function(err, docs) {
    callback(docs);
  });
};
