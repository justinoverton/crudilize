'use strict';

var fs = require('fs');
var cli = require('cli');
var _ = require('underscore');

cli.setUsage('app [OPTIONS] slug');

cli.parse({
    'in':   ['i', 'Specify Input file', 'path'],
    out:   ['o', 'Specify Output file', 'path'],
    template: ['t', 'Specify a template to use for api generation.', 'path', './templates/express.txt']
});

if(cli.args.length != 1) {
    cli.fatal('slug argument is required. Slug is the name of the object and should be a valid javascript identifier, and valid in a url path');
    return;
}

var slug = cli.args[0];
var ostream = null;
var template = null;

if(cli.options.out) {
    //get stream
    ostream = fs.createWriteStream(cli.options.out);
} else {
    //stdout
    ostream = process.stdout;
}

loadTemplate(cli.options.template)
    .then(function(t) {
        template = t;
        return loadInput(cli.options.in);
    })
    .then(function(schemaText) {
        
        var schema = JSON.parse(schemaText);
        if(!schema) {
            throw "invalid schema";
        }
        
        var jsen = require('jsen');
        
        var validateSchema = jsen({"$ref": "http://json-schema.org/draft-04/schema#"});
        if(!validateSchema(schema)) {
            throw "invalid schema: " + JSON.stringify(validateSchema.errors);
        }
        
        var exampleModel = JSON.stringify(require('json-schema-faker')(schema));
        
        var output = template({ slug: slug, schema: schemaText, exampleModel: exampleModel});
        ostream.on('error', (err) => {
            cli.error('Error writing output: ');
            cli.fatal(err);
        });
        
        ostream.write(output, 'utf8', function() {
            process.exit();
        });
        
    }).catch(function(err) {
        cli.fatal(err);
    });

////////////////////
function loadInput(filename) {
    return new Promise(function(resolve, reject) {
        if(!filename) {
            try {
                cli.withStdin(function(txt) {
                    resolve(txt);
                });
            } catch (ex) {
                reject(ex);
            }
        } else {
            resolve(loadFile(filename));
        }
    });
}

function loadFile(filename) {
    return new Promise(function(resolve, reject) {
        try {
            fs.readFile(filename, 'utf8', function (err,data) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            });
        } catch(ex) {
            reject(ex);
        }
    });
}

function loadTemplate(filename) {
    
    filename = filename || './templates/express.txt';
    
    return new Promise(function(resolve, reject) {
        try {
            var compiledName = filename + '.js';
            
            fs.exists(compiledName, (exists) => {
              
              if(exists) {
                  resolve(require(compiledName));
                  return;
              }
              
              resolve(loadFile(filename)
                .then(function(txt){
                    var compiled = _.template(txt);
                    
                    //let this happen in the background, but don't really care if it succeeds because next run will try to recompile
                    return writeFile(compiledName, 'module.exports = ' + compiled.source)
                        .then(() => compiled);
                }));
            });
            
        } catch(ex) {
            reject(ex);
        }
    });
    
}

function writeFile(filename, data) {
    
    return new Promise(function(resolve, reject) {
        try {
            fs.writeFile(filename, data, function(err) {
                if(err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            
        } catch(ex) {
            reject(ex);
        }
    });
    
}