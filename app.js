url = require('url');
path = require('path');
fs = require('fs');
http = require('http');
https = require('https');
r = require('readability-node');
jsdom = require('jsdom').jsdom;
mu = require('mu2');
mu.root = __dirname + '/templates';

function render(response, ctx){
    mu.compileAndRender('index.html', ctx).pipe(response);
}


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

function fetch(uri, callback){
    uri = url.parse(uri);
    if(uri.protocol === "https:"){
        return https.get(uri, callback);
    }else{
        return http.get(uri, callback);
    }
}

function serveReadability(uri, response){
    fetch(uri, function(res){
        console.log("Got response", res.statusCode)
        if(res.statusCode != 200){
            return render(response, {
                title: "Invalid URL",
                content: "Got status code " + res.statusCode +
                    " for url " + uri
            });
        }
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
            render(response, article);
        });
    }).on('error', function(e){
        console.log("Got error", e.message, uri)
        render(response, {
            title: "Invalid URL",
            content: "<p>Invalid URL: " + uri.href + "</p>"
        });
    });
}

function handleRequest(request, response){
    var req_url = url.parse(request.url, true);
    var filename = path.join(process.cwd(), req_url.pathname);
    var uri = req_url.query.url;


    fs.exists(filename, function(exists) {
        if(exists && !fs.statSync(filename).isDirectory()){
            serveFile(filename, response);
        }else if(uri){
            serveReadability(uri, response);
        }else{
            render(response, {
                title: "Home",
                content: "Enter a URL above to get started"
            });
        }
    });
}


var server = http.createServer(handleRequest);

server.listen(process.env.PORT || 3000, function(){ console.log("OK");});
