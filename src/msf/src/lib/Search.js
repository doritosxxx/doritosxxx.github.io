"use strict";

var util = require("./util");
var props = util.props;
var EventEmitter = require('./EventEmitter');


/**
 * Provides members related to {@link Service} discovery.
 *
 * @class Search
 * @extends EventEmitter
 * @hide-constructor
 *
 */

function Search(){

    Search.super_.call(this);
    this.discorveryFrame = null;
    this.status = Search.STATUS_STOPPED;

    var self = this;
    var result = [];

    window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;   //compatibility for firefox and chrome
    
    var pc = new window.RTCPeerConnection({iceServers:[]}), noop = function(){};

    var MTgetByURI = function(a){
        var i = 0;
        var ip = "";
        var iptemp = a.split(".");
        
        function remoteCallback(err, service) {
            result.push(service);
        }
        
        for(i=0;i <= 255 ; i++)
        {
            ip = iptemp[0]+ '.' + iptemp[1]+ '.' + iptemp[2] + '.' + i;
            window.msf.remote('http://'+ip+':8001/api/v2/',remoteCallback);
        }
    };
    
    var sendTVList = function(){
        self.onSearchResult(result);
    };
    
    pc.createDataChannel("");    //create a bogus data channel
    pc.createOffer(pc.setLocalDescription.bind(pc), noop);    // create offer and set local description
    pc.onicecandidate = function(ice){  //listen for candidate events
        if(!ice || !ice.candidate || !ice.candidate.candidate)  return;
        var myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate)[1];
        var pc2 = new MTgetByURI(myIP);
        setTimeout(function(){sendTVList();},3000);
        pc.onicecandidate = noop;
    };

}

util.inherits(Search, EventEmitter);


/***
 * @constant {string}
 * @private
 */
Search.STATUS_STOPPED = 'stopped';

/***
 * @constant {string}
 * @private
 */
Search.STATUS_STARTED = 'started';


/**
 * Starts the search, looking for devices it can reach on the network
 * If a search is already in progress it will NOT begin a new search
 *
 * @example
 *
 * var search = msf.search();
 * search.on('found', function(service){
 *    console.log('found service '+service.name);
 * }
 * search.start();
 *
 */
Search.prototype.start = function(){
    if(this.status === Search.STATUS_STOPPED){
        if(this.discoveryFrame){
            this.discoveryFrame.postMessage({method:'discovery.search'}, "*");
        }else{
            var self = this;
            this.once('ready',function(){
                self.discoveryFrame.postMessage({method:'discovery.search'}, "*");
            });
        }
        this.onSearchStart();
    }else{
        console.warn('a previous search is already in progress');
    }
};

/**
 * Stops the current search in progress (no 'found' events or search callbacks will fire)
 *
 * @example
 * search.stop();
 *
 */
Search.prototype.stop = function(){
    this.onSearchStop();
};

Search.prototype.onSearchReady = function(){
    this.emit('ready');
};


/**
 * Fired when a search has discovered compatible services
 *
 * @event Search#found
 * @type {Array}
 * @example
 * search.on('found', function(service){
 *    console.log('found '+service.name);
 * });
 */


Search.prototype.onSearchResult = function(results){
    if(this.status !== Search.STATUS_STOPPED){
        this.emit('found',results);
    }
    this.status = Search.STATUS_STOPPED;
};


/**
 * Fired when a search error has occurred
 *
 * @event Search#error
 * @type {Error}
 * @example
 * search.on('error', function(err){
 *    console.error('something went wrong', err.message);
 * });
 */

Search.prototype.onSearchError = function(error){
    this.emit('error',error);
    this.status = Search.STATUS_STOPPED;
};

/**
 * Fired when a search has been started
 *
 * @event Search#start
 * @type {Search}
 *
 * @example
 * search.on('start', function(){
 *    ui.setState('searching');
 * });
 */
Search.prototype.onSearchStart = function(){
    this.status = Search.STATUS_STARTED;
    this.emit('start', this);
};

/**
 * Fired when a search has been stopped
 *
 * @event Search#stop
 * @type {Search}
 * @example
 * search.on('stop', function(){
 *    ui.setState('stopped');
 * });
 */
Search.prototype.onSearchStop = function(){
    this.status = Search.STATUS_STOPPED;
    this.emit('stop', this);
};


module.exports = Search;
