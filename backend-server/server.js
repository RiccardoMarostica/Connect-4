"use strict";
/**
 *  ---------- BACKEND - SERVER SIDE ----------
 *
 * Simple HTTP REST Server using MongoDB (Mongoose) and Middlewares (Express)
 *
 * This server will handle all the incoming requests from frontend (Angular).
 * The requests can be grouped in 5 groups:
 *
 * 1- Login / Sign in: This group of requests handle the login and registration of an user inside the application.
 *    Just remember that an user can have different roles: normal user or moderator.
 *
 *    REQUEST           ATTRIBUTES        METHOD            DESCRIPTION
 *    /login            ---               POST              Login an exsisting user, using a JSON Web Token (JWT) and returning it to client-side
 *    /register         ---               POST              Register a new user, creating the corresponding JWT and returning it to clinet-side
 *    /delete           ?user=            DELETE            Remove user access
 *
 *
 * 2- Friend list: An user can add or remove a friend inside his friendlist.
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /friends                ---               GET               Retrieve user's friendlist
 *    /friends                ?user=            POST              Add a new friend, using his id
 *    /friends/:user_id       ---               DELETE            Remove a friend form user's friendlist
 *
 * 3- Send messages: Inside the application an user can send a message to a friend, or during a game.
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /messages               ?user=            GET               Return all the posted messages with a specific user, retrieving these from MongoDB
 *                            ?match=           GET               Return all the posted messages during a specific game, retrieving these from MongoDB
 *    /messages               ?user=            POST              Send a message to a specific user, saving the current message inside MongoDB
 *                            ?match=           POST              Send a message to a specific user, saving the current message inside MongoDB
 *
 * 4- Statistics: Each player can see his statistics during the period. Also, moderators can see the statistics of any other user
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /stats                  ---               GET               Get the statistics. If this call is made by a moderator show statistics of each user, otherwise only for current user
 *    /stats                  ---               POST              Update user stats
 *    /statistics/:user_id    ---               GET               Get the statistics of a specific user
 *
 * 5- Game mechanics: Handled all the request to start a game with a normal person or a friend. Also, there are the request to handle the moves made by each user
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /create_game            ---               GET               Create a game with a random player that is has the flag "waiting-state" setting to true (maybe search on MongoDB)
 *    /create_game/:user_id   ---               GET               Create a game with a friend inside user's friendlist
 *    /moves                  ?pos=             POST              Make a moves during the game passing where user put the disk, just need x value of the matrix cause then send a notification to opponent showing which moves user made.
 *
 * ----------------------------------------------------------
 *
 * There are present 3 classes used by backend:
 *
 * 1- User: Class to create and manage a user informations. Also, used to create the collections inside MongoDB
 * 2- Messages: Class to create and manage messages informations like checking if the format of the message send from a request is correcto or not, etc... (All the functions of this class are explained inside the Report).
 * 3- Game: Class to memorize informations about a game between two opponents.
 *
 * ----------------------------------------------------------
 *
 * How to start server-side:
 *
 * 1) Install all the required methods:
 *
 *    npm install
 *
 * 2) Compile all the code, in this way the TypeScript files are converted in JavaScript files
 *
 *    npm run compile
 *
 *    To check if MongoDB is running type on terminal: sudo systemctl status mongod
 *
 * 3) Run the server:
 *
 *    npm start || npm run start || node server
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The dotenv module will load a file named ".env" file and load all the key-value pairs into process.env (environment variable).
 */
const env = require('dotenv').config();
if (env.error) {
    console.log("ERROR: ".red + "Unable to load \".env\" file. Please provide one file to store the JWT secret key");
    process.exit(-1); // Code: -1 Return an error
}
else if (!process.env.JWT_SECRET) {
    console.log("ERROR: ".red + "\".env\" file loaded but HWT_SECRET=<secret> key-value pair was not found");
    process.exit(-1);
}
/**
 * -------------------------------------------------------
 * MODULES USED TO DEVELOP THE BACKEND OF THE APPLICATION
 * -------------------------------------------------------
 */
const http = require("http"); // HTTP module, used to create our server
const colors = require("colors"); // Module used to import colors, it is useful when logging informations
colors.enabled = true;
const mongoose = require("mongoose"); // Module designed to use MongoDB in an asynchronous enviroment
const user = require("./user");
const message = require("./message");
const express = require("express"); // Module that provides a simple and robust middleware infrastructure for building web applications
const bodyparser = require("body-parser"); // Module that parse incoming request bodies in a middleware before your handlers. 
// Provide a JavaScript object if the "Content-Type" is application/json
const passport = require("passport"); // Authentication middleware used for Express, designed to serve a singular purpose: authenticate requests
const passportHTTP = require("passport-http"); // Module that make possibile to implements Basi and Digest authentication for HTTP
const cors = require("cors"); // Enable CORS middleware
const sio = require("socket.io"); // Socket.io websocket library
const jsonwebtoken = require("jsonwebtoken"); // Module that implements JSON Web Token (JWT) generation
const jwt = require("express-jwt"); // Middleware that parsing JWT for Express
/**
 * -------------------------------------------------------
 *                 INSERT THE MIDDLEWARES
 * -------------------------------------------------------
 */
var ios = undefined;
var app = express(); // Create an Express application, mainly to create the routing and insert the middlewares on the backend
/**
 * We create the JWT authentication middleware provided by the express-jwt library.
 * How it works (from the official documentation):
 * If the token is valid, req.user will be set with the JSON object decoded to be used by later middleware for authorization and access control.
*/
var auth = jwt({ secret: process.env.JWT_SECRET });
/**
 * The CORS mechanism supports secure cross-origin requests and data transfers between browsers and servers.
 */
app.use(cors());
// Install the top-level middleware "bodyparser", that extracts the entire body portion of an incoming request stream and exposes it on req.body
app.use(bodyparser.json());
// This is a custom middleware used to log how some one make a request to the server. Log who made the request and the method that is used
app.use((req, res, next) => {
    console.log("REQUEST URL: ".yellow + req.url);
    console.log("METHOD: ".yellow + req.method);
    console.log("REQUET HEADERS: ".yellow + req.headers.authorization);
    next();
});
/**
 * -------------------------------------------------------
 *                 HANDLING THE ROUTING
 * -------------------------------------------------------
 */
// User doesn't add something to the request so just send him a response code 200 and return a response that contains a simple JSON
app.get("/", (req, res) => {
    res.status(200).json({
        api_version: "1.0",
        message: "Hi, welcome to Connect-four Server"
    });
});
/**
 * -------------------------------------------------------
 *          AUTHENTICATION AND REGISTRATION
 *
 * To handle the login part, passport.js can be used.
 * This module infact is an authentication middleware and
 * it is perfect for our purpose. After create a way to check
 * the validation of an user it is necessary to implement an
 * endpoint that handle the login using passport.
 *
 * Instead, to resolve the registration part it is necessary
 * an endpoint that can handle this in the correct way.
 * -------------------------------------------------------
 */
// Configure HTTP basic authentication strategy trough passport middleware.
// NOTE: Always use HTTPS with Basic Authentication
passport.use(new passportHTTP.BasicStrategy((mail, password, done) => {
    // Inside this function we handled the methods to veriy user credentials
    console.log("REQUEST: ".yellow + "New login attempt from: " + mail);
    // Make a query to find if the mail used to login exists
    user.getModel().findOne({ email: mail }, (err, user) => {
        // Handle the response and check if user exists or not
        if (err) { // An error occurred during query
            return done({
                status: 500,
                error: true,
                message: err
            });
        }
        if (!user) { // Error occurred because user is invalid
            return done(null, false, {
                statusCode: 500,
                error: true,
                message: "Invalid user"
            });
        }
        if (!user.validatePassword(password)) { // Error occurred because password is wrong
            return done(null, false, {
                statusCode: 500,
                error: true,
                message: "Invalid password"
            });
        }
        // No error, so return the user
        return done(null, user);
    });
}));
/**
 * Handle the login router.
 * This endpoint uses passport middleware to check user credentials before generating a new JWT
 */
app.post("/login", passport.authenticate('basic', { session: false }), (req, res, next) => {
    // If we are inside this function, this means that user successfully authenticated.
    // This means that user has been injected int req.user from the previous function
    // So generate a JWT with useful informations and return it as response
    console.log("SUCCESS: ".green + "Login granted. Generating JWT token");
    var token = {
        username: req.user["username"],
        email: req.user["email"],
        id: req.user["id"]
    };
    // Now sign the token
    var token_signed = jsonwebtoken.sign(token, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({
        error: false,
        token: token_signed,
        message: "Login granted"
    });
});
/**
 * Handle the registration router.
 * Inside current endpoint, the body of the request contains the informations about an user.
 * From that create an user but before check if all infos are present inside the request otherwise return an error (404)
 */
app.post("/register", (req, res, next) => {
    // TODO: Sistemare
    console.log("REQUEST: ".yellow + "Creating a new user");
    // Create a user using Mongo using request body where the informations are stored
    var newUser = user.newUser(req.body);
    // Check if user put a password
    if (!req.body.password)
        return next({
            statusCode: 404,
            error: true,
            message: "Password field missing"
        });
    // Save an user inside MongoDB
    newUser.setPassword(req.body.password);
    newUser.save().then((result) => {
        console.log("SUCCESS: ".yellow + "User has been registrated");
        var token = {
            username: newUser.username,
            email: newUser.email,
            id: newUser._id
        };
        // Now sign the token
        var token_signed = jsonwebtoken.sign(token, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({
            error: false,
            token: token_signed,
            id: result._id
        });
    }).catch((error) => {
        if (error.reason === 11000)
            return next({
                statusCode: 404,
                error: true,
                message: "User already exists"
            });
        return next({
            statusCode: 404,
            error: true,
            message: "DB error: " + error.errmsg
        });
    });
});
/**
 * -------------------------------------------------------
 *                         CHAT
 *
 * From now on, there are the routing endpoints used to handle
 * the messages sent from an user to a friend or during a match.
 *
 * There is only one endpoint "/messages" but there are both GET
 * and POST methods so there are two different endpoints in the
 * end.
 * -------------------------------------------------------
 */
app.route("/messages").get(auth, (req, res, next) => {
    /**
     * This condition check the parameter used inside the request.
     * As the POST method, there are two parameters valid: user and match.
     * If there is a different parameter the response will contain an error
     * message.
     */
    if (req.query.user) {
        // Take my id and the id of the friend. From these two datas retrieve the messages between the two
        var sender = req.user["id"];
        var recipent = req.query.user;
        console.log("SENDER: " + sender + " RECIPENT: " + recipent);
        // Find all the messages bewteen the two users
        message.getModel().find({
            sender: sender,
            recipent: recipent
        }).sort({ timestamp: -1 }) // Sorting using timestamp
            .then((documents) => {
            // Query is correct, return the document
            console.log("SUCCESS: ".green + "Messages between users retrieved");
            return res.status(200).json(documents);
        })
            .catch((reason) => {
            return next({
                stausCode: 404,
                error: true,
                message: "DB error: " + reason
            });
        });
    }
    else if (req.query.game) {
        // Take the id of the game so server can retrieve all the messages
        var recipent = req.query.game;
        // Find all the messages send during a specific game
        message.getModel().find({
            recipent: recipent
        }).sort({ timestamp: -1 }) // Sorting using timestamp
            .then((documents) => {
            // Query is correct, return the document
            console.log("SUCCESS: ".green + "Messages sent during a game retrieved");
            return res.status(200).json(documents);
        })
            .catch((reason) => {
            return next({
                stausCode: 404,
                error: true,
                message: "DB error: " + reason
            });
        });
    }
    else {
        // An error occurred cause user make a request with parameters inside query that are not valid. Call next middleware
        console.log("ERROR: ".red + "Request query parameter is not valid");
        return next({
            statusCode: 404,
            error: true,
            message: "Request query parameter is not valid"
        });
    }
}).post(auth, (req, res, next) => {
    // Take from the request body the message. Then complete it with the last infos
    var receiveMessage = req.body;
    receiveMessage.timestamp = new Date();
    receiveMessage.sender = req.user["id"];
    /**
     * This condition check the query parameters when user request to post a message
     * Two parameters are valid: user and match. The first one is used to send a message
     * to a friend, insted the second one is used to send a message during a match
     *
     * If an user make a request with different parameters, server will send a response with
     * an error.
     */
    if (req.query.user) {
        receiveMessage.recipent = req.query.user;
    }
    else if (req.query.match) {
        receiveMessage.recipent = req.query.user;
    }
    else {
        // An error occurred cause user make a request with parameters inside query that are not valid. Call next middleware
        console.log("ERROR: ".red + "Request query parameter is not valid");
        return next({
            statusCode: 404,
            error: true,
            message: "Request query parameter is not valid"
        });
    }
    // Check if receiveMessage is a message or not
    if (message.isMessage(receiveMessage)) {
        message.getModel().create(receiveMessage).then((data) => {
            // Create query is successfull, now the message is saved on MongoDB.
            // After that, just notify that a messages has been posted
            console.log("SUCCESS: ".green + "Message sent. Author: " + receiveMessage.sender + " Recipent: " + receiveMessage.recipent);
            // TODO: Notificare a tutti che un messaggio è stato postato (oppure al singolo utente?)
            return res.status(200).json({
                error: false,
                message: "Message sent to user!",
                id: data._id
            });
        }).catch((reason) => {
            // An error occurred during the call "create" on MongoDB. Call next middleware
            console.log("ERROR: ".red + reason);
            return next({
                statusCode: 404,
                error: true,
                message: "DB error: " + reason
            });
        });
    }
    else {
        // An error occurred, cause request body is not correct to create a new message. Call next middleware
        return next({
            statusCode: 404,
            error: true,
            message: "Data is not a valid Message"
        });
    }
});
/**
 * -------------------------------------------------------
 *                         FRIEND LIST
 *
 * Routing used to handle the request to get the friendlist of an user,
 * add a friend to the list or remove on of them from it.
 * -------------------------------------------------------
 */
app.route("/friends").get(auth, (req, res, next) => {
    // Get user id
    var userId = req.user['id'];
    // Make a query to MongoDB and retrieve the friendlist using the user's id
    user.getModel().find({ _id: userId }).then((data) => {
        return res.status(200).json({
            error: false,
            friends: data[0]['friendlist']
        });
    }).catch((err) => {
        return next({
            statusCode: 404,
            error: true,
            message: "DB error: " + err
        });
    });
}).post(auth, (req, res, next) => {
    // If the POST request has a parameters user, this means that server has to send (using socketio) a notification to the other user
    // that he recives a friend request
    if (req.query.user) {
        // Get the friends id from the query params
        var friendId = req.query.user;
        console.log(friendId);
        var response = undefined;
        // TODO: Check if user has already this user as friend
        // user.getModel().find({ _id: req.user["id"]}).then((data) => {
        //    var myArray: Array<any> = data["friendlist"];
        //    response = myArray.find((elem) => {
        //       return elem._id = friendId;
        //    });
        // }).catch((err: any) => {
        //    return next({
        //       statusCode: 400,
        //       error: true,
        //       message: "DB error: " + err
        //    });
        // })
        if (response) {
            return res.status(200).json({
                message: "This user is already your friend!"
            });
        }
        // Use socket.io to send a notification to the client
        ios.emit("friendreq_" + friendId, {
            username: req.user["username"],
            id: req.user["id"]
        });
        // return code 200
        return res.status(200).json({
            message: "Send friend request to other player!"
        });
    }
    else {
        // This part of code is used when an user confirm or deny the friend request. So first of all, to avoid erros, check if the request body
        // has the correct values (username, id and status)
        var reqBody = req.body;
        console.log(reqBody);
        if (reqBody != undefined && reqBody.user != undefined && reqBody.status != undefined) {
            // User accept the friend request so add both user to corrispective friendlist
            if (reqBody.status == "ACCEPT") {
                // Create the template to add an user to friendlist
                var addUser = {
                    username: reqBody.user.username,
                    _id: reqBody.user.id
                };
                // Add to user the friend
                user.getModel().updateOne({ _id: req.user["id"] }, { $push: { friendlist: addUser } }).then(() => {
                    console.log("SUCCESS: ".green + "Added a new friend to: " + req.user["id"]);
                }).catch((err) => {
                    return next({
                        statusCode: 400,
                        error: true,
                        message: "DB error: " + err
                    });
                });
                addUser.username = req.user["username"];
                addUser._id = req.user["id"];
                // Now add to friend the user
                user.getModel().updateOne({ _id: reqBody.user.id }, { $push: { friendlist: addUser } }).then(() => {
                    console.log("SUCCESS: ".green + "Added a new friend to: " + reqBody.user.id);
                }).catch((err) => {
                    return next({
                        statusCode: 400,
                        error: true,
                        message: "DB error: " + err
                    });
                });
                // At the end just send a notification using socketio that the operation is made
                ios.emit("addfriend_" + reqBody.user.id);
                ios.emit("addfriend_" + req.user["id"]);
            }
            return res.status(200).json({
                message: "Added a new user to your friendlist!"
            });
        }
    }
    return next({
        statusCode: 400,
        error: true,
        message: "An error occurred during the friends request phase!"
    });
}).delete(auth, (req, res, next) => {
    // Check if inside the paramaters there is one called user
    if (req.query.user) {
        var otherUserId = req.query.user;
        console.log("Other user id: " + otherUserId);
        //TODO: Controllare rimozione account
        user.getModel().updateOne({ _id: req.user["id"] }, { $pull: { friendlist: { _id: otherUserId } } }).then((data) => {
            console.log("SUCCESS: ".green + "Delete user: " + otherUserId + " from user: " + req.user["id"] + " friend list! ");
        }).catch((err) => {
            return next({
                statusCode: 400,
                error: true,
                message: "DB error: " + err
            });
        });
        user.getModel().updateOne({ _id: otherUserId }, { $pull: { friendlist: { _id: req.user["id"] } } }).then((data) => {
            console.log("SUCCESS: ".green + "Delete user: " + req.user["id"] + " from user: " + otherUserId + " friend list! ");
        }).catch((err) => {
            return next({
                statusCode: 400,
                error: true,
                message: "DB error: " + err
            });
        });
        return res.status(200).json({
            message: "User removed from friend list"
        });
    }
    return next({
        statusCode: 400,
        error: true,
        message: "An error occurred while deleting a friend from friend list!"
    });
});
/**
 * -------------------------------------------------------
 *                         STATS
 *
 * From now on, there are the routing endpoints used to handle
 * user stats.
 *
 * Just remember that a moderator can see the stats of all players
 * -------------------------------------------------------
 */
app.route("/stats").get(auth, (req, res, next) => {
    var user = req.user;
    console.log(user);
    return res.status(200).json({
        statusCode: 200,
        error: false,
        message: "stats retrieved"
    });
});
/**
 * -------------------------------------------------------
 *                 ERRORS MIDDLEWARE
 *
 * These last two middlewares are used to return a response
 * if an error occurred when user make a request
 * -------------------------------------------------------
 */
// Add error handling middleware
app.use(function (err, req, res, next) {
    console.log("REQUEST ERROR: ".red + JSON.stringify(err));
    res.status(err.statusCode || 500).json(err);
});
// The very last middleware will report an error 404 
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use((req, res, next) => {
    console.log("ERROR: ".red + "Invalid endpoint!");
    res.status(404).json({ statusCode: 404, error: true, errormessage: "Invalid endpoint" });
});
/**
 * -------------------------------------------------------
 *     CREATE THE CONNECTION WITH MONGODB AND SERVER
 * -------------------------------------------------------
 */
/**
 * Using mongoose make a connection request to MongoDB.
 * The return of the connect method is a request so put then() to handle all the promeses needed
 * If an error occurred use catch() to log the error
 * */
mongoose.connect('mongodb://localhost:27017/connectfour').then(() => {
    // In this case the connection is successfull so the server can start using MongoDB
    console.log("SUCCESS: ".green + "Connect to MongoDB");
    return user.getModel().findOne({ email: "admin@admin.it" });
}).then((document) => {
    // document is the returned value from the previous then(). In this case the previous then()
    // check if the first account is already created on MongoDB. If this user is not present, it means
    // that the collection doesn't exist, so create it.
    if (!document) {
        console.log("MONGODB: ".green + "Creating admin user");
        var firstUser = user.newUser({
            username: "admin",
            email: "admin@admin.it",
            roles: {},
            stats: {
                games: 0,
                win: 0,
                lose: 0
            },
            friendlist: [],
            isOnline: false
        });
        firstUser.setModerator();
        firstUser.setPassword("admin");
        console.log(firstUser);
        return firstUser.save(); // Save the new user inside MongoDB and return this promises
    }
    else {
        console.log("MONGODB: ".green + "Admin user already exists");
    }
}).then(() => {
    var server = http.createServer(app); // Create a http server using app (so using express)
    server.listen(8080, () => console.log("SUCCESS: ".green + "HTTP Server started on port 8080"));
    ios = new sio.Server(server, {
        cors: {
            origin: "http://localhost:4200",
            methods: ["GET", "POST"]
        }
    }); // Creat the webSocket
    ios.on('connection', (socket) => {
        console.log("SUCCESS: ".green + "Socket.io client connected, socket id:" + socket.id);
    });
}).catch((error) => {
    console.log("ERROR: ".red + error);
});
//# sourceMappingURL=server.js.map