# crudilize
Make a nodejs api module from your [JSON Schema](http://json-schema.org/).

Uses [JSEN](https://github.com/bugventure/jsen) to validate schema  
Uses [JSON Schema Faker](https://www.npmjs.com/package/json-schema-faker) to create example models (this has some limitations)

Uses [underscore templates](http://underscorejs.org/#template) for the output. 
The first time a template is used it is compiled and saved. The compiled template file
should be deleted if template changes are made.

## Default Template Dependencies
The default template is for an express api, and uses promises. The output of the default template will
use [JSEN](https://github.com/bugventure/jsen) to validate POST and PUT by default. So the generated api has the 
following dependencies:

- express
- body-parser
- jsen

This is the snippet of `package.json` that needs to be setup in  your primary app:
```javascript
  "dependencies": {
    "jsen": "^0.6.1",
    "body-parser": "^1.15.0",
    "express": "^4.13.4",
  }
```

I'm fairly new to node, and so I welcome pull requests and feedback.

**The output of crudilize is intended to be a starting point for your api. It just helps with some of the repetitive legwork**

## Usage

```bash
git clone https://github.com/justinoverton/crudilize.git
cd crudilize
npm install
node crudilize --help
```

Outputs:
```bash
$ node crudilize --help
Usage:
  app [OPTIONS] slug

Options: 
  -i, --in PATH          Specify Input file
  -o, --out PATH         Specify Output file
  -t, --template [PATH]  Specify a template to use for api generation. (Default is ./templates/express.txt)
  -h, --help             Display help and usage details
```

Input from file, output to file
```bash
node crudilize -i testSchema.json -o article-api.js article  
```

Input form stdnin, output to stdout
```bash
cat testSchema.json | node crudilize article
```

## Example output

### Schema Input
```javascript
{
    "title": "Written Article",
    "type": "object",
    "properties": {
        "id": {
            "title": "Article Identifier",
            "type": "number"
        },
        "title": {
            "title": "Article Title",
            "type": "string"
        },
        "summary": {
            "title": "Summary",
            "type": "string"
        },
        "authorId": {
            "type": "integer"
        },
        "imgData": {
            "title": "Article Illustration (small)",
            "type": "string",
            "media": {
                "binaryEncoding": "base64",
                "type": "image/png"
            }
        }
    },
    "required" : ["id", "title", "authorId"]
}
```

### API Output
```javascript
'use strict'

var express = require('express');
var bodyParser = require('body-parser');
var jsen = require('jsen');

//TODO: You need to supply the repository, this fake one is here so that you'll be able to build
var repository = {

    //Regarding all methods. Any error object with a {status: num} property will be 
    //used to communicate that specific error code to through the REST api
    //All methods should return a promise. If you Promise.catch errors be sure to rethrow something 
    //otherwise the error will not propogate
    
    //At the end of this file there is an error handler. You can use this to handle errors however you want
    //Pass it on to another handler in parent route, or leave it as is
    
    //If you want null to be a 404 you should do a:
    //  throw { status: 404, error: 'Not Found'} or reject({ ... })
    
    //Filter is optional and is merely passed through. Add your own validation/tokenization that 
    //makes sense with your usecase
    list: function(filter) { return Promise.reject('not yet implemented'); },
    
    get: function(id) { return Promise.reject('not yet implemented'); },
    
    create: function(obj) { return Promise.reject('not yet implemented'); },
    
    update: function(id, obj) { return Promise.reject('not yet implemented'); },
    
    delete: function(id) { return Promise.reject('not yet implemented'); }
};

//var repository = require('./article-repository'); 

/*
Example Model:

{"id":47738409.22862291,"title":"anim nulla occaecat irure","authorId":42150898}
*/

var router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

router.get('/article', function(req, res, next) {
    
    repository.list(req.params)
        .then(res => res.json(res))
        .catch(next);
});

router.get('/article/:id', function(req, res, next) {
    
    if(!req.params.id) {
        next({ status: 400, error: 'Id is required' });
    }
    
    repository.get(req.params.id)
        .then(res => res.json(res))
        .catch(next);
    
});

router.post('/article', function(req, res, next) {
    
    if(!req.params.id) {
        next({ status: 400, error: 'Id is required' });
    }
    
    validateModel(req.body)
        .then(m => repository.get(m))
        .then(res => res.json(res))
        .catch(next);
    
});

//With this you could have the body contain the id or leave it in the get request for the sake of 
//semantics. Repository will get both id and body.
router.put('/article/:id', function(req, res, next) {
    
    if(!req.params.id) {
        next({ status: 400, error: 'Id is required' });
    }
    
    validateUpdateModel(req.body)
        .then(m => repository.get(m))
        .then(res => res.json(res))
        .catch(next);
    
});

router.delete('/article/:id', function(req, res, next) {
    
    if(!req.params.id) {
        next({ status: 400, error: 'Id is required' });
    }
    
    repository.delete(req.params.id)
        .then(res => res.json(res))
        .catch(next);
});

router.use(function (err, req, res, next) {
    res.status(err.status || 500).json(err);
});

module.exports = router;

const schema = {
    "title": "Written Article",
    "type": "object",
    "properties": {
        "id": {
            "title": "Article Identifier",
            "type": "number"
        },
        "title": {
            "title": "Article Title",
            "type": "string"
        },
        "summary": {
            "title": "Summary",
            "type": "string"
        },
        "authorId": {
            "type": "integer"
        },
        "imgData": {
            "title": "Article Illustration (small)",
            "type": "string",
            "media": {
                "binaryEncoding": "base64",
                "type": "image/png"
            }
        }
    },
    "required" : ["id", "title", "authorId"]
};

function validateModel(obj) {
    
    return new Promise(function(resolve, reject) {
        try {
            var validate = jsen(schema);
        
            if(!validate(obj)) {
                reject({ status: 400, error: validate.errors });
            }
            
            return validate.build(obj, { additionalProperties: false });
        } catch (ex) {
            reject(ex);
        }
    });
}

function validateUpdateModel(obj) {
    return new Promise(function(resolve, reject) {
        try {
            var validate = jsen(schema);
            
            if(!validate(obj)) {
                reject({ status: 400, error: validate.errors });
            }
            
            var ret = validate.build(obj, { additionalProperties: false });
            
            //the above is just a convenience to remove properties that shouldn't be on the object.... 
            //now also remove any that weren't on the input object
            Object.keys(ret).forEach(function(key,index) {
                if(!obj.hasOwnProperty(key)) {
                    delete ret[key];
                }
            });
            
            return ret;
        } catch (ex) {
            reject(ex);
        }
    });
}
```