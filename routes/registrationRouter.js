const express = require('express');
const router = express.Router();
const { completesignupUser } = require('../controllers/userController');




router.post('/completesignupUser', completesignupUser);



module.exports = router;
