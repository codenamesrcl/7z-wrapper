/*
Take whatever is input-ed through stdin, combine it until there is no more input from the single source
and then pipe it out
*/

var fs = require("fs"),
    combine = require('combine-streams'),
    ipc = require("node-ipc"),
    gather_stream = require('gather-stream'),
    mime_types = require('mime-types'),
    argv = require('minimist')(process.argv),
    path = require('path');

var piper = combine();  //create a new instance of combine

var logger = console.log;
console.log = function(message){
    if(argv.verbose){
        logger(message);
    }
}

//console.log(argv);

process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    //console.log('piper: piper receiving data');
    if (chunk !== null){
        piper.append(chunk);
    }
    else{
        //console.log('piper: null chunk')
    }
});

process.stdin.on('end', function() {
    piper.append(null); //to end the appending stream

    //now can pipe the stream to something else
    //the gather-stream library streams the combined-stream piper
    //into a buffer, the callback contains either the error or the resulting buffer
    piper.pipe(gather_stream(concatToBuffer));
});


function concatToBuffer(err, buffer){
    // console.log('piper: readying buffer');
    piperRequest(buffer);
}

function piperRequest(buffer){
    //console.log('full data assembled, creating DTO');

    var formdata = {
        reqname: argv.reqname,
        archpath: argv.archpath,
        filepath: argv.filepath,

        //file attachment
        piperfile: {
            value: buffer,
            options: {
                filename: path.basename(argv.filepath),
                contentType: mime_types.lookup(argv.filepath)
            },
        },
    };

    try{
        console.log('starting ipc connectToServer')
        ipc.connectTo(
           argv.ipcname,
           function(){
               console.log('piper connected');
               ipc.of[argv.ipcname].on("exchangeconfirmation", function(data){
                   console.log("received exhangeconfirmation from host");
                   console.log(data);

                   ipc.disconnect(argv.ipcname);
               });

            //    console.log('emitting data to host');
            //    //send the 7z data to the host
            //    console.log(formdata);
               ipc.of[argv.ipcname].emit('7zdata', formdata);
           });
    }
    catch(err){
        console.error(err);
    }


}
