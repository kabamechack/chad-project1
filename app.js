const express = require('express');
const morgan = require('morgan');
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require ("hpp");
const cookieParser = require('cookie-parser'); // Import cookie-parser


const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const registrationRouter = require('./routes/registrationRouter');







const app = express();
app.use(cookieParser()); // Use cookie-parser middleware

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet())

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!"
});

app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));


//data sanitization against noSQL query injection
app.use(mongoSanitize());


//Data sanitization against xss
app.use(xss());

// Prevent parameter pollution   
app.use(
  hpp({
    whitelist: ["duration",
    "ratingsQuantity",
    "ratingsAverage",
    "maxGroupSize",
    "difficulty",
    "price"]
  })
  );

// serving static files 
app.use(express.static(`${__dirname}/public`));


// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);


  next();
});

// 3) ROUTES
app.use('/api/v1/users', userRouter);
app.use('/api/v1/users', registrationRouter);



app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

