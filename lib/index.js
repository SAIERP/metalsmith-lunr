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
            let docAttributes = {};
            var docIndex = createDocumentIndex(opts, files[file], file, docAttributes);
            this.add(docIndex, docAttributes);
        }
    }
  });
  return index;
}

//Creates new object to add to the lunr search index
function createDocumentIndex(opts, file, path, docAttributes){
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
      docAttributes[field] = file[field];
    }
  }
  return index;
}

//Adds the search index JSON file to Metalsmith metadata for build
function addJSONtoMetalsmith(index, files, opts){
  let safeIndex = index.toJSON();
  for(let key in index.fields) {
      let field = index.fields[key];
      if(field != 'contents') {
        for(let file in files) {
            let docId = opts.ref == 'filePath' ? file : files[file][opts.ref];
            safeIndex.documents = safeIndex.documents || {};
            safeIndex.documents[docId] = safeIndex.documents[docId] || {};
            safeIndex.documents[docId][field] = files[file][field];
        }
      }
  }
  var contents = Buffer.from(JSON.stringify(safeIndex));
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
