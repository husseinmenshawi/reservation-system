const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectID;
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const path = require('path');
const bodyParser = require("body-parser");
const collection = "venuesches";
const collection2 = "users";

require("./models/venue.js");
const venueSch = mongoose.model('venueSch');

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

// Adding admin
app.post('/settings/aAdmin', (req, res) => {
    //  receiving matricNo
    const matricNo = req.body.matricNo;
    let errors=[];

    if(!matricNo){
        errors.push({msg: 'Please enter Matric Number'});
    }

    if (errors.length > 0) {
        res.render('aAdmin', {
            errors,
            user: req.user
        });
    } else {
        db.getDB().collection(collection2).findOne({ matricNo: matricNo }).then(user => {
            if (!user) {
                
                errors.push({ msg: "User does not exist" });
                res.render('aAdmin', {
                    errors,
                    user: req.user
                });
            }
            else {
                db.getDB().collection(collection2).findOneAndUpdate({ matricNo: matricNo }, { $set: { role: "admin" } }, { returnOriginal: false }, (err, result) => {
                    if (!err) {
                        req.flash(
                            'success_msg',
                            'Admin privileges added!'
                        );
                        res.redirect('/settings/aAdmin')

                    }
                    else {
                        console.log(err);
                    }
                });

            }

        });

    } //end of else
});

//Removing Admin

app.post('/settings/rAdmin', (req, res) => {
    //  receiving matricNo
    const matricNo = req.body.matricNo;
    let errors = [];

    if (!matricNo){
        errors.push({msg : "Please enter Matric Number"});
    }


    if (errors.length > 0) {
        res.render('rAdmin', {
            errors,
            user: req.user
        });
    } else {
        db.getDB().collection(collection2).findOne({ matricNo: matricNo }).then(user => {
            if (!user) {
                
                errors.push({ msg: "User does not exist" });
                res.render('rAdmin', {
                    errors,
                    user: req.user
                });
            }
            else {
                db.getDB().collection(collection2).findOneAndUpdate({ matricNo: matricNo }, { $set: { role: "user" } }, { returnOriginal: false }, (err, result) => {
                    if (!err) {
                        req.flash(
                            'error',
                            'Admin privileges removed!'
                        );
                        res.redirect('/settings/rAdmin')

                    }
                    else {
                        console.log("error removing venue" + err);
                    }
                });

            }

        });

    } //end of else
});


// Request Details Page
app.get('/dashboard/requests/details/:id', (req, res) => {
    const reqID = req.params.id;
    
    var query = { _id: ObjectId(reqID)};

    db.getDB().collection("requests").find(query).toArray(function(err, result){
        if (!err) {
            
            res.render("details", {
                requested: result,
                user: req.user
            });
        }
        else {
            console.log('Error in reservations :' + err);
        }
    });
});

//Accept Button
app.post('/dashboard/requests/details/:id',(req, res)=>{
    const reqID = req.params.id;
    var query = { _id: ObjectId(reqID)};

    

    db.getDB().collection("requests").findOneAndUpdate(query, { $set: { 
        requestStatus: "accepted"
        
        }}, { returnOriginal: false }, (err, result) => {
        if (err)
            console.log(err);
        else {
            db.getDB().collection("bookings").deleteMany();
            var documentsToMove = db.getDB().collection("requests").find({});
            documentsToMove.forEach(function(doc) {
            db.getDB().collection("bookings").insertOne(doc);
        });
        db.getDB().collection("requests").findOne(query , (err,result)=>{
            db.getDB().collection("history").insertOne(result);
        });
            req.flash(
            'success_msg',
            'Request Accepted!'
            );
            res.redirect('/dashboard/requests')
            
            }
    }); // end of DB
//     var documentsToMove = db.getDB().collection("requests").find({});
//     documentsToMove.forEach(function(doc) {
//         db.getDB().collection("bookings").insertOne(doc);
    
// });


    

});

//Reject request Page
app.get('/dashboard/requests/details/:id/reject/:id', (req, res) => {//to secure this page use 'ensureAuthenticated,' after '/reserve', 
    const reqID = req.params.id;
    var query = { _id: ObjectId(reqID)};

    db.getDB().collection("requests").find(query).toArray(function(err, result){
        if (!err) {
            
            res.render("reject", {
                requested: result,
                user: req.user
            });
        }
        else {
            console.log('Error in reservations :' + err);
        }
    });
});

//Reject Button
app.post('/dashboard/requests/details/:id/reject/:id',(req, res)=>{
    const reqID = req.params.id;

    var query = { _id: ObjectId(reqID)};
    
    
    db.getDB().collection("requests").findOneAndUpdate(query, { $set: { 
        
        requestStatus: "rejected",
        reasonOfRejection: req.body.reasonOfRejection
        

        }}, { returnOriginal: false }, (err, result) => {
        if (err)
            console.log(err);
        else {
            db.getDB().collection("bookings").deleteMany();
            var documentsToMove = db.getDB().collection("requests").find({});
            documentsToMove.forEach(function(doc) {
            db.getDB().collection("bookings").insertOne(doc);
        });
            db.getDB().collection("requests").findOne(query , (err,result)=>{
                db.getDB().collection("history").insertOne(result);
            });

            /*db.getDB().collection(collection).findOneAndUpdate(query2, {$set:{

            }}, {returnOriginal : false})*/
            
            
            req.flash(
            'error_msg',
            'Request rejected!'
            );
            res.redirect('/dashboard/requests')
            
            }
    });
});


// Reserving venue
app.post('/dashboard/reserve', (req, res) => {
    //  receiving roomNo by 
    const venueNo = req.body.roomNo;
    const slotStart = req.body.reserveStartTime;
    const slotEnd = req.body.reserveEndTime;
    const slotDateStart =req.body.reserveStartDate;
   
    var query={
        roomNo:venueNo  
    }
    let errors = [];

    if (!req.body.roomNo || !req.body.reserveStartDate || !req.body.reserveStartTime || !req.body.reserveEndTime || !req.body.purpose){
        errors.push({msg : 'Please enter all fields!'})
    }
    

    if (errors.length>0){
        res.render("reserve",{
            errors,
            user: req.user,
            venueNo,
            slotStart,
            slotEnd,
            slotDateStart

        });

    }else{
        db.getDB().collection("requests").findOne({venueRequested: venueNo,reserveStartTime: slotStart, reserveEndTime: slotEnd , reserveStartDate: slotDateStart, requestStatus:{$ne:"rejected"}}).then(venue=>{
            if(venue){
                errors.push({ msg: "Venue already booked on that timing!" });  
                    res.render("reserve", {
                    errors,
                    user: req.user
                });
            }
            else if(!venue){
                db.getDB().collection(collection).findOne({ roomNo: venueNo, slotStart: slotStart ,slotEnd: slotEnd }).then(venue => {
                    if (!venue) {
                
                        errors.push({ msg: "Venue/slot does not exist" });  
                        res.render("reserve", {
                        errors,
                        user: req.user
                        });
                    }
                    else {
                        db.getDB().collection("requests").insertOne({
                            venueRequested: req.body.roomNo,
                            requestedBy: req.user,
                            timeOfRequest: new Date(),
                            reserveStartDate: req.body.reserveStartDate,
                            reserveStartTime: req.body.reserveStartTime,
                            reserveEndTime: req.body.reserveEndTime,
                            purpose: req.body.purpose,
                            requestStatus: "TBD"
            
                            }, (err, result) => {
                            if (err)
                                console.log(err);
                            else {
                                req.flash(
                                'success_msg',
                                'Request Sent!'
                                );
                                db.getDB().collection(collection).findOneAndUpdate(query, {$push:{
                                    requested: slotDateStart
                                }},{returnOrginal: false});
                                
                                res.redirect('/dashboard/reserve')
                                }
                        });// end of DB
                        
                        
                }
                
                


                });// end of venue do not exit
            } // end of if (!venue)
        }); // end of venue booked 
    }// end of huge else

});




//fetching reservations 
app.get('/dashboard/reservation', (req, res) => {
    if (req.user.isAdmin()){
    db.getDB().collection("bookings").find({requestStatus:"accepted",}).toArray(function(err, result){
        if (!err) {
            
            res.render("reservation", {
                reservation: result,
                user: req.user
            });
        }
        else {
            console.log('Error in reservations :' + err);
        }
    });
}else if (!req.user.isAdmin()){
    db.getDB().collection("bookings").find({requestStatus:"accepted", requestedBy: req.user}).toArray(function(err, result){
        if (!err) {
            
            res.render("reservation", {
                reservation: result,
                user: req.user
            });
        }
        else {
            console.log('Error in reservations :' + err);
        }
    });
}
});
// fetching history
app.get('/dashboard/history', (req, res) => {
    
    
    db.getDB().collection("history").find({requestStatus: {$ne:"TBD"}}).toArray(function(err, result){
        if (!err) {
            
            res.render("history", {
                history: result,
                user: req.user
            });
        }
        else {
            console.log('Error in reservations :' + err);
        }
    });
});


// removing venue from database
app.post('/settings/rVenue', (req, res) => {
    var venueNo = req.body.roomNo;
    let errors = [];
  

   if (!venueNo) {
        errors.push({ msg: "please enter venue number" });

  }
    
   
   
    if (errors.length > 0) {
        res.render('rVenue', {
            errors,
            user: req.user
        });
    } else {
        db.getDB().collection(collection).findOne({ roomNo: venueNo }).then(venue => {
            if (!venue) {
                
                errors.push({ msg: "Venue does not exist" });
                res.render('rVenue', {
                    errors,
                    user: req.user
                });
            }
            else {
                db.getDB().collection(collection).deleteOne({ "roomNo": venueNo }, (err, doc) => {
                    if (!err) {
                        req.flash(
                            'error',
                            'Venue removed from Database'
                        );
                        res.redirect('/settings/rVenue')

                    }
                    else {
                        console.log("error removing venue" + err);
                    }
                });

            }

        });

    }

});

//Remove all venues
app.post('/settings', (req, res) => {

    db.getDB().collection(collection).deleteMany({}, (err, doc) => {
        if (!err) {
            req.flash(
                'error',
                'All venues removed from Database'
                );
                res.redirect('/settings/vVenue')

                }
        else {
            console.log("error removing venue" + err);
            }
        });

    });



//adding venue to database
app.post('/settings/aVenue', (req, res) => {
    var newVenue = new venueSch();
    newVenue.roomNo = req.body.roomNo;
    newVenue.capacity = req.body.capacity;
    newVenue.projector = req.body.projector;
    newVenue.slotStart = (req.body.slotStart);
    newVenue.slotEnd = (req.body.slotEnd);
  
    let errors = [];

    if (!newVenue.roomNo || !newVenue.capacity || !newVenue.projector && newVenue.projector===true) { //suppose to be !newVenue.projector but, error would show when projector is false?????
        errors.push({ msg: 'Please enter all fields' });
    }



    if (isNaN(newVenue.capacity) ) {
        errors.push({ msg: 'capacity must be a number' });
    }

    if (typeof newVenue.projector !== "boolean" ){
        errors.push({ msg : "Projector field must be filled with true or false"});
    }

    if (errors.length > 0) {
        res.render('aVenue', {
            errors,
            user: req.user
          
        });
    } else {
       
        newVenue.save()
            .then(item => {
                req.flash(
                    'success_msg',
                    'Venue added to Database'
                );
                res.redirect('/settings/aVenue');

            })
            .catch(err => {
                res.status(400).send("unable to save to database");
            });
            }
        });


//Free all Venues
app.post('/settings/vVenue', (req, res) => {
    
    db.getDB().collection(collection).updateMany({}, { $set: { 
                    requested:[]
    
                    }} , { returnOriginal: false }, (err, result) => {
                    if (err)
                        console.log(err);
                    else {
                        req.flash(
                        'success_msg',
                        'All Venues Are Now Available!'
                        );
                        res.redirect('/settings/vVenue')
                        }
                });
    db.getDB().collection("bookings").deleteMany();
    db.getDB().collection("requests").deleteMany();
});
    

//Filtering
app.post('/dashboard/reserve/fVenue/avaVenues', (req, res) => {
        let errors=[];
        const capacity =  parseInt(req.body.capacity);
        const projector1 = req.body.projector;    
        const dateUser = req.body.searchStartDate;
        if (!dateUser){
            errors.push({msg: "Please specify a date"})
        }
        if (!req.body.capacity && req.body.searchStartDate && projector1 === "true"){
            var query={
                requested: {$ne:dateUser},
                projector: true
            }
        }

        

        if (!req.body.capacity && req.body.searchStartDate && projector1 === "false"){
            var query={
                requested: {$ne:dateUser},
                projector: false

            }
        }
    
        if (!req.body.projector&& req.body.capacity && req.body.searchStartDate){
            var query={
                requested: {$ne:dateUser},
                capacity: {$gte:capacity},
            }
        }
        if (!req.body.capacity && !req.body.projector && req.body.searchStartDate){
            var query = { 
               requested: {$ne:dateUser},
                }
        }
        if (req.body.searchStartDate && req.body.capacity && req.body.projector === "true"){
            var query = { 
            
            capacity: {$gte:capacity},
            projector: true,
            requested: {$ne:dateUser}
           
            }
            
        }
        if (req.body.searchStartDate && req.body.capacity && req.body.projector === "false"){
            var query = { 
            
            capacity:{$gte:capacity} ,
            projector: false,
            requested: {$ne:dateUser}
           
            }
            
        }
        
        
            console.log(query)
            if (errors.length>0){
            res.render("fVenue",{
                errors,
                user: req.user
            });
        }
        else {
        
            // db.getDB().collection("requests").find({reserveStartDate: dateUser}).toArray(function(err,result){
                 //if(!result){
                     db.getDB().collection(collection).find(query).toArray(function(err, result){
                 
                         if (!err) {
                             
                             res.render("avaVenues", {
                                 reservation: result,
                                 user:req.user
                             });
                         }
                         else {
                             console.log('Error in displaying Venues :' + err);
                         }
                     });// end of venue db
               //  }// end of if
            // }); // end of request db
         }

    // end of else
        

        
        
    }); //end of post
    



// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));


//const PORT = process.env.PORT || 5000;

//app.listen(PORT, console.log(`Server started on port ${PORT}`));
