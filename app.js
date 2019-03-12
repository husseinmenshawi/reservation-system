const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const path = require('path');
const bodyParser = require("body-parser");
const collection = "venue";

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// Passport Config
require('./config/passport')(passport);

// DB Config
//const db = "mongodb://localhost:27017/FYP";
const db = require("./mongoos1.js");

// Connect to MongoDB
db.connect((err) => {
    // If err unable to connect to database
    // End application
    if (err) {
        console.log('unable to connect to database');
        process.exit(1);
    }
    // Successfully connected to database
    // Start up our Express Application
    // And listen for Request
    else {
        app.listen(5000, () => {
            console.log('connected to database, app listening on port 5000');
        });
    }
});

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Express body parser
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Express session
app.use(
    session({
        secret: 'secret',
        resave: true,
        saveUninitialized: true
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});



app.put('/:roomNo', (req, res) => {
    //  receiving roomNo by 
    const venueNo = req.params.roomNo;

    // const userInput = req.body;

    // Find Document By roomNo and Update
    db.getDB().collection(collection).findOneAndUpdate({ roomNo: venueNo }, { $set: { Booked: true } }, { returnOriginal: false }, (err, result) => {
        if (err)
            console.log(err);
        else {
            res.json(result);
        }
    });
});


// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));

//const PORT = process.env.PORT || 5000;

//app.listen(PORT, console.log(`Server started on port ${PORT}`));
