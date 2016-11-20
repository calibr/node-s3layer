var
  AWS = require('aws-sdk'),
  headersS3Keys = {},
  _ = require("lodash"),
  debug = require("util").debuglog("s3layer");

var allowedOutputHeaders = [
  "last-modified",
  "etag",
  "content-type",
  "content-length",
  "accept-ranges",
  "content-range"
];

function S3Layer(config) {
  AWS.config.update(config.AWS);
  var S3 = new AWS.S3();

  return function(req, res, nextMiddleware) {
    var
      url = req.url,
      getReq = {},
      headers = req.headers,
      processed = false;

    var processResponse = function(err, resultInfo) {
      if(processed) {
        return;
      }
      processed = true;
      if(err) {
        return nextMiddleware(err);
      }
      if(typeof resultInfo == "string") {
        resultInfo = {
          key: resultInfo
        };
      }
      if(!resultInfo || !resultInfo.key) {
        // can't get key, next
        return nextMiddleware();
      }
      if(headers["if-modified-since"]) {
        try {
          // browser should set valid Date
          getReq.IfModifiedSince = new Date(headers["if-modified-since"]);
        }
        catch(ex) {

        }
      }
      if(headers["if-none-match"]) {
        getReq.IfNoneMatch = headers["if-none-match"];
      }
      if(headers["range"]) {
        getReq.Range = headers["range"];
      }
      getReq.Bucket = resultInfo.bucket || config.bucket;
      getReq.Key = resultInfo.key;
      debug("S3 object request", getReq);
      var req = S3.getObject(getReq);
      var requestSent = false;
      var lastStatusCode;
      req.on("httpHeaders", function(statusCode, headers) {
        if(requestSent) {
          // prevent Headers Already Sent error
          return;
        }
        lastStatusCode = statusCode;
        if(statusCode == 503) {
          // ignore 503 errors(Service Unavailable) because aws lib retry request
          // if recieved this code, until success code received
          return;
        }
        var outHeaders = {};
        allowedOutputHeaders.forEach(function(allowedHeaderName) {
          if(headers[allowedHeaderName]) {
            outHeaders[allowedHeaderName] = headers[allowedHeaderName];
          }
        });
        if(config.modifyHeaders) {
          config.modifyHeaders({
            headers: headers,
            outHeaders: outHeaders,
            key: resultInfo.key
          });
        }
        if(resultInfo.headers) {
          outHeaders = _.extend(outHeaders, resultInfo.headers);
        }
        res.writeHead(statusCode, outHeaders);
      });
      req.on('httpData', function(chunk) {
        if(requestSent) {
          return;
        }
        res.write(chunk);
      });
      req.on('httpDone', function(chunk) {
        if(requestSent) {
          return;
        }
        if(lastStatusCode >= 500 && lastStatusCode <= 599) {
          // ignore 5xx errors sending
          return;
        }
        requestSent = true;
        res.end();
      });
      req.send();
    };

    var promise = config.getS3Key({
      req: req,
      res: res,
      url: url
    }, processResponse);
    if(promise && promise.then) {
      promise.then(function(resultInfo) {
        processResponse(null, resultInfo);
      }).catch(function(err) {
        processResponse(err);
      });
    }
  };
}

module.exports = exports = S3Layer;