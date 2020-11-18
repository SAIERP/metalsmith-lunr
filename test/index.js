var assert = require('assert');
var Metalsmith = require('metalsmith');
var lunr = require('..');
var lunr_ = require('lunr');

describe('metalsmith-lunr', function(){
  it('should add JSON index file to metadata', function(done){
    var metalsmith = Metalsmith('test/fixtures/basic');
    metalsmith
      .use(lunr())
      .build(function(err, files){
        if (err) {
            console.log(err);
            return done(err);
        }
        assert.equal(typeof files['searchIndex.json'], 'object');
        assert.equal(typeof files['searchIndex.json'].contents, 'object');
        assert.equal(Object.keys(files).length, 4);
        done();
      });
  });

  it('should default options correctly', function(done){
    var metalsmith = Metalsmith('test/fixtures/basic');
    metalsmith
      .use(lunr())
      .build(function(err, files){
        if (err) return done(err);
        index = JSON.parse(files['searchIndex.json'].contents);
        assert.equal(index.fields[0], 'contents');
        done();
      });
  });

  it('should use inputed options', function(done){
    var metalsmith = Metalsmith('test/fixtures/basic');
    metalsmith
      .use(lunr({
        fields: {title:10, tags:100, contents: 1},
        ref: 'title',
        indexPath: 'index.json'
      }))
      .build(function(err, files){
        if (err) return done(err);
        index = JSON.parse(files['index.json'].contents);
        assert.equal(index.fields.length, 3);
        assert.equal(index.fields[0], 'title');
        assert.equal(index.fields[1], 'tags');
        done();
      });
  });

  it('should not index files without "lunar: true" metadata', function(done){
    var metalsmith = Metalsmith('test/fixtures/basic');
    metalsmith
      .use(lunr())
      .build(function(err, files){
        if (err) return done(err);
        index = JSON.parse(files['searchIndex.json'].contents);
        assert.equal(index.fieldVectors.length, 2);
        done();
      });
  });

  it('should be able to add pipeline functions', function(done){
    var metalsmith = Metalsmith('test/fixtures/basic');
    metalsmith
      .use(lunr({
        fields: {title:1, contents: 1},
        indexPath: 'index.json',
        ref: 'filePath',
        whitelist: ['position', 'testPipe'],
        pipelineFunctions: {
            'testPipe' : (token) => {
                token.metadata['testPipe'] = token.toString().length;
                return token;
            }
        }
      }))
      .build(function(err, files){
        if (err) return done(err);
        index = JSON.parse(files['index.json'].contents);
        assert.equal(index.invertedIndex[0][1]['contents']['one.md']['testPipe'][0], 10);
        done();
      });
  });


  it('should be able to find metas from pipeline functions', function(done){
    var metalsmith = Metalsmith('test/fixtures/basic');
    metalsmith
      .use(lunr({
        fields: {contents: 1},
        indexPath: 'index.json',
        ref: 'filePath',
        whitelist: ['testMeta'],
        pipelineFunctions: {
            'testMeta' : (token) => {
                token.metadata['testMeta'] = token.toString().length;
                return token;
            }
        }
      }))
      .build(function(err, files){
        if (err) return done(err);
        let indexContent = JSON.parse(files['index.json'].contents);
        let loaded = lunr_.Index.load(indexContent);
        let result = loaded.search('python');
        assert.equal(result[0].matchData.metadata['python'].contents.testMeta, 6);
        done();
      });
  });

});
