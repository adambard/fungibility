url = require('url');
path = require('path');
fs = require('fs');
http = require('http');
https = require('https');
r = require('readability-node');
jsdom = require('jsdom').jsdom;
mu = require('mu2');
mu.root = __dirname + '/templates';


function serveFile(filename, response){

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
}

function serveReadability(uri, response){
    uri = url.parse(uri || "https://medium.com/@mbostock/what-makes-software-good-943557f8a488")
    https.get(uri, function(res){
        console.log("Got response", res.statusCode)
        var src = '';
        res.on('data', function(d){ src += d; });
        res.on('end', function(){
            console.log("Stream end");
            // Do something with src
            var doc = jsdom(src, {features: {
                FetchExternalResources: false,
                ProcessExternalResources: false
            }
            });
            var article = new r.Readability(uri, doc).parse();
            var stream = mu.compileAndRender('index.html', article);
            stream.pipe(response);
        });
    }).on('error', function(e){
        console.log("Got error", e.message, uri)
        var stream = mu.compileAndRender('index.html', {
            title: "Invalid URL",
            content: "<p>Invalid URL: " + uri.href + "</p>"
        });
        stream.pipe(response);
    });
}

function handleRequest(request, response){
    var req_url = url.parse(request.url, true);
    var filename = path.join(process.cwd(), req_url.pathname);
    var uri = req_url.query.url;


    fs.exists(filename, function(exists) {
        if(exists && !fs.statSync(filename).isDirectory()){
            serveFile(filename, response);
        }else{
            serveReadability(uri, response);
        }
    });
}


var server = http.createServer(handleRequest);

server.listen(process.env.PORT || 3000, function(){ console.log("OK");});
