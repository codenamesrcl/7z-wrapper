'use strict';


/**
 * A 7z extraction wrapper
 * Currently the only fully implemented extraction
 * method is single file extraction to in-memory buffer
 */

module.exports = {
	extract:{
		all:{
			toDest: allToDestination
		},
		directory:{
			toDest: directoryToDestination
		},
		file: {
			toDest: fileToDestination,
			toMemory: function(config){
				//should consider using win-spawn in this instead of http server point
				return _inMemoryExtracter.fileToMemory(config);
			},
		}
	},
	list: listContents,
	listFlat: listFlat,
}

//Should think about using forever-monitor
//or piping to stderr

var _seven_zip = require('node-7z'),
	_7z = new _seven_zip(),
	_inMemoryExtracter = require("./lib/inmemoryIPC"),
	_hierTree = require('./lib/hierTree')
	;

/*****************************************************************************/
/*****************************************************************************/
//Start of Conventional Function
/*****************************************************************************/
/*****************************************************************************/

function listFlat(archpath){
	//just get the flat list of files
	var promise = new Promise(function(resolve, reject){
		var returnable = [];

		_7z.list(archpath)
			.progress(function(contents){
				//the contents of the listing
				returnable = returnable.concat(contents);
			})
			.then(function(){
				//everything is finished
				//console.log(returnable);
				returnable = returnable.map(function(item){
						return {
							name: item.name,
							attr: item.attr
						};
					});

				returnable = _hierTree.fileList(returnable, archpath);

				resolve(returnable);
			})
			.catch(function(err){
				console.error(err);
				reject(err);
			});

    });

	return promise;
}

/**
 * Leverage node-7z's list function which
 * leverages 7z's list function
 * may get around to writing a solo function so that
 * the won't be a dependency on node-7z
 */
function listContents(archpath){
	var promise = new Promise(function(resolve, reject){
		var returnable = [];

		_7z.list(archpath)
			.progress(function(contents){
				//the contents of the listing
				returnable = returnable.concat(contents);
			})
			.then(function(){
				//everything is finished
				console.log("7z finished listing")
				//console.log(returnable);
				returnable = returnable.map(function(item){
						return {
							name: item.name,
							attr: item.attr
						};
					});

				returnable = _hierTree.assembleTree(returnable, archpath);

				resolve(returnable);
			})
			.catch(function(err){
				reject(err || "error listing");
			});

    }.bind(this));

	return promise;
}


//will do this later
function allToDestination(config){
	//sourcePath, destPath
}

//will do this later
function directoryToDestination(config){
	//sourcePath, dirPath, destPath
}

//will do this later
function fileToDestination(config){
	//sourcepath, dirPath, filename, destPath
}


/*****************************************************************************/
/*****************************************************************************/
//End of conventional functions
/*****************************************************************************/
/*****************************************************************************/



//tree-kill example for a child_process instance
// var execKiller = require("tree-kill");

// if(this.instance){
// 	execKiller(this.instance.pid, 'SIGKILL', function(err) {
// 	    // Do things
// 	});
// 	//this.instance.kill('SIGTERM');
// }
