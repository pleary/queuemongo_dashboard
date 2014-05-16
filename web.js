var express = require('express');
var path = require('path');
var stylus = require('stylus');
var http = require('http');
var routes = require('./routes');
var app = express();

app.use(express.compress());
app.use(express.json());
app.use(express.urlencoded());

app.set('view engine', 'jade');

app.use(stylus.middleware({
  src: __dirname + '/public',
  dest: __dirname + '/public'
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);
app.get('/queues/:id', routes.index);
app.get('/api/queues', routes.all_queues);
app.get('/api/queues/:id', routes.queue);
app.get('/api/queues/:id/pending', routes.queue_pending);
app.get('/api/queues/:id/in-progress', routes.queue_in_progress);
app.get('/api/queues/:id/done', routes.queue_done);
app.get('/api/queues/:id/failed', routes.queue_failed);

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});
