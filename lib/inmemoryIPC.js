'use strict';

module.exports = {
    fileToMemory: fileToMemory
}

var _childProcess = require("childProcess"),
	_ipc = require("node-ipc"),
    _ = require('lodash'),
    _normalizePath = require("normalize-path")
    ;


/*****************************************************************************/
/*****************************************************************************/
//Start of In-Memory function and associated server
/*****************************************************************************/
/*****************************************************************************/

//setup a simple http server instance


//callback pool for inMemory file requests
//categorized by the file being requested
var _cbPool = [];

//called by exports level function
//for preflight validation
function fileToMemory(config){
    var promise = new Promise(function(resolve,reject){
        // console.log('receieved a request to extract a file');
        // console.log(config);

    	//before going through the command setup, check to see
    	//if the file is already awaiting extraction
    	var existingPooldex = _.findIndex(
    		_cbPool,
    		{
                archpath: config.archpath,
                filepath: config.filepath
            }
    	);
    	if(existingPooldex > -1){
    		_cbPool[existingPooldex].pool.push({resolve: resolve, reject:reject});
    	}
    	else{
    		//start the server start process
            executeRunner(config, {resolve: resolve, reject:reject})
    	}
    });

    return promise;

}

function executeRunner(config, deferred){
    //console.log('extract requested');

    console.log('creating runner');
    //add the cbPool entry
    var entry = {
        archpath: config.archpath,
        filepath: config.filepath,
        pool: [],
    }
    entry.pool.push(deferred);
    _cbPool.push(entry);

    /**
     * Basics of the command
     *
     * Ask 7z to
     * extract from the given archive file
     * a certain filepath within the archive
     * -so -> write the resulting data to std out instead of to the fs
     * | -> pipe the output to something
     */
    // var pipeurl = 'http://localhost:' + _server_port;

    var piperpath = '"' + _normalizePath(__dirname) + '/piperIPC.js"';

    var subcommand = 'node ' + piperpath +
        ' --archpath "' + config.archpath + '"' +
        ' --filepath "' + config.filepath + '"' +
        ' --reqname "' + config.reqname + '"' +
        ' --ipcname ' + _ipc.config.id;

    if(config.verbose){
        subcommand += ' --verbose yes';
    }

    //console.log(subcommand);

    // var zpath = '"' + _normalizePath(__dirname) + '/7za.exe"';
    var zpath = '"' + _normalizePath(process.cwd()) + '/7za.exe"';
    var command = zpath + ' x "'+
                  config.archpath +'" "'+
                  config.filepath +'" -so | ' +
                  subcommand;

    //a handler function
    var eventHandler = function(eventtype, data){
        switch(eventtype){
            case "close":
            case 'exit':
                //kill the entire process tree
                runner.kill();
                break;
            //case "stdout.data":
            //case "stderr.data":
            default:
                if(config.verbose){
                    console.log(data);
                }
                break;
        }
    }

    var runner = _childProcess.generate(command, eventHandler);
    console.log('running runner');
    runner.run();
}

/*************************************************************/
//IPC Server setup and message handler
/*************************************************************/

function handle7zdata(data, socket){
    console.log('data received');

    if(!Buffer.isBuffer(data.piperfile.value.data)){
        if(Number.parseInt(process.versions.node.charAt(0)) >= 6){
            data.piperfile.value.data = Buffer.from(data.piperfile.value.data);
        }
        else{
            data.piperfile.value.data = new Buffer(data.piperfile.value.data)//Buffer.from(test);
        }
    }

    //combine the options and the value objets together into one returnable
    data.piperfile.value.contentType = data.piperfile.options.contentType;
    data.piperfile.value.filename = data.piperfile.options.filename;

    //console.log(data);
    //ipc.log('got a message : '.debug, data);
    //based on the cbPool, process the promise pool for the given file
    var poolIndex = _cbPool.findIndex(function(item){
        return (item.archpath == data.archpath) && (item.filepath == data.filepath);
    })

    var cbPoolItems = _cbPool.splice(poolIndex, 1);

    _.forEach(cbPoolItems, function(item){
        //console.log(item);
        _.forEach(item.pool, function(defer){

            defer.resolve(data.piperfile.value);
        });
    });

    _ipc.server.emit(
        socket,
        'exchangeconfirmation', //a confirmation of the exchage
        'accepted'
    );
}

_ipc.config.id = '7zmemory_' + Math.floor((Math.random() * 100000) + 1);
_ipc.config.retry= 1500;
_ipc.config.maxRetries = 5;
_ipc.config.silent = true;  //turn off logging

_ipc.serve(function(){
    //basically a custom event handle
    _ipc.server.on('7zdata', handle7zdata);
});

_ipc.server.start();
