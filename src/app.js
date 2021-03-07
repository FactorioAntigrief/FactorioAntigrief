const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require("mongoose");
const config = require("../config.json")

const indexRouter = require('./routes/index')
const communityRouter = require('./routes/communities')
const ruleRouter = require('./routes/rules');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app.set('trust proxy', true)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter)
app.use('/communities', communityRouter)
app.use('/rules', ruleRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    console.log(req)
    res.status(404).send("Page Not Found")
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })

module.exports = app;
