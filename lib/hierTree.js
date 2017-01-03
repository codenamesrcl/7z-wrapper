var _ = require('lodash'),
    _mimetypes = require('mime-types'),
    _path = require('path')
    ;

function directory(path, name, archive){
    this.directories = [];
    this.files = [];
    this.name = encodeString(name);
    this.path = encodeString(path);
    this.archive = archive;
}
directory.prototype.decodedPath = function(){
    //making room for future escape sequence decoding, for now we just need the single quote decoding
    var decode = this.path.replace('&quot;', '\'');

    return decode;
}
directory.prototype.decodedName = function(){
    //making room for future escape sequence decoding, for now we just need the single quote decoding
    var decode = this.name.replace('&quot;', '\'');

    return decode;
}

function file(path, archive){
    this.path = encodeString(path);
    this.name = encodeString(_path.basename(path));
    this.archive = archive;
}
file.prototype.decodedPath = function(){
    //making room for future escape sequence decoding, for now we just need the single quote decoding
    var decode = this.path.replace('&quot;', '\'');

    return decode;
}
file.prototype.decodedName = function(){
    //making room for future escape sequence decoding, for now we just need the single quote decoding
    var decode = this.name.replace('&quot;', '\'');

    return decode;
}

function encodeString(source){
    //console.log(source);
    source = source.replace(/\\/g, '/');
    source = source.replace(/\'/, '&quot;');
    return source;
}

//don't really need this function at the moment
// function hierBuildDir(item, sourceObj){
//     var query = "",
//         layers = item.name.split('/');
//
//     _.forEach(layers, function(layer){
//         query += "['" + layer + "']";
//     });
//
//     _.setWith(sourceObj, query, {'/path': item.name, '/files': {}, '/type': 'dir'}, Object);
//
//     return sourceObj;
// }
function hierBuildFile(item, sourceObj){
    var query = "",
        layers = item.name.split('/');

    _.forEach(layers, function(layer, index, srcarray){
        if(index < srcarray.length - 1){
            query += "['" + layer + "']";
        }
    });
    query += "['/files']['" + layers[layers.length-1] + "']";

    _.set(sourceObj, query, item.name);

    return sourceObj;
}

function constructDirectoryLevel(tree, sourceDir, archive){
    //now that the tree has been assembled, now it's time to create proper directory objects
    _.forOwn(tree, function(item, key){
        if(key === '/files'){
            _.forOwn(item, function(fileDef){
                sourceDir.files.push(new file(fileDef, archive));
            })
        }
        else{
            var newDir = new directory(sourceDir.path + '/' + key, key, archive);
            sourceDir.directories.push(constructDirectoryLevel(item, newDir));
        }
    })

    return sourceDir;
}

function separateDirFile(set){
    //separate files from directories in the system
    var files = [],
        directories = [];

    var regexSearch = /(\/?)(\S+)([.])([\w])+/;  //preliminary regex, still in progress

    _.forEach(set, function(item){
        //replaced by the encodeString function, file and directory spawn functions also perform a last minute encode just in case
        // item.name = item.name.replace(/\\/g, '/');
        // item.name = item.name.replace(/\'/, '&quot;');
        item.name = encodeString(item.name);

        var contentType = _mimetypes.lookup(item.name); //lookup returns false if no type is found (likely a directory)

        if(!contentType || item.attr.startsWith('D') || !regexSearch.test(item.name)){
            //the one thing to look out for that hasn't been accounted for yet is duplicate paths, that should
            //be searched for before insertion
            //example a folder that ends in .jpg
            //or a file with no extension
            //this can be addressed later as the likelihood of this happening is pretty slim
            directories.push(item);
        }
        else{
            item.contentType = contentType;
            files.push(item);
        }
    })

    return {
        files: files,
        directories: directories
    }
}

function assembleTree(resultset, archive){
    var flatDiv = separateDirFile(resultset);

    //assemble the tree structure
    var root = {};
    //build the directory tree
    //and populate the tree with file leaves
    _.forEach(flatDiv.files, function(item){
        root = hierBuildFile(item, root);
    })

    //console.log(flatDiv.files);

    var constructedRoot = constructDirectoryLevel(root, new directory('', ''), archive);

    return constructedRoot;
}

function fileList(resultset, archive){
    //assemble a flat array of files found within the resultset
    //have to apply the same path/name fixes that the tree assembler uses

    //divide files from directories
    var files = separateDirFile(resultset).files;
    //map the raw file definitions into file objects so they get the path/name fixes applied
    files = files.map(function(item){
        //at this stage, the filepath is in fact the filename, as it hasn't gone through the tree assembly function yet
        return new file(item.name, archive);
    })

    //return the resulting flatlist of files
    return files;
}

module.exports = {
    assembleTree: assembleTree,
    fileList: fileList
}
