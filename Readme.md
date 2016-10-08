#Express/Connect middleware for proxying files from S3 to Internet

With this middleware you can:
- check authorization of a user to access a target object(using ACL, RBAC, etc.)
- translate urls to S3 keys

This middleware supports:
- Caching objects
- Piping objects from S3 to response, so objects don't fully loaded in memory

##Install

`npm install s3layer`

Usage example:

```javascript
var
  app = require("express")(),
  S3Layer = require("s3layer");

AWS_SETUP = {
  accessKeyId: "...",
  secretAccessKey: "...",
  bucket: "..." // default bucket
};

// create a middleware
var s3l = S3Layer({
  AWS: AWS_SETUP,
  // the default bucket, can be overwritten by a getS3Key's returned value
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

// use the middleware in the express application
app.use("/files", s3l);
```

###getS3Key

Accepts a request params and a callback function, in the callback function you can return:

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

### modifyHeaders

You can modify headers returned for a file, with `modifyHeaders` callback:

For example

```javascript
  /**
   * @param  {Object} params
   * @return {Object} params.headers - headers returned by Amazon S3
   * @return {Object} params.outHeaders - headers that will be returned in a HTTP response, you can modify them directly
   */
  modifyHeaders: function(params) {
    if(params.headers["content-type"] && params.headers["content-type"].indexOf("image/") === 0) {
      // force download all images
      params.outHeaders["Content-Disposition"] = 'attachment; filename="img.jpg"';
    }
  }
```

**`modifyHeaders` is synchronous!**