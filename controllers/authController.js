const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require("jsonwebtoken");
const User = require("./../models/userModel");
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');



const signToken = id => {
    return  jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signupUser = catchAsync(async (req, res, next) => {
  // Check if the user is trying to set an invalid role
  const userRoles = req.body.roles || ['user']; // Default to 'user' role if no roles provided
  if (!Array.isArray(userRoles) || userRoles.length !== 1 || userRoles[0] !== 'user') {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid user role for self-registration. Please provide a single "user" role.',
    });
  }
  // Check if the user is a first-time user (you can set this field as needed)
  const isFirstTimeUser = true; // Set to true for first-time users

  // Create a new user with roles and firstTimeUser status
  const newUser = await User.create({
    ...req.body,
    roles: userRoles,
    firstTimeUser: isFirstTimeUser,
  });
  // Respond with a success message and user data
  createSendToken(newUser, 201, res);
});

const registerAdminSelf = new Set();
exports.registerAdminSelf = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (role.includes('admin') && registerAdminSelf.has(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'A user with this role existed already.',
    });
  }

 // Check if all roles in the array are valid
 const validRoles = ["admin", 'team member', 'user'];
 const invalidRoles = role.filter((r) => !validRoles.includes(r));

 if (invalidRoles.length > 0) {
   return res.status(400).json({
     status: 'error',
     message: 'Invalid role(s) try again later ',
   });
 }

  if (role.includes('admin')) {
    registerAdminSelf.add(email); 
  }
  const newUser = new User({
    name,
    email,
    password,
    roles: role,
  });
  await newUser.save();
  res.status(201).json({
    status: 'success',
    data: newUser,
  });
});


 // Initialize a Set to track registered team members
const registeredTeamMembers = new Set();
exports.registerTeamMember = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (role.includes('team member') && registeredTeamMembers.has(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'A user with this role existed already .',
    });
  }

  // Check if all roles in the array are valid
  const validRoles = ['team member', 'user'];
  const invalidRoles = role.filter((r) => !validRoles.includes(r));

  if (invalidRoles.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid role(s) try again later ',
    });
  }

  if (role.includes('team member')) {
    registeredTeamMembers.add(email);
  }

  const newUser = new User({
    name,
    email,
    password,
    roles: role,
  });

  await newUser.save();
  res.status(201).json({
    status: 'success',
    data: newUser,
  });
});


exports.login =  catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
  
    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }
    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
 
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    };
// 3 if everything ok, send token to client
createSendToken(user, 201, res);
});

exports.logout = (req, res) => {
  res.clearCookie('jwt'); // Clear the JWT cookie
  res.status(200).json({ status: 'success' });
};


 // START HERE 

// Create a new route to verify token expiration
exports.verifyTokenExpiration = (req, res, next) => {
  // Get the JWT token from the request (e.g., stored in a cookie)
  const token = req.cookies.jwt;

  // Check if the token is missing
  if (!token) {
    return next(new AppError('Token is missing. Please log in to get a token.', 401));
  }

  // Verify the token and handle errors using a try-catch block
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If the token is valid, send a success message
    res.status(200).json({
      status: 'success',
      message: 'Token is valid and has not expired yet .',
    });
  } catch (err) {
    // If jwt.verify throws an error, it means the token has expired
    return next(new AppError('Token has expired. Please log in again.', 401));
  }
};


// ENDED HERE 

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.protect = catchAsync(async (req, res, next) => {
// 1) getting token and check of it's there 

let token;
if (
  req.headers.authorization &&
  req.headers.authorization.startsWith('Bearer')
) {
  token = req.headers.authorization.split(' ')[1];
}

if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }
// 2) verification token 
const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

// 3) Check if user still exists
const currentUser = await User.findById(decoded.id);
if (!currentUser) {
  return next(
    new AppError(
      'The user belonging to this token does no longer exist.',
      401
    )
  );
}


 // 4) Check if user changed password after the token was issued
 if (currentUser.changedPasswordAfter(decoded.iat)) {
  return next(
    new AppError('User recently changed password! Please log in again.', 401)
  );
}
  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
    next();
});



exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;s
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
    createSendToken(user, 200, res);
});











