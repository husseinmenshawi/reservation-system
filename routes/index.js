const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');
const path = require('path');
const db = require("../mongoos1.js");
const collection = "venuesches";
const collection2 = "users";


router.use(express.static(path.join(__dirname, 'public')));
// Welcome Page
router.get('/', (req, res) => res.render('welcome'));

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/dashboard', 
    {
    
    res.render('dashboard', {
        user: req.user
    })

    });
//Reserve Page
router.get('/dashboard/reserve',ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/reserve', 
    res.render('reserve', {
        user: req.user
    })
);

//Find Venue Page
router.get('/dashboard/reserve/fVenue',ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/reserve', 
    res.render('fVenue', {
        user: req.user
    })
);


//View Admin Page
router.get('/settings/vAdmin', (req, res) => {
    var query = { role: "admin" };
    db.getDB().collection(collection2).find(query).toArray(function(err, result){
        if (!err) {
            
            res.render("vAdmin", {
                admins: result,
                user:req.user
            });
        }
        else {
            console.log('Error in displaying Admins :' + err);
        }
    });
});

//View All Venue Page
router.get('/settings/vVenue', (req, res) => {
    
    db.getDB().collection(collection).find({}).toArray(function(err, result){
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

//Request Page
router.get('/dashboard/requests', ensureAuthenticated, (req, res) => {
    const query=({requestStatus:"TBD"})
    const query2=({requestedBy: req.user})
    let errors=[];
    if (req.isAuthenticated() && req.user.isAdmin()) {

        
        db.getDB().collection("requests").find(query).toArray(function(err, result){
            if (!err) {

                res.render("requests", {
                    requested: result,
                    user: req.user
                });
            }
            else {
                console.log('Error in request page :' + err);
            }
        });
        
    }
    else if (req.isAuthenticated() && !req.user.isAdmin()) {

        
        db.getDB().collection("requests").find(query2).toArray(function(err, result){
            if (!err) {

                res.render("requests", {
                    requested: result,
                    user: req.user
                });
            }
            else {
                console.log('Error in request page :' + err);
            }
        });
        
    }
    else {
        
        errors.push({msg: 'Access only for Administrators'});
        if (errors.length>0){
            res.render('dashboard', {
                errors,
                user: req.user
            });
        }
    }
    

    
});

//Reservations Page
router.get('/dashboard/reservation',ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/reserve', 
    res.render('reservation', {
        user: req.user
    })
);

//Profile Page
router.get('/profile', ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/settings', 
{
    res.render('profile', {
    user: req.user
        })
});

//Settings Page
router.get('/settings', ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/settings', 
{
    let errors=[];
    if (req.isAuthenticated() && req.user.isAdmin()) {
        res.render('settings', {
            user: req.user
        })
    }
    else {
        errors.push({msg: 'Access only for Administrators'});
        if (errors.length>0){
            res.render('dashboard', {
                errors,
                user:req.user
            });
        }
    }
});
//Adding Admin Page 
router.get('/settings/aAdmin', ensureAuthenticated,(req, res) => //to secure this page use 'ensureAuthenticated,' after '/settings', 
    res.render('aAdmin', {
        user: req.user
    })
);
//Removing Admin Page
router.get('/settings/rAdmin', ensureAuthenticated,(req, res) => //to secure this page use 'ensureAuthenticated,' after '/settings', 
    res.render('rAdmin', {
        user: req.user
    })
);
//Adding Venue
router.get('/settings/aVenue',ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/settings', 
    res.render('aVenue', {
        user: req.user

    })
);

//Removing Venue
router.get('/settings/rVenue',ensureAuthenticated, (req, res) => //to secure this page use 'ensureAuthenticated,' after '/settings', 
    res.render('rVenue', {
        user: req.user
    })
);





module.exports = router;
