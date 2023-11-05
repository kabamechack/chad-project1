const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post('/signupUser', authController.signupUser);
router.post("/login", authController.login);
router.get('/logout', authController.logout);

router.get('/verifyTokenExpiration', authController.verifyTokenExpiration);
router.patch('/suspend/:userId', userController.suspendUser); 



router.post('/registerAdminSelf',  authController.registerAdminSelf);
router.post('/registerTeamMember', authController.registerTeamMember);
router.delete('/deleteUser/:id', authController.protect, authController.restrictTo('admin'), userController.deleteUser);


router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);


router.patch('/updatePassword', authController.protect, authController.updatePassword);
  router.patch('/updateMe', authController.protect, userController.updateMe);
  router.delete('/deleteMe', authController.protect, userController.deleteMe);

router
.route("/")
.get(userController.getAllUsers)
// .post(userController.createUser);

router
.route("/:id")
.get(userController.getUser)
.patch(userController.updateUser)
// .delete(userController.deleteUser);

module.exports = router;





