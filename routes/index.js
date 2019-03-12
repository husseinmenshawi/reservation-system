const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');
const path = require('path');


router.use(express.static(path.join(__dirname, 'public')));
// Welcome Page
router.get('/', (req, res) => res.render('welcome'));

// Dashboard
router.get('/dashboard',  (req, res) => //to secure this page use 'ensureAuthenticated,' after '/dashboard', 
    res.render('dashboard', {
        user: req.user
    })
);

router.get('/reserve', (req, res) => //to secure this page use 'ensureAuthenticated,' after '/reserve', 
    res.render('reserve', {
        user: req.user
    })
);

module.exports = router;
