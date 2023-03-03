"use strict";

var levels = ['error','warn','info','verbose','debug','silly'];

var logger = {

    level : 'disabled',

    log : function(level /* ,....args*/){
        if(logger.level !== 'disabled' && (levels.indexOf(level) <= levels.indexOf(logger.level))){
            var args = Array.prototype.slice.call(arguments,1);
            args.unshift('[MSF:'+level.toUpperCase()+']');
            if(console[level]){
                console[level].apply(console,args);
            }else{
                console.log.apply(console,args);
            }

        }
    }

};

function createLevel(level){
    return function(/*args*/){
        var args = Array.prototype.slice.call(arguments);
        args.unshift(level);
        logger.log.apply(logger,args);
    };
}

// Create logger methods based on levels
for(var i=0; i<levels.length; i++){
    var level = levels[i];
    logger[level] = createLevel(level);
}

module.exports = logger;
