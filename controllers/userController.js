const User = require("./../models/userModel"); 
const RegisterUser = require("./../models/registerModel"); 
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');



const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};



exports.completesignupUser = catchAsync(async (req, res, next) => {
    try {
      // Create a new user instance using the request body
      const newUser = new RegisterUser(req.body);
      // Check if the email is unique
      const existingUser = await RegisterUser.findOne({ email: newUser.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      // Check if the user is trying to set an invalid role
      if (req.body.role) {
        const invalidRoles = ['admin', 'teammember']; // Define invalid roles
        if (invalidRoles.includes(req.body.role.toLowerCase())) {
          return res.status(400).json({
            status: 'fail',
            message: 'Invalid user role for self-registration.',
          });
        }
      }
      await newUser.save();
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });


exports.getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find();

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
});

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Please use /updateMyPassword.',
                400
            )
        );
    }

    // 2) Filter out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.createUser = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            user: newUser
        }
    });
});


exports.getUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

exports.updateUser = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!updatedUser) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.suspendUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { suspensionPeriod, suspensionUnit } = req.body;
  
    try {
      // Check if the user exists
      const user = await User.findById(userId);
      if (!user) {
        return next(new AppError('User not found', 404));
      }
  
      // Check if the user has the 'admin' role
      if (user.role !== 'admin') {
        return next(new AppError('Only admin can suspend a user', 403));
      }
  
      // Calculate the suspension end date based on the period and unit
      const endDate = new Date();
      switch (suspensionUnit) {
        case 'days':
          endDate.setDate(endDate.getDate() + suspensionPeriod);
          break;
        case 'weeks':
          endDate.setDate(endDate.getDate() + suspensionPeriod * 7);
          break;
        case 'months':
          endDate.setMonth(endDate.getMonth() + suspensionPeriod);
          break;
        default:
          break;
      }
  
      user.suspended = true;
      user.suspensionEndDate = endDate;
      await user.save();
  
      return res.status(200).json({
        status: 'success',
        message: 'User suspended successfully.',
      });
    } catch (error) {
      return next(new AppError('An error occurred while suspending the user', 500));
    }
  });


  
  


