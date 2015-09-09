#Express/Connect middleware for proxying files from S3 to Internet

With this middleware you can:
- check authorization of user to access target object
- translate urls to S3 keys

This middleware supports:
- Caching objects
- Piping objects from S3 to response, objects don't fully loaded in memory

##Install

`npm install s3layer`

Example of usage:

```javascript
var
  app = require("express")(),
  S3Layer = require("./index");

AWS_SETUP = {
  accessKeyId: "...",
  secretAccessKey: "...",
  bucket: "..." // default bucket
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

###getS3Key

Accepts request params and callback function, in callback function you can return:

- `string` - interpreted as S3 Key
- `object` which can contain `key` and `bucket` fields

For example: 

```javascript
  getS3Key: function(params, cb) {
    params.url = params.url.replace(/^\//, "");
    if(params.url == "restricted-file.png") {
      params.res.status(403).send("Forbidden");
      return;
    }
    // proxy request to Key = params.url
    cb(null, {
      key: params.url,
      bucket: "another-bucket"
    });
  }
```

###modifyHeaders

You can modify headers returned for file, with `modifyHeaders` callback:

For example

```javascript
  /**
   * @param  {Object} params
   * @return {Object} params.headers - headers returned from Amazon S3
   * @return {Object} params.outHeaders - headers will be returned in HTTP response, you can modify them
   */
  modifyHeaders: function(params) {
    if(params.headers["content-type"] && params.headers["content-type"].indexOf("image/") === 0) {
      params.outHeaders["Content-Disposition"] = 'attachment; filename="img.jpg"';
    }
  }
```

**`modifyHeaders` is synchronous!**