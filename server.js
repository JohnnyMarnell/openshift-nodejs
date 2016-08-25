var express = require('express'),
    request = require('request'),
    fs = require('fs'),
    zlib = require('zlib'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    concat = require('concat-stream');


var dataPath = process.env.OPENSHIFT_DATA_DIR || './data/';
app.use(express.static('static'));
app.use('/proxy', function(req, res) {
    var url = req.query.url; //validateProxy(req.query.url);
    if (url) {
        var stream = request({url: url, gzip: true}, function(error, response, body) {
            var data = { url: url, date: new Date(), body: body }
            //fs.appendFile(dataPath + "/proxy.access.log", new Date() + "\t" + url + "\n");
            //fs.appendFile(dataPath + "/proxy.log", JSON.stringify(data) + "\n");
        });
        req.pipe(stream).pipe(res);
    }
    else res.send("Denied");
});
app.get("/proxy-replace", function (req, res) {
    var write = concat(function(response) {
        if (req.query.src && response) {
            response = response.toString().replace(new RegExp(req.query.src, "ig"), req.query.target);
        }
        res.end(response);
    });

    request.get(req.query.url)
        .on('response',
            function (response) {
                res.writeHead(response.statusCode, response.headers);
            }
        ).pipe(write);
});

var chatio = io.of('/chat');
chatio.on('connection', function(socket){
    socket.on('chat message', function(msg){
        chatio.emit('chat message', msg);
    });
});
var lyricsio = io.of('/lyrics'), lastData;
lyricsio.on('connection', function(socket) {
    console.log('new connection!');
    if (lastData) {
        socket.emit('receive song data', lastData);
    }
    socket.on('send song data', function(data) {
        // console.log('received song');
        // console.dir(data);
        var parsed = {
            date: new Date(),
            data: JSON.parse(data.content)
        };
        fs.appendFile(dataPath + "/query.log", new Date() + "\t" + parsed.data.query + "\n");
        fs.appendFile(dataPath + "/song.log", JSON.stringify(parsed) + "\n");
        lastData = data;
        lyricsio.emit('receive song data', lastData);
    });
});

function die(sig) {
    if (typeof sig === "string") {
        console.log('%s: Received %s - terminating app ...',
            Date(Date.now()), sig);
        process.exit(1);
    }
    console.log('%s: Node server stopped.', Date(Date.now()) );
}
process.on('exit', die);
'hup int quit ill trap abrt bus fpe usr1 segv usr2 term'.split(' ').forEach(function(sig) {
    sig = 'SIG' + sig.toUpperCase();
    process.on(sig, function() { die(sig); });
});

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
http.listen(port, ip, function() {
    console.log('listening on ' + ip + ':' + port);
});