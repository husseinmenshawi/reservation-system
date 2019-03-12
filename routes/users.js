const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const bodyParser = require("body-parser");
// Load User model
const User = require('../models/User');
const path = require('path');


const app = express();
app.use(bodyParser.json());


router.use(express.static(path.join(__dirname, 'public')));

router.get('/../public/reserve.html', (req, res) => res.render('reserve.html'));
// Login Page
router.get('/login', (req, res) => res.render('login'));

// Register Page
router.get('/register', (req, res) => res.render('register'));

// Register
router.post('/register', (req, res) => {
    const { name, matricNo, email, password, password2 } = req.body;
    let errors = [];

    if (!name || !matricNo || !email || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (matricNo.length < 7 || matricNo.length > 7) {
        errors.push({ msg: 'Matric numbers must be 7 numbers ' });
    }

    if (password != password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            matricNo,
            email,
            password,
            password2
        });
    } else {
        User.find({ matricNo: matricNo, email: email }).then(user => {
            if (user) {
                errors.push({ msg: 'Matric number Or Email already registered' });
                res.render('register', {
                    errors,
                    name,
                    matricNo,
                    email,
                    password,
                    password2
                });
            } else {
                const newUser = new User({
                    name,
                    matricNo,
                    email,
                    password
                });

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        newUser
                            .save()
                            .then(user => {
                                req.flash(
                                    'success_msg',
                                    'You are now registered and can log in'
                                );
                                res.redirect('/users/login');
                            })
                            .catch(err => console.log(err));
                    });
                });
            }
        });
    }
});

// Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard', // to make this work use       ../reserve.html
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
});



module.exports = router;
