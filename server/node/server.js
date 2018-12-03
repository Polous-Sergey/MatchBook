const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const config = require('./config');

// [SH] Bring in the data model
require('./models/db');

// [SH] Bring in the Passport config after model is defined
require('./config/passport');

require('./cron/cron');

// [SH] Bring in the routes for the API (delete the default routes)
const routesApi = require('./routes/index');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(cors());

// [SH] Initialise Passport before using the route middleware
app.use(passport.initialize());

// [SH] Use the API routes when path starts with /api
app.use('/api', routesApi);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

//web server for static files, enabled only on production
if (process.env.NODE_ENV === "production") {
    console.log('baseDir', baseDir);
    config.set('server:backend:port', config.get("server:frontend:port")); // On production backend server is on same port
    app.use(express.static(baseDir + '/public')); //Set the folder from where you serve all static files like images, css, javascripts, libraries etc

    //resolve all GET request via index.html
    app.get('/*', function (req, res, next) {
        if (req.url === '/' || req.url.startsWith('/api') || req.url.startsWith('/socket')) return next();
        res.sendFile(path.join(baseDir + '/public/index.html'));
    });

    //log
    console.log('Front-end listening at port ' + config.get("server:frontend:port"));
}

// error handlers

// [SH] Catch unauthorised errors
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401);
        res.json({"message": err.name + ": " + err.message});
    }
});

app.listen(config.port, () => {
    console.log('API Started on port ' + config.port);
});
