const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    required: [true, 'Please provide a username.'],
  },
  firstName: {
    type: String,
    required: [true, 'Please provide your first name.'],
  },
  lastName: String,
  email: {
    type: String,
    required: [true, 'Please provide an email address.'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'A password is required.'],
  },
  confirmPassword: {
    type: String,
    required: [true, 'Please confirm your password.'],
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: 'Passwords do not match',
    },
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Please provide your date of birth.'],
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Please select your gender.'],
  },
  profilePictureURL: String,
  address: {
    street: {
      type: String,
      required: [true, 'Please provide the street.'],
    },
    city: {
      type: String,
      required: [true, 'Please provide the city.'],
    },
    state: String,
    postalCode: String,
    country: {
      type: String,
      required: [true, 'Please provide the country.'],
    },
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Please provide a phone number.'],
    },
    alternateEmail: String,
  },
  preferences: {
    language: String,
    timezone: String,
  },
  registrationDate: {
    type: Date,
    default: Date.now(),
  },
  lastLoginDate: Date,
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active',
  },
  education: {
    school: String,
    degree: String,
    graduationYear: Number,
  },
  employment: {
    company: String,
    jobTitle: String,
    startDate: Date,
  },
  socialMediaLinks: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String,
  },
});

const RegisterUser  = mongoose.model('RegisterUser ', userSchema);

module.exports = RegisterUser ;
