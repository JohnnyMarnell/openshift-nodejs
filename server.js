var express = require('express'),
    request = require('request'),
    fs = require('fs'),
    zlib = require('zlib'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    concat = require('concat-stream'),
    sailthru = require('sailthru-client');


//==============================================================
// Allow express to serve any static html css js etc, awesome
//==============================================================
app.use(express.static('static'));


//==============================================================
// Simple proxy to ST API client requests
//==============================================================
var sailClient = sailthru.createSailthruClient(process.env.PROD_CLIENT_KEY, process.env.PROD_CLIENT_SECRET);
app.use('/sail-api-user', function(req, res) {
    var email = req.query.email;
    sailClient.apiGet('user', {id: email}, function(err, sres) {
        res.send(sres)
    });
});

//=======================================================================
// Get around annoying XOR constraints by just proxying, also allow
// RegEx replace (that's how I get JetFab pages to look correct, have to
// hack around they're stuff because they don't support iframage)
//=======================================================================
app.use('/proxy', function(req, res) {
    var url = req.query.url; //validateProxy(req.query.url); //should really white/blacklist this stuff
    if (url) {
        var stream = request({url: url, gzip: true}, function(error, response, body) {
            var data = { url: url, date: new Date(), body: body }
            if (req.query.rsrc) {
                body = body.replace(new RegExp(req.query.rsrc, "ig"), req.query.rtarget);
            }
            res.send(body)
        });
    }
    else res.send("Denied");
});












//============================================================
// OpenShift hosting bootstrap code, unimportant
//============================================================
var dataPath = process.env.OPENSHIFT_DATA_DIR || './data/';
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