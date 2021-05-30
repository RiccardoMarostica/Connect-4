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
 *    /register         ---               POST              Register a new user. Create the corresponding JWT and returning it.
 *
 * 2- Friend list: An user can add or remove a friend inside his friendlist.
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /friends                ---               GET               Retrieve user's friendlist
 *    /friends                ?user=            POST              Send a request to the friend passed from parameters
 *                            ---               POST              Accept or deny friend request, using the infos shared inside the body of the request
 *    /friends                ?user=            DELETE            Remove a friend form user's friendlist
 *
 * 3- Send messages: Inside the application an user can send a message to a friend, or during a game.
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /messages               ?user=            GET               Return all the posted messages with a specific user, retrieving these from MongoDB
 *    /messages               ?chat_id=         POST              Post a new message inside a chat with an user, saving it inside MongoDB.
 *    /messages               ?match=           POST              Post a message inside the match chat, saving it inside MongoDB
 *
 * 4- User profile: an user can see his profile, showing his id, username, email and stats
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /user                   ---               GET               Get user informations about his profile.
 *    /user                   ---               POST              Create a new user with moderator privilege.
 *    /user                   ?user=            DELETE            Remove an user from the application. Also, remove it from the friendlist of users
 *    /users                  ---               GET               Get the informations about all users. This endpoint can be called only by a moderator
 *
 *
 * 5- Game mechanics: Handled all the request to start a game with a normal person or a friend. Also, there are the request to handle the moves made by each user
 *
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /game                   ---               GET               Get all the matches in progress and not concluded
 *    /game                   ?game=            GET               Get the informations about a specific game using his id, including the messages
 *    /game/create            ?user=            GET               Create a game with a friend inside user's friendlist. Instead to create a game with waiting state we used socket.io
 *    /game                   ?game=            POST              Make a moves during the game passing where user put the disk, just need x value of the matrix cause then send a notification to opponent showing which moves user made.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const user = require("./user"); // Imports the file user that contains all the methods an interfaces to handle the user part
const message = require("./message"); // Imports the file that contains all the methods an interfaces to handle the message and chat part   
const match = require("./match"); // Imports the file that contains all the methods an interfaces to handle the game between players   
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
        id: req.user["id"],
        roles: req.user["roles"]
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
    console.log("REQUEST: ".yellow + "Creating a new user");
    var userIsMod = req.body.newMod;
    var userData = req.body.user;
    // Add the stats to user, don't care if is normal or he is a moderator
    userData.stats = {
        games: 0,
        win: 0,
        lose: 0,
        draw: 0
    };
    if (userIsMod) {
        // In this case the user is a new moderator, so create it inside the database
        // and return his _id. This is useful 
    }
    else {
        // This user is a normal user so he hasn't any roles.
        // It is necessary to crate him, add it inside mongoDB and
        // return a response that contain the JWT (status: 200)
        // Normal user, so no roles
        userData.roles = {};
        // Create a user using Mongo using request body where the informations are stored
        var newUser = user.newUser(userData);
        // Check if user put a password
        if (!userData.password)
            return next({ statusCode: 404, error: true, message: "Password field missing" });
        // Save an user inside MongoDB
        newUser.setPassword(userData.password);
        newUser.save().then(() => {
            console.log("SUCCESS: ".green + "User has been registrated");
            // Create the token with useful informations
            var token = {
                username: newUser.username,
                email: newUser.email,
                id: newUser._id,
                roles: newUser.roles
            };
            // Now sign the token and return it inside the response
            var token_signed = jsonwebtoken.sign(token, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ error: false, token: token_signed });
        }).catch((error) => {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while creating a new user! Error: " + error);
            if (error.reason === 11000)
                return next({ statusCode: 404, error: true, message: "User already exists" });
            return next({ statusCode: 404, error: true, message: "DB error: " + error.errmsg });
        });
    }
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
app.route("/messages").get(auth, function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Handling the GET method when an user want to get the messages
        // with another user
        if (req.query.user) {
            // Create an array with participants of the chat (in this case only 2)
            var participants = [];
            participants.push(req.query.user);
            participants.push(req.user["id"]);
            var result = yield message.getModel().find({ participants: { $all: participants } });
            // Result is empty so no document is present inside mongo. Create a new one
            if (result == undefined || result.length == 0 || result == null) {
                result = yield message.getModel().create({
                    participants: participants,
                    messages: []
                });
                console.log("SUCCESS: ".green + "Create a new chat room!");
                console.log("TEST: ".gray + JSON.stringify(result));
                return res.status(200).json(result);
            }
            else { // There is a chat inside mongo so retrieve it
                return res.status(200).json(result[0]);
            }
        }
        // An error occurred cause user make a request with parameters inside query that are not valid. Call next middleware
        console.log("ERROR: ".red + "Request query parameter is not valid");
        return next({
            statusCode: 404,
            error: true,
            message: "Request query parameter is not valid"
        });
    });
}).post(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var receiveMessage = req.body;
    receiveMessage.timestamp = new Date();
    receiveMessage.author = req.user["id"];
    // Check if receiveMessage is a message or not
    if (message.isMessage(receiveMessage)) {
        // POST method when two users are exchanging messages
        if (req.query.chat_id) {
            var id = req.query.chat_id;
            // Update chat document on mongoDB saving the last message
            message.getModel().updateOne({ _id: id }, {
                $push: {
                    messages: {
                        $each: [receiveMessage],
                        $sort: -1
                    }
                }
            }).then(() => {
                console.log("SUCCESS: ".green + "Added a new message inside the chat id: " + id);
                // Emit to the user participanting the chat with specific id
                ios.emit("chat_" + id);
                return res.status(200).json({
                    message: "Message added inside the chat!"
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
        else if (req.query.match) {
            // Take the id of the match from the query parameters inside url
            var matchId = req.query.match;
            // Update the document with specific _id, adding the new message
            match.getModel().updateOne({ _id: matchId }, {
                $push: {
                    messages: {
                        $each: [receiveMessage],
                        $sort: -1
                    }
                }
            }).then(() => {
                console.log("SUCCESS: ".green + "A new message was added inside a match");
                ios.emit("match_update_" + matchId); // emit that a new message was posted to all the players inside the match
                return res.status(200).json({
                    error: false,
                    message: "Message posted on the match chat!"
                });
            }, (err) => {
                // Log the error in case 
                console.log("ERROR: ".red + "An error occurred while posting a new message inside a match! Error: " + err);
                return next({
                    statusCode: 400,
                    error: true,
                    message: "DB error: " + err
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
    }
    else {
        // An error occurred, cause request body is not correct to create a new message. Call next middleware
        return next({
            statusCode: 404,
            error: true,
            message: "Data is not a valid Message"
        });
    }
}));
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
        // Remove the friend from user friendlist in mongoDB document
        user.getModel().updateOne({ _id: req.user["id"] }, { $pull: { friendlist: { _id: otherUserId } } }).then((data) => {
            console.log("SUCCESS: ".green + "Delete user: " + otherUserId + " from user: " + req.user["id"] + " friend list! ");
        }).catch((err) => {
            return next({
                statusCode: 400,
                error: true,
                message: "DB error: " + err
            });
        });
        // Remove the user from friend friendlist in mongoDB document
        user.getModel().updateOne({ _id: otherUserId }, { $pull: { friendlist: { _id: req.user["id"] } } }).then((data) => {
            console.log("SUCCESS: ".green + "Delete user: " + req.user["id"] + " from user: " + otherUserId + " friend list! ");
        }).catch((err) => {
            return next({
                statusCode: 400,
                error: true,
                message: "DB error: " + err
            });
        });
        // Both call to mongoDB was successfull so just return a 200 code that everything goes well
        return res.status(200).json({
            message: "User removed from friend list"
        });
    }
    // User doesn't pass a paramaters in query called user so return an error
    return next({
        statusCode: 400,
        error: true,
        message: "An error occurred while deleting a friend from friend list!"
    });
});
/**
 * -------------------------------------------------------
 *                         GAME
 *
 * Endpoints used to handle the creation and the develop of a match
 *
 * -------------------------------------------------------
 */
app.route("/game").get(auth, (req, res, next) => {
    // The match param inside query is used to memorize which match user wants to knwo more informations
    // Useful for a participant and for a player who is only watching the game
    if (req.query.match) {
        var matchId = req.query.match; // Get the match id from the query
        // Now try to get the data from the database
        match.getModel().find({ _id: matchId }).then((data) => {
            console.log("SUCCESS: ".green + "Retrieve match infos from the server and return it as response!");
            return res.status(200).json(data[0]);
        }, (err) => {
            return next({ statusCode: 400, error: true, message: "DB errror: " + err });
        });
    }
    else { // There is no query parameters, so in this case just provide all the matches that arent' over
        match.getModel().find({ isOver: false }, { _id: 1, timestamp: 1 }).sort({ timestamp: -1 }).then((data) => {
            console.log("SUCCESS: ".green + "Retrieving list of the matches that aren't over");
            return res.status(200).json(data);
        }, (err) => {
            console.log("ERROR: ".red + "An error occurred while retrieving the list of the matches! Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        });
    }
}).post(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // When make a post call first of all check if user can make the moves checking the turn on db
    var requestBody = req.body;
    // Check if inside the body there is the match id
    if (req.query.match) {
        var matchResult = match.getWinner(requestBody.grid);
        if (matchResult === undefined) {
            // Update the match document putting the new move makes from an user and changing the turn
            match.getModel().updateOne({ _id: req.query.match }, {
                $set: {
                    grid: requestBody["grid"],
                    turn: requestBody["turn"]
                }
            }).then(() => {
                console.log("SUCCESS: ".green + "Update match values inside database!");
                // If everything ok, just emit to all the sockets in listening inside this match
                ios.emit("match_update_" + req.query.match);
                // And return a status code 200
                return res.status(200).json({
                    error: false,
                    message: "Match update!"
                });
            }, (err) => {
                console.log("ERROR: ".red + "Cannot update match informations!");
                return next({
                    statusCode: 400,
                    error: true,
                    message: "DB error: " + err
                });
            });
        }
        else {
            var winnerId;
            var participants = yield match.getModel().find({ _id: req.query.match }, { participants: 1 });
            // Check if the participants are avaible
            if (participants.length === 0) {
                return next({
                    statusCode: 400,
                    error: true,
                    message: "Unable to retrieve the participants"
                });
            }
            // Check the winner if the match isn't over in a draw
            if (matchResult !== "DRAW") {
                var result = participants[0]["participants"];
                winnerId = result.find(elem => elem["colour"] == matchResult)["_id"];
            }
            else { // Otherwise, draw is the result
                winnerId = "draw";
            }
            // Now update the status of the match
            match.getModel().updateOne({ _id: req.query.match }, {
                $set: {
                    isOver: true,
                    grid: requestBody["grid"]
                }
            }).then(() => {
                console.log("SUCCESS: ".green + "The match is updated and set to over, there is a winner!");
                ios.emit("match_update_" + req.query.match, winnerId); // Just emit e match update to the sockets connected and pass the winner id
            }, (err) => {
                console.log("ERROR: ".red + "An error has occurred while updating and closing the match! Error: " + err);
                return next({
                    statusCoode: 400,
                    error: true,
                    message: "DB error: " + err
                });
            });
            // Pass each user of the participants and update his stats based if he win, lose or draw.
            var getParticipants = participants[0]["participants"];
            getParticipants.forEach(elem => {
                console.log(elem);
                if (winnerId == "draw") { // Match is a draw, so just update the draw stats
                    user.getModel().updateOne({ _id: elem["_id"] }, { $inc: { "stats.draw": 1, "stats.games": 1 } }).then(() => {
                        console.log("SUCCESS: ".green + "Update user stats");
                    }, (err) => {
                        console.log("ERROR: ".red + "Database error: " + err);
                        return next({ statusCode: 400, error: true, message: "DB error: " + err });
                    });
                }
                else if (winnerId == elem["_id"]) { // Check if the user is the winner
                    user.getModel().updateOne({ _id: elem["_id"] }, { $inc: { "stats.win": 1, "stats.games": 1 } }).then(() => {
                        console.log("SUCCESS: ".green + "Update user stats");
                    }, (err) => {
                        console.log("ERROR: ".red + "Database error: " + err);
                        return next({ statusCode: 400, error: true, message: "DB error: " + err });
                    });
                }
                else { // Otherwise, it is the loser
                    user.getModel().updateOne({ _id: elem["_id"] }, { $inc: { "stats.lose": 1, "stats.games": 1 } }).then(() => {
                        console.log("SUCCESS: ".green + "Update user stats");
                    }, (err) => {
                        console.log("ERROR: ".red + "Database error: " + err);
                        return next({ statusCode: 400, error: true, message: "DB error: " + err });
                    });
                }
            });
            // Return a status code 200 cause everything goes well, updating all the stats and the match
            return res.status(200).json({
                error: false,
                message: "Match updated, participants updated and match is over!"
            });
        }
    }
    else {
        // Return an error
        return next({
            statusCode: 500,
            error: true,
            message: "Unable to find a suitable handler!"
        });
    }
}));
app.route("/game/create").get(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // In this case, an user ask to his friend to play a game.
    if (req.query.user && !req.query.status) {
        var stats = yield user.getModel().find({ _id: req.user["id"] }, { _id: 0, stats: 1 });
        console.log("TEST: ".gray + JSON.stringify(stats[0].stats));
        // Create a socket used to send a request to other player
        ios.emit("game_request_" + req.query.user, {
            _id: req.user["id"],
            username: req.user["username"],
            stats: stats[0].stats
        });
        return res.status(200).json({
            error: false,
            message: "A request is sent to a friend to play a game!"
        });
    }
    if (req.query.user && req.query.status) { // Check if also a status query parameter exist. This is used to set a match with a friend
        if (req.query.status == "ACCEPT") {
            var colours = ["RED", "YELLOW"];
            var randomValue = Math.floor(Math.random() * 2);
            // Create the array of the two participants with the corrispective color to use during the match
            var participants = [{
                    _id: req.user["id"],
                    colour: colours[randomValue]
                }, {
                    _id: req.query.user,
                    colour: colours[Math.abs(randomValue - 1)]
                }];
            // Choose who start first
            var playerFirstTurn = participants[randomValue]["_id"];
            var grid = [
                ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"]
            ];
            // Create the match, adding the participants, setting that the match isn't over and who has the first turn
            var matchInfo = yield match.getModel().create({
                participants: participants,
                messages: [],
                isOver: false,
                turn: playerFirstTurn,
                grid: grid,
                timestamp: new Date()
            });
            console.log("TEST: " + "match infos: " + matchInfo);
            // emit the match infos
            ios.emit("accept_friend_game", matchInfo);
            return res.status(200).json({
                error: false,
                message: "Other player accept the request. Creating a new match!"
            });
        }
        else {
            return res.status(200).json({
                error: false,
                message: "Other player deny the request."
            });
        }
    }
    return next({
        statusCode: 400,
        error: true,
    });
}));
/**
 * -------------------------------------------------------
 *                            USER
 *
 * These endpoints are used to retrieve the informations about a user profile
 * or all users, in case the profile is a moderator.
 *
 * -------------------------------------------------------
 */
app.route("/user").get(auth, (req, res, next) => {
    var userId = req.user["id"];
    user.getModel().find({ _id: userId }, { stats: 1, _id: 1, username: 1, email: 1 }).then((data) => {
        return res.status(200).json(data[0]);
    }, (err) => {
        console.log("ERROR: ".red + "An error occurred while getting the stats of the player. Error: " + err);
        return next({ statusCode: 400, error: true, message: "DB error: " + err });
    });
}).delete(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if the user id is passed
    if (req.query.user) {
        var userId = req.query.user;
        try {
            // First remove the user from the array
            yield user.getModel().deleteOne({ _id: userId });
            // Then remove it from user's friend list, updating all these users
            yield user.getModel().updateMany({ friendlist: { $elemMatch: { _id: userId } } }, { $pull: { friendlist: { _id: userId } } });
            // Return a response where all goes well
            return res.status(200).json({
                error: false,
                message: "The user is removed from the application!"
            });
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while removing an user from the application. Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
    }
})).post(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Get the informations about the new moderator from the body of the request
    var userInfos = req.body;
    // there are the informations
    if (userInfos !== undefined || userInfos !== null) {
        // Add informations about the user
        userInfos.stats = { games: 0, win: 0, lose: 0, draw: 0 };
        userInfos.roles = { mod: { isEnabled: false } };
        try {
            // Insert the user inside the database
            var newUser = user.newUser(userInfos);
            // Check if user put a password
            if (!userInfos.password)
                return next({ statusCode: 404, error: true, message: "Password field missing" });
            newUser.setPassword(userInfos.password);
            yield newUser.save();
            return res.status(200).json({ error: false, message: "A new moderator is added!" });
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while creating a new moderator. Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
    }
    else {
        // Otherwise, no informations so error
        console.log("ERROR: ".red + "No informations about the new moderator!");
        return next({ statusCode: 400, error: true, message: "No informations about the new moderator" });
    }
}));
app.route("/users").get(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Get user informations from the request
    var userInfo = req.user;
    if (userInfo != undefined) {
        // Just check the informations are avaible and the user is a moderator
        if (user.is_moderator(userInfo["roles"])) {
            user.getModel().find({ _id: { $ne: userInfo["id"] } }, { _id: 1, username: 1, email: 1, stats: 1 }).then((data) => {
                console.log("SUCCESS: ".green + "Retrieve the list of the users present inside database!");
                return res.status(200).json(data);
            }, (err) => {
                // An error occurred
                console.log("ERROR: ".red + "An error occurred while getting the list of the users. Error: " + err);
                return next({ statusCode: 400, error: true, message: "DB error: " + err });
            });
        }
        else {
            // Try to get the friendlist array of an user
            var list = [];
            try {
                var result = yield user.getModel().find({ _id: userInfo["id"] }, { friendlist: 1, _id: 0 });
                list = result[0]["friendlist"];
            }
            catch (err) { // An error occurred
                console.log("ERROR: ".red + "An error occurred while retrieving the friendlist. Error: " + err);
                return next({ statusCode: 400, error: true, message: "DB error: " + err });
            }
            // Use a temp array cause can't modify the list, adding the stats
            var friendArray = [];
            for (var i = 0; i < list.length; i++) {
                try {
                    var stats = yield user.getModel().find({ _id: list[i]["_id"] }, { stats: 1, _id: 0 });
                    // Create a new map, avoid the fact that on get method, errors are present.
                    // In fact, the get method is used on a Map that get the values inside
                    friendArray.push({
                        _id: list[i]["_id"],
                        username: list[i]["username"],
                        stats: {
                            game: stats[0]["stats"].get("games"),
                            win: stats[0]["stats"].get("win"),
                            lose: stats[0]["stats"].get("lose"),
                            draw: stats[0]["stats"].get("draw")
                        }
                    });
                }
                catch (err) { // An error occurred
                    console.log("ERROR: ".red + "An error occurred while retrieving the stats of friends. Error: " + err);
                    return next({ statusCode: 400, error: true, message: "DB error: " + err });
                }
            }
            console.log("SUCCESS: ".green + "Retrieve the informations about friend list!");
            // return the array of friends updated with stats
            return res.status(200).json(friendArray);
        }
    }
    else {
        // User informations are not avaible
        return next({ statusCode: 400, error: true, message: "You don't have the permission to access inside this endpoint!" });
    }
}));
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
            roles: {
                mod: {
                    isEnabled: true
                }
            },
            stats: {
                games: 0,
                win: 0,
                lose: 0,
                draw: 0
            },
            friendlist: [],
            isOnline: false
        });
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
    // Creat the webSocket
    ios = new sio.Server(server, {
        cors: {
            origin: "http://localhost:4200",
            methods: ["GET", "POST"]
        }
    });
    // Array used to memorize the ids of the players inside the waiting status
    var userInWaiting = [];
    ios.on('connection', (socket) => {
        console.log("SUCCESS: ".green + "Socket.io client connected, socket id:" + socket.id);
        // This on function is used when a player start a random match with random user
        socket.on('waiting status', (data) => __awaiter(void 0, void 0, void 0, function* () {
            var checkIndex = userInWaiting.findIndex(elem => elem.user.id == data);
            // Check if an user is already inside the array. If not just add the user, otherwise update the socket
            if (checkIndex == -1) {
                // Retrieve from mongoDB the stats about a user and add it to the array with the socket
                var stats = yield user.getModel().find({ _id: data }, { stats: 1, _id: 0 });
                stats = stats[0]["stats"];
                userInWaiting.push({
                    user: {
                        id: data,
                        stats: stats
                    },
                    socket: socket
                });
            }
            else {
                // Update the socket data
                userInWaiting[checkIndex].socket = socket;
            }
            // We can create a match if there are at least two user inside the array
            if (userInWaiting.length >= 2) {
                var checkGameCondition = false;
                // Get first user and remove it from the array
                var randomValue = Math.floor(Math.random()) * userInWaiting.length;
                var firstUser = userInWaiting.splice(randomValue, 1);
                firstUser = firstUser[0];
                // Get second user and remove it from the array
                randomValue = Math.floor(Math.random()) * userInWaiting.length;
                var secondUser = userInWaiting.splice(randomValue, 1);
                secondUser = secondUser[0];
                // Check if the stats are present for both user
                if (firstUser.user.stats !== undefined && secondUser.user.stats !== undefined) {
                    // Now check if the difference between games and wins are the same
                    if ((Math.abs(firstUser.user.stats.get("games") - secondUser.user.stats.get("games")) < 10) && (Math.abs(firstUser.user.stats.get("win") - secondUser.user.stats.get("win")) < 10)) {
                        checkGameCondition = true;
                    }
                }
                // User has same stats, they can play together
                if (checkGameCondition == true) {
                    var colours = ["RED", "YELLOW"];
                    var randomValue = Math.floor(Math.random() * 2);
                    // Create the array of the two participants with the corrispective color to use during the match
                    var participants = [{
                            _id: firstUser.user.id,
                            colour: colours[randomValue]
                        }, {
                            _id: secondUser.user.id,
                            colour: colours[Math.abs(randomValue - 1)]
                        }];
                    // Choose who start first
                    var playerFirstTurn = participants[randomValue]["_id"];
                    var grid = [
                        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"]
                    ];
                    // Create the match, adding the participants, setting that the match isn't over and who has the first turn
                    var matchInfo = yield match.getModel().create({
                        participants: participants,
                        messages: [],
                        isOver: false,
                        turn: playerFirstTurn,
                        grid: grid,
                        timestamp: new Date()
                    });
                    console.log("SUCCESS: ".green + "Create a new match with id: " + matchInfo["_id"]);
                    // Now emit the informations given when the match is created to the players
                    firstUser.socket.emit("match created", matchInfo["_id"]);
                    secondUser.socket.emit("match created", matchInfo["_id"]);
                }
                else { // Put both user inside the array and wait to see if another user comes with similar stats so they can play together
                    userInWaiting.push(firstUser);
                    userInWaiting.push(secondUser);
                }
            }
        }));
        // Remove the socket from the array
        socket.on('exit waiting status', (data) => {
            userInWaiting = userInWaiting.filter(elem => elem.user.id !== data);
        });
    });
}).catch((error) => {
    console.log("ERROR: ".red + error);
});
//# sourceMappingURL=server.js.map