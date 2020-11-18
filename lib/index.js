var lunr = require('lunr');

module.exports = plugin;

function plugin(opts){
  return function(files, metalsmith, done){
    opts = setDefaultOptions(opts);
    var index = setIndexOptions(opts, files);
    addJSONtoMetalsmith(index, files, opts);
    done();
  };
};

//Creates the lunr object
function setIndexOptions(opts, files){
  var fields = opts.fields;
  var index = lunr(function(){
    if (opts.whitelist) {
        for(let key in opts.whitelist) {
            this.metadataWhitelist.push(opts.whitelist[key]);
        }
    }
    if (opts.pipelineFunctions) {
      for(f in opts.pipelineFunctions) {
        lunr.Pipeline.registerFunction(opts.pipelineFunctions[f], f);
        this.pipeline.add(opts.pipelineFunctions[f]);
      }
    }
    for(field in fields){
      this.field(field, {boost: fields[field]});
    }
    this.ref(opts.ref);
    for (file in files){
        if(files[file].lunr){
            var docIndex = createDocumentIndex(opts, files[file], file);
            this.add(docIndex);
        }
    }
  });
  return index;
}

//Creates new object to add to the lunr search index
function createDocumentIndex(opts, file, path){
  var contents, index = {};
  if(opts.ref == 'filePath'){
    index.filePath = path;
  }else{
    index[opts.ref] = file[opts.ref];
  }
  for (field in opts.fields){
    if(field === 'contents'){
      if(typeof opts.preprocess === 'function'){
        contents = opts.preprocess.call(file, file.contents.toString());
        index.contents = String(contents);
      }else{
        index.contents = file.contents.toString();
      }
    }else{
      index[field] = file[field];
    }
  }
  return index;
}

//Adds the search index JSON file to Metalsmith metadata for build
function addJSONtoMetalsmith(index, files, opts){
  var contents = Buffer.from(JSON.stringify(index));
  files[opts.indexPath] = {contents: contents};
}

function setDefaultOptions(opts){
    opts = opts || {};
    opts.indexPath = opts.indexPath || 'searchIndex.json';
    opts.fields = opts.fields || {contents: 1};
    opts.ref = opts.ref || 'filePath';
    opts.pipelineFunctions = opts.pipelineFunctions || [];
    return opts;
}
