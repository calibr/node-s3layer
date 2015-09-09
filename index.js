var
  AWS = require('aws-sdk'),
  headersS3Keys = {};

function S3Layer(config) {
  AWS.config.update({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  });
  var S3 = new AWS.S3();

  return function(req, res, nextMiddleware) {
    var
      url = req.url,
      getReq = {},
      headers = req.headers;

    config.getS3Key({
      req: req,
      res: res,
      url: url
    }, function(err, resultInfo) {
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
      getReq.Bucket = resultInfo.bucket || config.bucket;
      getReq.Key = resultInfo.key;
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
        if(headers["last-modified"]) {
          outHeaders["Last-Modified"] = headers["last-modified"];
        }
        if(headers["etag"]) {
          outHeaders["ETag"] = headers["etag"];
        }
        if(headers["content-type"]) {
          outHeaders["Content-Type"] = headers["content-type"];
        }
        if(headers["content-length"]) {
          outHeaders["Content-Length"] = headers["content-length"];
        }
        if(config.modifyHeaders) {
          config.modifyHeaders({
            headers: headers,
            outHeaders: outHeaders,
            key: resultInfo.key
          });
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
    });
  };
}

module.exports = exports = S3Layer;