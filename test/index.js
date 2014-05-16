var expect = require('chai').expect,
    request = require('supertest'),
    express = require('express'),
    _ = require('underscore'),
    QueueMongo = require('queuemongo'),
    routes = require('../routes'),
    testQueueName = 'test';

var app = express();
app.set('view engine', 'jade');
app.get('/', routes.index);
app.get('/queues/:id', routes.index);
app.get('/api/queues', routes.all_queues);
app.get('/api/queues/:id', routes.queue);
app.get('/api/queues/:id/pending', routes.queue_pending);
app.get('/api/queues/:id/in-progress', routes.queue_in_progress);
app.get('/api/queues/:id/done', routes.queue_done);
app.get('/api/queues/:id/failed', routes.queue_failed);

describe('routes', function() {
  before(function(done) {
    queue = new QueueMongo('mongodb://127.0.0.1', testQueueName, function(err) {
      queue.db.dropCollection(testQueueName);
      queue.pushItem({ name: 'John', status: 'pending' }, function() {
        queue.pushItem({ name: 'Paul', status: 'in-progress' }, function() {
          queue.pushItem({ name: 'George', status: 'done' }, function() {
            queue.pushItem({ name: 'Ringo', status: 'failed' }, function() {
              done();
            });
          });
        });
      });
    });
  });

  describe('GET /', function() {
    it('contain the expected components', function(done) {
      request(app)
        .get('/')
        .expect(200)
        .expect(/QueueMongo/)
        .expect(/Queues<b/)
        .expect(/Refresh Rate<b/)
        .expect(/<h3>Pending/)
        .expect(/<h3>In-Progress/)
        .expect(/<h3>Done/)
        .expect(/<h3>Failed/, done);
    });
  });

  describe('GET /queues/:id', function() {
    it('sets the data-queue attribute got the requested queue', function(done) {
      var expectRegex = new RegExp('data-queue="' + testQueueName + '"');
      request(app)
        .get('/queues/' + testQueueName)
        .expect(200)
        .expect(expectRegex, done);
    });
  });

  describe('GET /api/queues', function() {
    it('returns a list of all queues', function(done) {
      request(app)
        .get('/api/queues')
        .expect(200)
        .expect(function(res) {
          var testQueue = _.findWhere(res.body, { name: 'test' });
          expect(testQueue.name).to.eq(testQueueName);
          expect(testQueue.counts).to.deep.eq({ pending: 1, 'in-progress': 1, done: 1, failed: 1 });
        }).end(done);
    });
  });

  describe('GET /api/queues/:id', function() {
    it('returns info on a single queue', function(done) {
      request(app)
        .get('/api/queues/' + testQueueName)
        .expect(200)
        .expect(function(res) {
          expect(res.body.length).to.eq(4);
          expect(_.map(res.body, function(item) { return item['name']; })).to.
            deep.eq([ 'John', 'Paul', 'George', 'Ringo' ]);
        }).end(done);
    });
  });

  describe('GET /api/queues/:id/pending', function() {
    it('returns pending items in a queue', function(done) {
      request(app)
        .get('/api/queues/' + testQueueName + '/pending')
        .expect(200)
        .expect(function(res) {
          expect(res.body.length).to.eq(1);
          expect(res.body[0].name).to.eq('John');
        }).end(done);
    });
  });

  describe('GET /api/queues/:id/in-progress', function() {
    it('returns in-progress items in a queue', function(done) {
      request(app)
        .get('/api/queues/' + testQueueName + '/in-progress')
        .expect(200)
        .expect(function(res) {
          expect(res.body.length).to.eq(1);
          expect(res.body[0].name).to.eq('Paul');
        }).end(done);
    });
  });

  describe('GET /api/queues/:id/done', function() {
    it('returns done items in a queue', function(done) {
      request(app)
        .get('/api/queues/' + testQueueName + '/done')
        .expect(200)
        .expect(function(res) {
          expect(res.body.length).to.eq(1);
          expect(res.body[0].name).to.eq('George');
        }).end(done);
    });
  });

  describe('GET /api/queues/:id/failed', function() {
    it('returns failed items in a queue', function(done) {
      request(app)
        .get('/api/queues/' + testQueueName + '/failed')
        .expect(200)
        .expect(function(res) {
          expect(res.body.length).to.eq(1);
          expect(res.body[0].name).to.eq('Ringo');
        }).end(done);
    });
  });
});
