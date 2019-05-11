const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectID;
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const path = require('path');
const bodyParser = require("body-parser");
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');

const collection = "venuesches";
const collection2 = "users";

require("./models/venue.js");
const venueSch = mongoose.model('venueSch');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// Passport Config
require('./config/passport')(passport);

// DB Config

const db = require("./mongoos1.js");

// Connect to MongoDB
db.connect((err) => {
    if (err) {
        console.log('unable to connect to database');
        process.exit(1);
    }

    else {
        app.listen(5000, () => {
            console.log('connected to database, app listening on port 5000');
        });
    }
});
let conn = mongoose.createConnection("mongodb://localhost:27017/FYP")
// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});
// Create storage engine
const storage = new GridFsStorage({
    url: "mongodb://localhost:27017/FYP",
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });

  const upload = multer({ storage });
// @route GET /download/:filename
// @desc  Download single file object
app.get('/download/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
    // streaming from gridfs
    var readstream = gfs.createReadStream({
      filename: req.params.filename
    });
    //error handling, e.g. file does not exist
    readstream.on('error', function (err) {
      console.log('An error occurred!', err);
      throw err;
    });
    readstream.pipe(res);
  });
});
// @desc Display Image
app.get('/uploads/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
  
      // Check if image
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
        // Read output to browser
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not an image'
        });
      }
    });
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
        errors.push({msg: 'Please Select a User'});
    }

    if (errors.length > 0) {
        db.getDB().collection("users").find({role:"user"}).toArray(function(err, result){
            
            res.render("aAdmin", {
                users: result,
                user: req.user,
                errors
            });
        });
    } else {
        db.getDB().collection(collection2).findOne({ matricNo: matricNo }).then(user => {
            if (!user) {
                
                errors.push({ msg: "User does not exist" });
                db.getDB().collection("users").find({role:"user"}).toArray(function(err, result){
            
                    res.render("aAdmin", {
                        users: result,
                        user: req.user,
                        errors
                    });
                });
            }
            else {
                db.getDB().collection(collection2).findOneAndUpdate({ matricNo: matricNo }, { $set: { role: "admin" } }, { returnOriginal: false }, (err, result) => {
                    if (!err) {
                        req.flash(
                            'success_msg',
                            'Admin privileges added!'
                        );
                        res.redirect("/settings/aAdmin");

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
        errors.push({msg : "Please Select A User"});
    }


    if (errors.length > 0) {
        
        db.getDB().collection("users").find({role:"admin"}).toArray(function(err, result){
            
            res.render("rAdmin", {
                users: result,
                user: req.user,
                errors
            });
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
                        res.redirect("rAdmin");
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
    let errors= [];
    var query = { _id: ObjectId(reqID)};
    venueNo= req.body.venueNo;
    dateRes = req.body.dateRes;
    purpose =  req.body.reasonOfRejection
    
    if (!venueNo || !dateRes ||!purpose){
        errors.push({msg: " please enter all fields when rejecting a request!"})
    }

    if( errors.length>0){
        db.getDB().collection("requests").find(query).toArray(function(err, result){
            if (!err) {
                
                res.render("reject", {
                    errors,
                    requested: result,
                    user: req.user
                });
            }
            else {
                console.log('Error in reservations :' + err);
            }
        });
        
    }
    else{
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
            
            db.getDB().collection(collection).findOneAndUpdate({roomNo: venueNo} , {$pull:{
                requested: dateRes
            }}, {mutli:true});

            /*db.getDB().collection(collection).findOneAndUpdate(query2, {$set:{

            }}, {returnOriginal : false})*/
            
            
            req.flash(
            'error_msg',
            'Request rejected!'
            );
            res.redirect('/dashboard/requests')
            
            }
    });
}
});


// Reserving venue
app.post('/dashboard/reserve', upload.single('file'),(req, res) => {
    //  receiving roomNo by 

    const venueNo = req.body.roomNo;
    const slotStart = req.body.reserveStartTime;
    const slotEnd = req.body.reserveEndTime;
    const slotDateStart =req.body.reserveStartDate;

    var query={
        roomNo:venueNo,
        slotStart,
        slotEnd
    }

    let errors = [];

    if (!req.body.roomNo || !req.body.reserveStartDate || !req.body.reserveStartTime || !req.body.reserveEndTime || !req.body.purpose){
        errors.push({msg : 'Please enter all fields!'})
    }
    

    if (errors.length>0){
        db.getDB().collection(collection).distinct("roomNo", function(err, result){ 
        res.render("reserve",{
            errors,
            user: req.user,
            venueNo,
            slotStart,
            slotEnd,
            slotDateStart,
            venues:result

        });
    });

    }else if( slotStart =="8:30AM" && slotEnd=="10:00PM"){  
            
                db.getDB().collection('requests').findOne({venueRequested: venueNo,
                "reserveStartDate" : slotDateStart,
                "reserveStartTime" : {$in:["8:30AM","10:00AM","11:30AM","2:00PM","3:30PM","5:00PM","8:00PM"]},
                "reserveEndTime" : {$in:["9:50AM","11:20AM","12:50PM","3:20PM","4:50PM","6:20PM","10:00PM"]},
                "requestStatus" : {$nin:["rejected","cancelled"]}}).then(venue=>{
                    if(venue){
                        errors.push({msg: "Unable to book venue for full day due to another booking on same date"});
                        db.getDB().collection(collection).distinct("roomNo", function(err, result){  
                            res.render("reserve", {
                            errors,
                            user: req.user,
                            venues:result
                                });
                            });
                    }
                    else if(!venue){
                        db.getDB().collection("requests").findOne({"venueRequested": venueNo,"reserveStartTime": slotStart, "reserveEndTime": slotEnd , "reserveStartDate": slotDateStart, "requestStatus":{$nin:["rejected","cancelled"]} }).then(venue2=>{
                            if(venue2){
                            errors.push({ msg: "Venue already booked on that timing!" });
                            db.getDB().collection(collection).distinct("roomNo", function(err, result){  
                            res.render("reserve", {
                            errors,
                            user: req.user,
                            venues:result
                                });
                            });
                        }
                            else if(!venue2){
                                db.getDB().collection(collection).findOne({ roomNo: venueNo, slotStart: slotStart ,slotEnd: slotEnd }).then(venue => {
                                    if (!venue) {
                                        db.getDB().collection(collection).distinct("roomNo", function(err, result){ 
                                        errors.push({ msg: "Venue/slot does not exist" });  
                                        res.render("reserve", {
                                        errors,
                                        user: req.user,
                                        venues:result
    
                                        });
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
                                            requestStatus: "TBD",
                                            file: req.file
                
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
                }); 
                        

                    }
                }); // end of venue
            } // end of else if
    else{
            
            db.getDB().collection("requests").findOne({venueRequested: venueNo,
            "reserveStartDate" : slotDateStart,
            "reserveStartTime" : "8:30AM",
            "reserveEndTime" : "10:00PM",
            "requestStatus" : {$nin:["rejected","cancelled"]}}).then(venue=>{
                if(venue){
                    errors.push({msg: "Venue booked for full day!"});
                    console.log(errors)
                    db.getDB().collection(collection).distinct("roomNo", function(err, result){  
                        res.render("reserve", {
                        errors,
                        user: req.user,
                        venues:result
                            });
                        });
                }
                else if (!venue){
                    
                    db.getDB().collection("requests").findOne({venueRequested: venueNo,reserveStartTime: slotStart, reserveEndTime: slotEnd , reserveStartDate: slotDateStart, requestStatus:{$nin:["rejected","cancelled"]}}).then(venue2=>{
                        if(venue2){
                        errors.push({ msg: "Venue already booked on that timing!" });
                        db.getDB().collection(collection).distinct("roomNo", function(err, result){  
                        res.render("reserve", {
                        errors,
                        user: req.user,
                        venues:result
                            });
                        });
                    }
                        else if(!venue2){
                            db.getDB().collection(collection).findOne({ roomNo: venueNo, slotStart: slotStart ,slotEnd: slotEnd }).then(venue => {
                                if (!venue) {
                                    db.getDB().collection(collection).distinct("roomNo", function(err, result){ 
                                    errors.push({ msg: "Venue/slot does not exist" });  
                                    res.render("reserve", {
                                    errors,
                                    user: req.user,
                                    venues:result

                                    });
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
                                        requestStatus: "TBD",
                                        file: req.file
            
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
                                        db.getDB().collection(collection).findOneAndUpdate({roomNo:venueNo,slotStart:"8:30AM",slotEnd:"10:00PM"}, {$push:{
                                            requested: slotDateStart
                                            }},{returnOrginal: false});
                                
                                        res.redirect('/dashboard/reserve')
                                    }
                                    });// end of DB
                        
                        
                                    }   
                
                


                    });// end of venue do not exit
                } // end of if (!venue)
            }); // end of venue booked 

       
    
        }
    });
    }// end of huge else


});

//canceling reservation
app.post('/dashboard/requests/:id', (req,res) =>{
    requestID= req.params.id;
    
    db.getDB().collection("requests").findOneAndUpdate({_id: ObjectId(requestID)}, {$set:{ 
        requestStatus : "cancelled"
        
    }},{ returnOriginal: false }, (err, result) => {
        if (err)
            console.log(err);
        else {
            db.getDB().collection("bookings").deleteMany();
            var documentsToMove = db.getDB().collection("requests").find({});
            documentsToMove.forEach(function(doc) {
            db.getDB().collection("bookings").insertOne(doc);
        });
            db.getDB().collection("requests").findOne({_id: ObjectId(requestID)} , (err,result)=>{
                db.getDB().collection("history").insertOne(result);
            
            db.getDB().collection(collection).findOneAndUpdate({roomNo: result.venueRequested} , {$pull:{
                requested: result.reserveStartDate
            }}, {mutli:true});
            });
            req.flash(
                'error_msg',
                'Request Cancelled!'
                );
                res.redirect('/dashboard/requests')
                
                }
        
    
    });
});




//fetching reservations 
app.get('/dashboard/reservation', (req, res) => {
    if (req.user.isAdmin()){
    db.getDB().collection("requests").find({requestStatus:{$in:["accepted", "cancelled"]}, displayStatus:{$ne:"cleared"}}).toArray(function(err, result){
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
    const query2=({"requestedBy.matricNo": req.user.matricNo})
    
    db.getDB().collection("requests").find({"requestStatus":"accepted", "requestedBy.matricNo": req.user.matricNo}).toArray(function(err, result){
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

//clearing reservations
app.post('/dashboard/reservation/:id', (req,res)=>{
    reservationID = req.params.id;
    db.getDB().collection("requests").findOneAndUpdate({_id: ObjectId(reservationID)}, { $set:{
        "displayStatus": "cleared"
    }},{returnOrginal:false}, (err, result)=>{
        if(!err){
            
            req.flash(
                'error',
                'Reservation Cleared'
            );
        
        }
        
        res.redirect("/dashboard/reservation")
    });
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
                db.getDB().collection(collection).deleteMany({ "roomNo": venueNo }, (err, doc) => {
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

//adding venue to database
app.post('/settings/aVenue', (req, res) => {
    
    var newVenue = new venueSch();
    newVenue.roomNo = req.body.roomNo;
    newVenue.capacity = req.body.capacity;
    newVenue.venueType= req.body.venueType;
    newVenue.seatingType = req.body.seatingType;
    newVenue.slotStart = req.body.slotStart;
    newVenue.slotEnd = req.body.slotEnd;
    let errors = [];


    if (!newVenue.seatingType||!newVenue.venueType|| !newVenue.roomNo || !newVenue.capacity) { //suppose to be !newVenue.projector but, error would show when projector is false?????
        errors.push({ msg: 'Please enter all fields' });
    }
    if (isNaN(newVenue.capacity) ) {
        errors.push({ msg: 'capacity must be a number' });
    }
    if (errors.length > 0) {
        db.getDB().collection(collection).distinct("roomNo" ,function(err, result){
            if (!err) {    
                res.render("aVenue", {
                    venues: result,
                    user: req.user,
                    errors
                });
        }
            else {
                console.log('Error in displaying Venues :' + err);
            }
        });
    } else {

        db.getDB().collection(collection).findOne({
            roomNo: req.body.roomNo,
        }).then(venue=>{
            if (venue){
                errors.push({msg:'Venue already available!'});
                db.getDB().collection(collection).distinct("roomNo" ,function(err, result){
                    if (!err) {    
                        res.render("aVenue", {
                            venues: result,
                            user: req.user,
                            errors
                        });
                }
                    else {
                        console.log('Error in displaying Venues :' + err);
                    }
                });
            }
            else{
                
                db.getDB().collection(collection).insertMany([
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "8:30AM", slotEnd: "9:50AM"},
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "10:00AM", slotEnd: "11:20AM"},
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "11:30AM", slotEnd: "12:50PM"},
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "2:00PM", slotEnd: "3:20AM"},
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "3:30PM", slotEnd: "4:50PM"},
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "5:00PM", slotEnd: "6:20PM"},
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "8:00PM", slotEnd: "10:00PM"},
                    {roomNo: req.body.roomNo, capacity: parseInt(req.body.capacity),
                    venueType: req.body.venueType, seatingType: req.body.seatingType,
                    slotStart: "8:30AM", slotEnd: "10:00PM"},
                ]).then(item =>{
                    req.flash(
                        'success_msg',
                        `${req.body.roomNo} Added with Eight Time Slots`
                    );
                    res.redirect('/settings/aVenue');
                })
                .catch(err => {
                    res.status(400).send("unable to save to database");
                });

            }
        });
       
        
            }
        });


//Free all Venues
app.post('/settings', (req, res) => {
    
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
                        res.redirect('/settings')
                        }
                });
    db.getDB().collection("bookings").deleteMany();
    db.getDB().collection("requests").deleteMany();
});
    

// Flitering Venue by block 
app.post('/settings/vVenue', (req, res) => {
    const blockNo= req.body.blockNo;
    query = {roomNo:{$regex:blockNo}}
    db.getDB().collection(collection).find(query).toArray(function(err, result){
        if (!err) {
            
            res.render("vVenue", {
                venues: result,
                user: req.user
            });
        }
        else {
            console.log('Error in displaying Venues :' + err);
        }
    });
    
});

//Filtering
app.post('/dashboard/reserve/fVenue/avaVenues', (req, res) => {
        
        let errors=[];
        const capacity =  parseInt(req.body.capacity);
        const venueType = req.body.venueType;
        const seatingType = req.body.seatingType;
        const blockNo   = req.body.blockNo;    
        const dateUser = req.body.searchStartDate;
        if (!dateUser){
            errors.push({msg: "Please specify a date"})
        }
        
        if (req.body.searchStartDate && req.body.capacity && venueType && seatingType && blockNo){
            var query = { 
            
            capacity: {$gte:capacity},
            requested: {$ne:dateUser},
            venueType: venueType,
            seatingType: seatingType,
            roomNo: {$regex:blockNo}
           
            }
            
        }
        if (req.body.capacity && req.body.searchStartDate && venueType && seatingType && !blockNo){
            var query={
                requested: {$ne:dateUser},
                venueType: venueType,
                seatingType: seatingType,
                capacity: {$gte:capacity}
                

            }
        }
        if (!req.body.capacity && req.body.searchStartDate && venueType && seatingType && blockNo){
            var query={
                requested: {$ne:dateUser},
                venueType: venueType,
                seatingType: seatingType,
                roomNo: {$regex:blockNo}
                

            }
        }
        if (req.body.searchStartDate && req.body.capacity && venueType && !seatingType && blockNo){
            var query = { 
            
            capacity:{$gte:capacity} ,
            requested: {$ne:dateUser},
            venueType: venueType,
            roomNo: {$regex:blockNo}
           
            }
            
        }
        if (!venueType && seatingType && req.body.capacity && req.body.searchStartDate && blockNo){
            var query={
                requested: {$ne:dateUser},
                capacity: {$gte:capacity},
                seatingType: seatingType,
                roomNo: {$regex:blockNo}
            } 
        }
        if (!venueType && !seatingType && req.body.capacity && req.body.searchStartDate && !blockNo){
            var query={
                requested: {$ne:dateUser},
                capacity: {$gte:capacity},
                
                
            } 
        }
        if (!req.body.capacity && !venueType&& !seatingType && req.body.searchStartDate && blockNo){
            var query = { 
               requested: {$ne:dateUser},
               roomNo: {$regex:blockNo}
                }
        }
        if (req.body.capacity && !venueType&& !seatingType && req.body.searchStartDate && !blockNo){
            var query = { 
               requested: {$ne:dateUser},
               capacity: {$gte:capacity}
                }
        }
        if (!req.body.capacity && venueType&& !seatingType && req.body.searchStartDate && !blockNo){
            var query = { 
               requested: {$ne:dateUser},
               venueType: venueType
                }
        }
        if (!req.body.capacity && venueType&& !seatingType && req.body.searchStartDate && blockNo){
            var query = { 
               requested: {$ne:dateUser},
               venueType: venueType,
               roomNo: {$regex:blockNo}
                }
        }
        if (!req.body.capacity && !venueType&& seatingType && req.body.searchStartDate && blockNo){
            var query = { 
               requested: {$ne:dateUser},
               seatingType: seatingType,
               roomNo: {$regex:blockNo}
                }
        }
        if (req.body.capacity && !venueType&& !seatingType && req.body.searchStartDate && blockNo){
            var query = { 
               requested: {$ne:dateUser},
               roomNo: {$regex:blockNo},
               capacity: {$gte:capacity}
               
                }
        }
        if (req.body.capacity && venueType&& !seatingType && req.body.searchStartDate && !blockNo){
            var query = { 
               requested: {$ne:dateUser},
               venueType: venueType,
               capacity: {$gte:capacity}
               
                }
        }
        if (!req.body.capacity && venueType&& seatingType && req.body.searchStartDate && !blockNo){
            var query = { 
               requested: {$ne:dateUser},
               venueType: venueType,
               seatingType : seatingType
               
                }
        }
        if (req.body.capacity && !venueType&& seatingType && req.body.searchStartDate && !blockNo){
            var query = { 
               requested: {$ne:dateUser},
               capacity: {$gte:capacity},
               seatingType : seatingType
               
                }
        }
        if (!req.body.capacity && !venueType&& !seatingType && req.body.searchStartDate && !blockNo){
            var query = { 
               requested: {$ne:dateUser},
                }
        }     
        if (errors.length>0){
            
            res.render("fVenue",{
                errors,
                user: req.user
            });
        }
        else {
        
            db.getDB().collection("requests").aggregate([
                { $match: {"reserveStartDate" : dateUser}},
                { $match :{"reserveStartTime" : "8:30AM"}},
                { $match : {"reserveEndTime" : "10:00PM"}},
                { $match : {"requestStatus" : {$ne:"rejected"}}},
                { $group :{_id:"$venueRequested"}}
            ]).toArray().then(venue=>{
                var values = venue.map(a=>a._id);
                query.roomNo={$regex:blockNo,$nin:values};
                db.getDB().collection(collection).find(query).toArray(function(err, result){
                
                        if (!err) {
                            
                            res.render("avaVenues", {
                                reservation: result,
                                user:req.user,
                                slotDate : dateUser
                            });
                        }
                        else {
                            console.log('Error in displaying Venues :' + err);
                        }
                    });// end of venue db
                    // end of if venue
                
            }); 
               
         } // end of else
        

        
        
    }); //end of post
    
// Filtering for Graphical User Interface
app.post('/dashboard/reserve/fVenueG/avaVenuesG', (req, res) => {
        let errors=[];
        const blockNo   = req.body.blockNo;    
        const dateUser = req.body.searchStartDate;


        
        var query={
            requested: {$ne:dateUser},
            roomNo: {$regex:blockNo}

        }
        if (!dateUser || !blockNo){
            errors.push({msg: "Please specify a date and a block No."})
        }
            
        if (errors.length>0){
            
            res.render("fVenueG",{
                errors,
                user: req.user
            });
        }
        else {
            db.getDB().collection("requests").aggregate([
            { $match: {"reserveStartDate" : dateUser}},
            { $match :{"reserveStartTime" : "8:30AM"}},
            {$match : {"reserveEndTime" : "10:00PM"}},
            {$match : {"requestStatus" : {$nin:["rejected","cancelled"]}}},
            { $group :{_id:"$venueRequested"}}
        ]).toArray().then(venue=>{
           
            var values = venue.map(a=>a._id);
            
            if (venue){
                
                db.getDB().collection(collection).find({roomNo: {$ne:venue.venueRequested}}).toArray(function(err,result2){ 
                
                    db.getDB().collection(collection).aggregate([
                  
                        { $match: { requested: {$ne:dateUser}}},
                        { $match: { roomNo: {$regex:blockNo}}},
                        { $match: { roomNo: {$nin:values}}},
                        
                        { $group: {_id:{ roomNo:"$roomNo", venueType: "$venueType"},
                            availability : {"$push":{
                                slotStart:"$slotStart",
                                slotEnd:"$slotEnd"
                            }  
                        }
                    }}
                        
                    ]).toArray(function(err, result){
                        
                         
                        if (!err) {
                            
                            res.render("avaVenuesG", {
                                venues:result2,
                                reservation: result,
                                user: req.user,
                                slotDate: dateUser
                            });
                        }
                        else {
                            console.log('Error in displaying Venues :' + err);
                        }
                    });// ed of (result )
                });
            }
            
            
            else if(!venue){
            
            db.getDB().collection(collection).find(query).toArray(function(err,result2){  
            db.getDB().collection(collection).aggregate([
                // Match the possible documents. Always the best approach
                { $match: { requested: {$ne:dateUser}}},
                { $match: { roomNo: {$regex:blockNo}}},
                { $group: {_id:{ roomNo:"$roomNo", venueType: "$venueType"},
                    availability : {"$push":{
                        slotStart:"$slotStart",
                        slotEnd:"$slotEnd"
                    }  
                }
            }}
                
            ]).toArray(function(err, result){
                 
                if (!err) {
                    
                    res.render("avaVenuesG", {
                        venues:result2,
                        reservation: result,
                        user: req.user,
                        slotDate: dateUser
                    });
                }
                else {
                    console.log('Error in displaying Venues :' + err);
                }
            });// ed of (result )
        }); // result2
       
               //  }// end of if
            // }); // end of request db
            }
            
        });
            
         }

    // end of else
        

        
        
    }); //end of post

//Get edit profile page
app.get('/dashboard/profile/editprofile/:id', (req, res) => {
        const profileID = req.params.id;
        
        var query = { _id: ObjectId(profileID)};
    
        db.getDB().collection(collection2).find(query).toArray(function(err, result){
            if (!err) {
                
                res.render("editprofile", {
                    userInfo: result,
                    user: req.user
                });
            }
            else {
                console.log('Error in reservations :' + err);
            }
        });
    });

// Get Venue Details using List Method
app.get('/dashboard/reserve/fVenue/avaVenues/venueDetails/:id/:slotDate' , (req,res)=>{
    const venueID = req.params.id;
    const slotDate = req.params.slotDate;
    
    var query = { _id: ObjectId(venueID)};

    db.getDB().collection(collection).find(query).toArray(function(err, result){
        if (!err) {
            
            res.render("venueDetails", {
                venue: result,
                user: req.user,
                slotDate: slotDate

            });
        }
        else {
            console.log('Error in reservations :' + err);
        }
    });
});
// Request Venue in Details page using list Method
app.post('/dashboard/reserve/fVenue/avaVenues/venueDetails/:id' , upload.single('file') ,  (req,res)=>{
   
    const venueID = req.params.id;
    const venueNo = req.body.roomNo
    const slotStart = req.body.reserveStartTime;
    const slotEnd = req.body.reserveEndTime;
    const slotDateStart =req.body.reserveStartDate;
    const purpose = req.body.purpose;
    var query = { _id: ObjectId(venueID)};
    let errors = [];

    if ( !slotDateStart || !purpose){
        errors.push({msg : 'Please enter all fields!'})
    }
    

    if (errors.length>0){
        db.getDB().collection(collection).find(query).toArray(function(err, result){
        res.render(`venueDetails`,{
            errors,
            user: req.user,
            venue: result
        });
    });

    }else{
            db.getDB().collection("requests").findOne({venueRequested: venueNo,
                "reserveStartDate" : slotDateStart,
                "reserveStartTime" : "8:30AM",
                "reserveEndTime" : "10:00PM",
                "requestStatus" : {$nin:["rejected","cancelled"]}}).then(venue=>{
                    
                    if(venue){
                        errors.push({msg: "Venue booked for full day on that date!"});
                        
                        db.getDB().collection(collection).find(query).toArray(function(err, result){
                             
                            res.render(`venueDetails`, {
                            errors,
                            user: req.user,
                            venue: result
                            
                            });
                        });
                    }
                    else if (!venue){
                    db.getDB().collection("requests").findOne({venueRequested: venueNo,reserveStartTime: slotStart, reserveEndTime: slotEnd , reserveStartDate: slotDateStart, requestStatus:{$nin:["rejected","cancelled"]}}).then(venue=>{
                    if(venue){
                    db.getDB().collection(collection).find(query).toArray(function(err, result){
                    errors.push({ msg: "Venue already booked on that date!" });  
                    res.render(`venueDetails`, {
                    errors,
                    user: req.user,
                    venue: result
                    
                    });
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
                        requestStatus: "TBD",
                        file: req.file
            
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
                                        db.getDB().collection(collection).findOneAndUpdate({roomNo:venueNo,slotStart:"8:30AM",slotEnd:"10:00PM"}, {$push:{
                                            requested: slotDateStart
                                            }},{returnOrginal: false});
                                
                                        res.redirect('/dashboard/reserve')
                                    }
                            });// end of DB
                        
                        
                        }   
            });
         } // end of !venue booked 
         }); 
    }// end of huge else
});



// Get Venue Details using Graphical method
app.get('/dashboard/reserve/fVenueG/avaVenuesG/venueDetailsG/:id/:slotStart/:slotEnd/:slotDate' , (req,res)=>{
    const venueNo = req.params.id;
    const slotStart = req.params.slotStart;
    const slotEnd = req.params.slotEnd;
    const slotDate = req.params.slotDate;
    var query = {roomNo:venueNo,slotStart:slotStart,slotEnd:slotEnd};

    db.getDB().collection(collection).find(query).toArray(function(err, result){
        if (!err) {
            
            res.render("venueDetailsG", {
                venue: result,
                user: req.user,
                slotDate: slotDate
            });
        }
        else {
            console.log('Error in reservations :' + err);
        }
    });
});
//Request Venue in Details page using Graphical Method
app.post('/dashboard/reserve/fVenueG/avaVenuesG/venueDetailsG/:id' , upload.single('file'), (req,res)=>{
    const venueID = req.params.id;
    const venueNo = req.body.roomNo
    const slotStart = req.body.reserveStartTime;
    const slotEnd = req.body.reserveEndTime;
    const slotDateStart =req.body.reserveStartDate;
    const purpose = req.body.purpose;
   
    var query = { _id: ObjectId(venueID)};
    let errors = [];

    if ( !slotDateStart || !purpose){
        errors.push({msg : 'Please enter all fields!'})
    }
    

    if (errors.length>0){
        db.getDB().collection(collection).find(query).toArray(function(err, result){
        res.render(`venueDetailsG`,{
            errors,
            user: req.user,
            venue: result
        });
    });

    }else{
        
                db.getDB().collection("requests").findOne({venueRequested: venueNo,reserveStartTime: slotStart, reserveEndTime: slotEnd , reserveStartDate: slotDateStart, requestStatus:{$nin:["rejected","cancelled"]}}).then(venue=>{
                    if(venue){
                    db.getDB().collection(collection).find(query).toArray(function(err, result){
                    errors.push({ msg: "Venue already booked on that date!" });  
                    res.render(`venueDetailsG`, {
                    errors,
                    user: req.user,
                    venue: result
                    
                    });
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
                        requestStatus: "TBD",
                        file: req.file
            
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
                                        db.getDB().collection(collection).findOneAndUpdate({roomNo:venueNo,slotStart:"8:30AM",slotEnd:"10:00PM"}, {$push:{
                                            requested: slotDateStart
                                            }},{returnOrginal: false});
                                
                                        res.redirect('/dashboard/reserve')
                                    }
                            });// end of DB
                        
                        
                        }   
            }); // end of venue booked 
    }// end of huge else
});



// editing profile
app.post('/dashboard/profile/editprofile/:id', (req, res) => {
        const profileID = req.params.id;
        var query = { _id: ObjectId(profileID)};

        
        db.getDB().collection(collection2).findOneAndUpdate(query, { $set: { 
        
            name: req.body.name,
            email: req.body.email
            
    
            }}, { returnOriginal: false }, (err, result) => {
            if (err)
                console.log(err);
            else {
                req.flash(
                    'success_msg',
                    'Profile has been edited!'
                    );
                    res.redirect('/profile')

            }
        });
    
    });


// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));


//const PORT = process.env.PORT || 5000;

//app.listen(PORT, console.log(`Server started on port ${PORT}`));
