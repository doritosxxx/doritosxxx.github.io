"use strict";

function createDescriptor(e,c,w,v){
    return {
        enumerable : e,
        configurable : c,
        writable : w,
        value : v
    };
}

module.exports = {

    readOnly : function(obj, key){

        if(Array.isArray(key)){
            key.forEach(function(k){
                Object.defineProperty(obj, k, createDescriptor(true,true,false,obj[k]));
            });
        }else{
            Object.defineProperty(obj, key, createDescriptor(true,true,false,obj[key]));
        }

    },

    private : function(obj, key){

        if(Array.isArray(key)){
            key.forEach(function(k){ Object.defineProperty(obj, k, createDescriptor(false,true,true,obj[k])); });
        }else{
            Object.defineProperty(obj, key, createDescriptor(false,true,true,obj[key]));
        }
    }
};
