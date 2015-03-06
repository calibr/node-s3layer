*Express/Connect middleware for proxying files from S3 to Internet

With this middleware you can:
- check authorization of user to access target object
- translate urls to S3 keys

This middleware supports:
- Caching objects
- Piping objects from S3 to response, objects don't fully loaded in memory

**Install

`npm install s3layer`

Example of usage:

```javascript
var
  app = require("express")(),
  S3Layer = require("./index");

AWS_SETUP = {
  accessKeyId: "...",
  secretAccessKey: "...",
  bucket: "..."
};

var s3l = S3Layer({
  accessKeyId: AWS_SETUP.accessKeyId,
  secretAccessKey: AWS_SETUP.secretAccessKey,
  bucket: AWS_SETUP.bucket,
  /**
  * params has fields:
  * req - http request
  * res - http response
  * url - requested url
  */
  getS3Key: function(params, cb) {
    params.url = params.url.replace(/^\//, "");
    if(params.url == "restricted-file.png") {
      params.res.status(403).send("Forbidden");
      return;
    }
    // proxy request to Key = params.url
    cb(null, params.url);
  }
});

app.use("/files", s3l);
```
