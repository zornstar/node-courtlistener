var
    request = require('request')
  , Promise = require('rsvp').Promise
  , _       = require('lodash')
  , diva    = require ('diva')
  , fs      = require('fs')
  , path    = require('path')
  , styles  = require('./styles')
  , chalk   = require('chalk')

var API = {
  search: function(str) {
    return 'https://www.courtlistener.com/api/rest/v1/search/?format=json&citation=' + encodeURIComponent(str);
  },
  absolute_url: function(str) {
    return 'https://www.courtlistener.com' + str + '?format=json';
  },
  cited_by: function(str) {
    return 'https://www.courtlistener.com/api/rest/v1/cited-by/?format=json&id=' + str;
  },
  cites: function(str) {
    return 'https://www.courtlistener.com/api/rest/v1/cites/?format=json&id=' + str;
  }
}

function citestring(c) {
  return c.federal_cite_one ||
        c.state_cite_one ||
        c.westlaw_cite ||
        c.lexis_cite ||
        c.neutral_cite;
}

function formHTML(body, style) {
  return '<html><head><meta charset="utf-8"></head><style>' + style +
          '</style><body>' + body +
          '</body></html>';
}

function resolvePaths(html) {
  return html.replace(/href=\//g, 'href=https://www.courtlistener.com/');
}

var CLClient = function() {

  this.logEnabled = false;

  if(fs.existsSync('./credentials.json')) {
    pkg = require('./credentials.json');
    this.username = pkg.courtlistener.username || "";
    this.password = pkg.courtlistener.password || "";
    this.savePath = pkg.courtlistener.savepath || __dirname;
  } else {
    this.savePath = __dirname;
  }

  this.throttle = 500;
  this.jar = request.jar();
}

diva(CLClient);

CLClient.prototype.log = function(str, color) {
  if(this.logEnabled) {
    console.log( chalk[color || 'white'](str) )
  }
}

CLClient.prototype._generateCasePromise = function(str) {
  var that = this;
  return function(result) {
    return new Promise(function getCase(resolve, reject) {
      function downloadCase(name, resource_uri) {
        var options = {
              'auth': {
                'user':that.username
              , 'pass':that.password
              }
            , uri: API.absolute_url(resource_uri)
            , jar: that.jar
            , headers : {
              'User-Agent': 'Request'
            }
          }
        request.get(options, function(err, resp, body) {
          if(err) {
            reject(err);
          }
          var
              json = JSON.parse(body)
            , cite = citestring(json.citation)
            , savePath = path.join(that.savePath, cite + '.html')
            , html;

          if(json['html_lawbox']) {
            html = formHTML(json['html_lawbox'], styles.style.join(" "));
          } else if (json['html_with_citations']) {
            html = formHTML(json['html_with_citations'], styles.style.join(" "));
          } else if (json['html']) {
            html = formHTML(json['html'], styles.style.join(" "));
          }

          if(html) {
            html = resolvePaths(html)
            fs.writeFile(savePath, html, 'utf8', function(err) {
              if(err) {
                reject('Download error')
              }
              that.log('Downloaded ' + cite, 'yellow');
            });
            resolve(json)
          } else {
            var str = 'No html found for ' + cite + '(' + name + ')';
            that.log(str, 'red');
            resolve(json);
          }
        });
      }
      var options = {
            'auth': {
              'user':that.username
            , 'pass':that.password
            }
          , uri: API.search(str)
          , jar: that.jar
          , headers : {
            'User-Agent': 'Request'
          }
        }

      request.get(options, function(err, resp, body) {
        if(err) {
          that.log('Error getting ' + str + '.', 'red');
          reject(err);
        } else if(resp.statusCode == 401) {
          reject(401);
        } else if(resp.statusCode == 200) {
          var
              json = JSON.parse(body)
            , objects = json["objects"]
            , found = false;
          if(objects.length > 0) {
            for(var i = 0; i < objects.length, !found; ++i) {
              var
                  searchResult   = objects[i]
                , citation       = searchResult['citation']
                , _citation      = citation.replace(/([ |.])/g, '');

              if(citation.indexOf(str.replace(/([ |.])/g, ''))) {
                downloadCase(str, searchResult['resource_uri'])
                found = true;
              }
            }

            if(!found) {
              that.log(str + ' not found.', 'red');
              resolve(str + ' not found.');
            }
          }
          else {
            that.log(str + ' not found.', 'red');
            resolve(str + ' not found.');
          }
        }
      });
    });
  }
}

CLClient.prototype._generateCitationPromise = function(citation) {
  var that = this;
  return function getCitation(result) {
    return new Promise(function (resolve, reject) {
        var options = {
              'auth': {
                'user':that.username
              , 'pass':that.password
              }
            , uri: API.absolute_url(citation.resource_uri)
            , jar: that.jar
            , headers : {
              'User-Agent': 'Request'
            }
          }
        request.get(options, function(err, resp, body) {
          if(err) {
            reject(err);
          }

          var
              json = JSON.parse(body)
            , cite = citestring(json.citation)
            , savePath = path.join(that.savePath, cite + '.html')
            , html;

          if(json['html_lawbox']) {
            html = formHTML(json['html_lawbox'], styles.style.join(" "));
          } else if (json['html_with_citations']) {
            html = formHTML(json['html_with_citations'], styles.style.join(" "));
          } else if (json['html']) {
            html = formHTML(json['html'], styles.style.join(" "));
          }

          if(html) {
            html = resolvePaths(html)
            fs.writeFileSync(savePath, html, 'utf8');
            that.log('Downloaded ' + savePath, 'yellow');
            resolve(json)
          } else {
            var str = 'No html found for ' + cite;
            that.log(str, 'red');
            resolve({ });
          }
        });
      });
  }
}


CLClient.prototype.getCases = function(cases) {
  var that = this;
  return that.queue(function getCases(result) {
    return new Promise(function(resolve, reject) {

      cases = cases || result;
      cases = (typeof cases === typeof '') ? [cases] : cases;

      var promises = cases.map(function(str) {
        return that._generateCasePromise(str);
      });

      var results = [ ];

      function chainPromises() {
        if(promises.length === 0) {
          resolve(results);
          return;
        }
        return promises.shift()().then( function(result) {
          if( !_.isEmpty(result) ) {
            results.push(result)
          }
          setTimeout( function() {
            chainPromises()
            } , that.throttle)
        }).catch(function(err) {
          reject(err);
        });
      }
      chainPromises();
    });
  });
}

CLClient.prototype.getCitations = function(citations) {
  var that = this;

  return that.queue(function getCitations(result) {
    return new Promise(function(resolve, reject) {


      citations = citations || result;
      citations = (typeof citations === typeof '') ? [citations] : citations;

      var promises = citations.map(function(cite) {
        return that._generateCitationPromise(cite);
      });

      function chainPromises() {
        if(promises.length === 0) {
          resolve(results);
          return;
        }
        return promises.shift()().then( function(result) {
          if( !_.isEmpty(result) ) {
            results.push(result)
          }
          setTimeout( function() {
            chainPromises()
            } , that.throttle)
        }).catch(function(err) {
          reject(err);
        });
      }
      chainPromises();
    });
  });
}

/*TODO:*/
CLClient.prototype.citedBy = function() {
  var that = this;

  /*TODO: test result === typeof array*/

  return that.queue(function citedBy(result) {
    return new Promise(function(resolve, reject) {

        var options = {
              'auth': {
                'user':that.username
              , 'pass':that.password
              }
            , uri: API.cited_by(aCase['id'])
            , jar: that.jar
            , headers : {
              'User-Agent': 'Request'
            }
          }
        request.get(options, function(err, resp, body) {
          if(err) {
            reject(err);
          }
          var json = JSON.parse(body)
            , citations = json['objects'];

          if(citations.length > 0) {
            resolve(citations)
          } else {
            resolve([ ]);
          }
        });
      });
  });
}
/*End TODO*/

/*TODO:*/
CLClient.prototype.cites = function(value) {

  var that = this;
  return that.queue(function cites(result) {

    value = result || value;

    if(value === typeof 'array') {
      value = value[0];
    }

    return new Promise(function(resolve, reject) {

        var options = {
              'auth': {
                'user':that.username
              , 'pass':that.password
              }
            , uri: API.cites(value['id'])
            , jar: that.jar
            , headers : {
              'User-Agent': 'Request'
            }
          }
        request.get(options, function(err, resp, body) {
          if(err) {
            reject(err);
          }
          var json = JSON.parse(body)
            , citations = json['objects'];

          if(citations.length > 0) {
            resolve(citations)
          } else {
            resolve([ ]);
          }
        });
      });
  });
}
/*end TODO*/

CLClient.prototype.login = function (username, password) {
  var that = this;
  return that.queue(function login(result) {
    return new Promise(function (resolve, reject) {
      that.username = username;
      that.password = password;
      that.log('Set username: ' + that.username, 'white');
      that.log('Set password: ' + that.password, 'white');
      resolve(result)
    });
  });
}

CLClient.prototype.to = function (outpath) {
  var that = this;
  return that.queue(function to(result) {
    return new Promise(function (resolve, reject) {
      that.savePath = path.resolve(that.savePath, outpath);
      that.log('Setting downloads to ' + that.savePath, 'white');
      if(!fs.existsSync(that.savePath)) fs.mkdirSync(that.savePath);
      resolve(result)
    });
  });
}

CLClient.prototype.getCase = function(str) {
  return this.generate( this._generateCasePromise(str) );
}

CLClient.prototype.getCitation = function(str) {
  return this.generate( this._generateCitationPromise(str) );
}

module.exports = CLClient;
