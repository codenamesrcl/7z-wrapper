//E:/Downloads/TavernSongs_ENG.zip
//

var _7z = require("./../7z");
var _ = require('lodash');

var testfile = "./test/test.7z";

console.log(process.versions);

console.log('starting tests');

_7z.list(testfile).then(
    function(returnable){
        console.log('received listings');
        var cases = returnable.files.filter(function(item){
            //console.log(_.isString(item.path));
            if(!_.isString(item.path)){
                return item;
            }
        })

        console.log(returnable);
    },
    function(err){
        console.error(err);
    }
)


console.log('running tomemory test')
_7z.extract.file.toMemory({
    archpath: testfile,
    filepath: "test.txt",
    verbose: true
})
.then(
    function(response){
        console.log('received memory response');
        //console.log(response);
        console.log(response);
        console.log(response.data.toString('utf8'))
    },
    function(err){
        console.error(err);
    });
