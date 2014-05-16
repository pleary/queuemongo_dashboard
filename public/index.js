var refreshRate = 0;
var pendingRefresh = null;
var queueName = null;

$(function () {
  loadQueuesMenuItems();
  loadQueue();
  addRefreshRateMenuEvents();
  handleBackButton();
  if(queueName = $('.container.main').attr('data-queue')) {
    history.replaceState({ queueName: queueName }, '', '/queues/' + queueName);
  }
});

// add events to the Refresh Rate menu items
var addRefreshRateMenuEvents = function() {
  $('ul.refresh li a').on('click', function(e) {
    e.preventDefault();
    if($(this).data('refresh') === 'now') {
      loadQueue();
    } else {
      $('ul.refresh li').removeClass('active');
      $(this).closest('ul.refresh li').addClass('active');
      if($(this).data('refresh') === 0) {
        refreshRate = 0;
        if(pendingRefresh !== null) {
          clearTimeout(pendingRefresh);
          pendingRefresh = null;
        }
      } else {
        refreshRate = $(this).data('refresh') * 1000;
        if(pendingRefresh === null) {
          loadQueue();
        }
      }
    }
  });
};

// make an API call to fetch the list of queues and populate the Queue menu
var loadQueuesMenuItems = function() {
  $.getJSON('/api/queues', function(data) {
    $('.queue-list').empty();
    $.each(data, function(key, value) {
      var link = $('<a href="">').text(value.name).on('click', selectQueuesMenuItem);
      $('.queue-list').append($('<li>').append(link));
    });
  });
};

// recognize the selection of an queue from the Queues menu
var selectQueuesMenuItem = function() {
  var queueName = $(this).text();
  // record the queue name in the DOM
  $('.container.main').attr('data-queue', queueName);
  // add the URL for this queue to the browser history
  history.pushState({ queueName: queueName }, '', '/queues/' + queueName);
  loadQueue();
};

// make API calls to load the items for the selected
// queue, and replace the display with the new items
var loadQueue = function() {
  if(pendingRefresh !== null) {
    clearTimeout(pendingRefresh);
    pendingRefresh = null;
  }
  // if we have a queue selected
  if(queueName = $('.container.main').attr('data-queue')) {
    // load the items for each of the four types
    loadTypeIntoDiv(queueName, 'pending');
    loadTypeIntoDiv(queueName, 'in-progress');
    loadTypeIntoDiv(queueName, 'done');
    loadTypeIntoDiv(queueName, 'failed');
    $('.column').show();
    if(refreshRate !== 0) {
      pendingRefresh = setTimeout(function() {
        loadQueue(queueName);
      }, refreshRate);
    }
  }
};

// make an API call to fetch the items in a queue of a given type
// (e.g. 'pending') and update the correspoding div with the items
var loadTypeIntoDiv = function(queueName, type) {
  var itemClass = 'alert-info';
  // set the class of the items for display
  if(type === 'in-progress') itemClass = 'alert-warning';
  if(type === 'done') itemClass = 'alert-success';
  if(type === 'failed') itemClass = 'alert-danger';
  $.getJSON('/api/queues/' + queueName + '/' + type, function(data) {
    var div = $('.' + type).empty();
    // resest the count in the sections header
    div.siblings('h3').text(div.siblings('h3').text().replace(/\(.*$/, '') + ' (' + data.length + ')');
    // only show the first 200 items of a type
    $.each(data.slice(0, 200), function(key, item) {
      // leave in the status of failed items as the status
      // may contain error reporting information
      if(type !== 'failed') {
        delete item.status;
      }
      // create the element and add it to the div
      var el = $('<div class="alert '+ itemClass +'">').append(itemToElement(item));
      div.append(el);
    });
    // when there are no items the div will get a non-breaking
    // space just so it has something and keeps its shape
    if(div.html() === '') {
      div.html('&nbsp;');
    }
  });
};

// turn the item JSON that is returned from the APIs
// into some HTML that we can add to the page
var itemToElement = function(item) {
  var html = $('<dl>');
  $.each(item, function(key, value) {
    html.append($('<dt>').text(key));
    html.append($('<dd>').text(value));
  });
  return html;
};

// make sure that the back button will pop items of the state
// stack and reload queues as necessary, or return to the index page
var handleBackButton = function() {
  $(window).bind('popstate', function(event) {
    if (event.originalEvent.state && event.originalEvent.state['queueName']) {
      // we have a queue, so record it and load its items
      $('.container.main').attr('data-queue', event.originalEvent.state['queueName']);
      loadQueue();
    } else {
      // there is no queue for this state, so show the index page
      $('.container.main').attr('data-queue', null);
      $('.column').hide();
    }
  });
};
