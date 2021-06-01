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
 *    /game                   ?game=            DELETE            Remove a participants from the match selecting a winner
 *                            ?user=            ---
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
            return done({ status: 500, error: true, message: err });
        }
        if (!user) { // Error occurred because user is invalid
            return done(null, false, { statusCode: 500, error: true, message: "Invalid user" });
        }
        if (!user.validatePassword(password)) { // Error occurred because password is wrong
            return done(null, false, { statusCode: 500, error: true, message: "Invalid password" });
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
    var checkUser = req.user;
    // Check if the user is a new moderator
    if (checkUser.roles != undefined && checkUser.roles.get("mod") != undefined && checkUser.roles.get("mod").isEnabled == false) {
        console.log("SUCCESS: ".green + "First login for new moderator. Redirect him to the registration page!");
        return res.status(200).json({ error: false, newAdmin: true, userid: checkUser._id });
    }
    console.log("SUCCESS: ".green + "Login granted. Generating JWT token");
    // Create the token with useful informations
    var token = { username: req.user["username"], email: req.user["email"], id: req.user["id"], roles: req.user["roles"] };
    // Now sign the token
    var token_signed = jsonwebtoken.sign(token, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ error: false, token: token_signed, message: "Login granted" });
});
/**
 * Handle the registration router.
 * Inside current endpoint, the body of the request contains the informations about an user.
 * From that create an user but before check if all infos are present inside the request otherwise return an error (404)
 */
app.post("/register", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("REQUEST: ".yellow + "Creating a new user");
    // Add the stats to user
    var userData = req.body.user;
    userData.stats = { games: 0, win: 0, lose: 0, draw: 0 };
    if (req.body.newMod) {
        // In this case the user is a new moderator, remove the temporary moderator
        // and set the roles to the new user
        try {
            yield user.getModel().findByIdAndDelete(req.body.adminId);
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while deleting the temporary moderator! Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
        // Set the moderator role is enabled
        userData.roles = { mod: { isEnabled: true } };
    }
    else {
        // Normal user, so no roles
        userData.roles = {};
    }
    // It is necessary to crate the user, add it inside mongoDB and
    // return a response that contain the JWT (status: 200)
    // Create a user using Mongo using request body where the informations are stored
    var newUser = user.newUser(userData);
    // Check if user put a password, if not return an error
    if (!userData.password)
        return next({ statusCode: 404, error: true, message: "Password field missing" });
    // Oterwise, set the password, using digest and salt
    newUser.setPassword(userData.password);
    try {
        // Save an user inside MongoDB
        yield newUser.save();
        // Then, create the token with useful informations
        var token = { username: newUser.username, email: newUser.email, id: newUser._id, roles: newUser.roles };
        // Now sign the token and return it inside the response
        var token_signed = jsonwebtoken.sign(token, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ error: false, token: token_signed });
    }
    catch (err) {
        // An error occurred
        console.log("ERROR: ".red + "An error occurred while creating a new user! Error: " + err);
        if (err.reason === 11000)
            return next({ statusCode: 404, error: true, message: "User already exists" });
        return next({ statusCode: 404, error: true, message: "DB error: " + err });
    }
}));
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
app.route("/friends").get(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Get user id from the request
    var userId = req.user['id'];
    try {
        // Make a query to MongoDB and retrieve the friendlist using the user's id
        var mongoQuery = yield user.getModel().findById(userId, { _id: 0, friendlist: 1 });
        // Get the array of id's inside user
        var userFriendList = mongoQuery['friendlist'];
        var friendsInformations = [];
        // Now elaborate the informations, using the id of a friend and adding his username and the avatar
        for (const index in userFriendList) {
            var friendInfos = yield user.getModel().findById(userFriendList[index], { _id: 0, username: 1, avatar: 1 });
            friendsInformations.push({ _id: userFriendList[index], username: friendInfos["username"], avatar: friendInfos["avatar"] });
        }
        console.log("SUCCESS: ".green + "Retrieve user friend list with friends informations!");
        // Return a response that all is ok and return the array of users
        return res.status(200).json({
            error: false,
            friends: friendsInformations
        });
    }
    catch (err) {
        // An error occurred
        console.log("ERROR: ".red + "An error occurred while getting the informations about user's friends! Error: " + err);
        return next({ statusCode: 404, error: true, message: "DB error: " + err });
    }
})).post(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // If the POST request has a parameters user, this means that server has to send (using socketio) a notification to the other user
    // that he recives a friend request
    if (req.query.user) {
        // Get the friends id from the query params
        var friendId = req.query.user;
        try {
            // Check if the user is already friend with other user, checking if inside friendlist array the friend id is present
            var checkFriends = yield user.getModel().findById(req.user["id"], { _id: 0, friendlist: 1 });
            // Check if the response is not undefined. This means that the other user id is already inside user friend list
            if (checkFriends["friendlist"].indexOf(friendId) !== -1) {
                return res.status(200).json({ error: false, code: "ALREADY_FRIEND", message: "This user is already your friend!" });
            }
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while checking if the id is already part of the user friendlist! Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
        try {
            var otherUser = yield user.getModel().findById(friendId, { username: 1, avatar: 1, _id: 0 });
            // Use socket.io to send a notification to the client
            ios.emit("friendreq_" + friendId, {
                username: otherUser["username"],
                avatar: otherUser["avatar"],
                id: req.user["id"]
            });
            // return code 200, all ok!
            return res.status(200).json({ error: false, code: "SEND_FRIEND_REQUEST", message: "Send friend request to other player!" });
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while getting other user informations! Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
    }
    else {
        // This part of code is used when an user confirm or deny the friend request. So first of all, to avoid erros, check if the request body
        // has the correct values (id and status)
        var reqBody = req.body;
        if (reqBody != undefined && reqBody.user != undefined && reqBody.status != undefined) {
            // User accept the friend request so add both user to corrispective friendlist
            if (reqBody.status == "ACCEPT") {
                // Get the id of the friend
                var newFriendId = reqBody.user.id;
                try {
                    // Push the friend id inside user friend list
                    yield user.getModel().findByIdAndUpdate(req.user["id"], { $push: { friendlist: newFriendId } });
                    // Push the user id inside other user friend list
                    yield user.getModel().findByIdAndUpdate(newFriendId, { $push: { friendlist: req.user["id"] } });
                }
                catch (err) {
                    // An error occurred
                    return next({ statusCode: 400, error: true, message: "DB error: " + err });
                }
                // At the end just send a notification using socketio that the operation is made
                ios.emit("addfriend_" + reqBody.user.id);
                ios.emit("addfriend_" + req.user["id"]);
                return res.status(200).json({ error: false, code: "FRIEND_REQ_ACCEPT", message: "Added a new user to your friendlist!" });
            }
            else {
                return res.status(200).json({ error: false, code: "FRIEND_REQ_DENY", message: "Other user refuse to accept your friend request!" });
            }
        }
    }
    // No infos passed on body so error
    return next({ statusCode: 400, error: true, message: "An error occurred during the friends request phase!" });
})).delete(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if inside the paramaters there is one called user
    if (req.query.user) {
        var otherUserId = req.query.user;
        try {
            // Remove other id from user friend list
            yield user.getModel().findByIdAndUpdate(req.user["id"], { $pull: { friendlist: otherUserId } });
            console.log("SUCCESS: ".green + "Delete user: " + req.user["id"] + " from user: " + otherUserId + " friend list! ");
            // Remove user id from other user friend list
            yield user.getModel().findByIdAndUpdate(otherUserId, { $pull: { friendlist: req.user["id"] } });
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while removing a friend from user friend list! Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
        // Both call to mongoDB was successfull so just return a 200 code that everything goes well
        return res.status(200).json({ errror: false, code: "REMOVE_FRIEND", message: "User removed from friend list" });
    }
    // User doesn't pass a paramaters in query called user so return an error
    return next({ statusCode: 400, error: true, message: "An error occurred while deleting a friend from friend list!" });
}));
/**
 * -------------------------------------------------------
 *                         GAME
 *
 * Endpoints used to handle the creation and the develop of a match
 *
 * -------------------------------------------------------
 */
app.route("/game").get(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // The match param inside query is used to memorize which match user wants to knwo more informations
    // Useful for a participant and for a player who is only watching the game
    if (req.query.match) {
        try {
            // Get match informations
            var matchInfos = yield match.getModel().findById(req.query.match);
            // return match informations inside the response
            console.log("SUCCESS: ".green + "Retrieve match infos from the server and return it as response!");
            return res.status(200).json(matchInfos);
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while getting match informations! Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
    }
    else {
        // There is no query parameters, so in this case just provide all the matches that arent' over
        try {
            var allMatches = yield match.getModel().find({ isOver: false }, { _id: 1, timestamp: 1 }).sort({ timestamp: -1 });
            return res.status(200).json(allMatches);
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while retrieving the list of the matches! Error: " + err);
            return next({ statusCode: 400, error: true, message: "DB error: " + err });
        }
    }
})).post(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // When make a post call first of all check if user can make the moves checking the turn on db
    var requestBody = req.body;
    // Check if inside the body there is the match id
    if (req.query.match) {
        // Check if the match is over or not
        var matchResult = match.getWinner(requestBody.grid);
        // The match is not over
        if (matchResult === undefined) {
            try {
                // Update the match using the informations present inside the body of the request and the turn
                yield match.getModel().findByIdAndUpdate(req.query.match, { $set: { grid: requestBody["grid"], turn: requestBody["turn"] } });
                // If everything ok, just emit to all the sockets in listening inside this match
                ios.emit("match_update_" + req.query.match);
                // And return a status code 200
                console.log("SUCCESS: ".green + "Update match values inside database!");
                return res.status(200).json({ error: false, code: "MATCH_UPDATE", message: "Match update!" });
            }
            catch (err) {
                // An error occurred
                console.log("ERROR: ".red + "Cannot update match informations! Error: " + err);
                return next({ statusCode: 400, error: true, code: "MATCH_UPDATE_ERROR", message: "DB error: " + err });
            }
        }
        else {
            // Otherwise, the match is over
            var winnerColour;
            try {
                // Get the winner colour if the match isn't ended in a draw
                var getPart = yield match.getModel().findById(req.query.match, { participants: 1 });
                if (matchResult !== "DRAW") {
                    var participants = getPart["participants"];
                    winnerColour = participants.find(elem => elem["colour"] == matchResult)["colour"];
                }
                else {
                    winnerColour = "DRAW";
                }
            }
            catch (err) {
                // An error occurred
                console.log("ERROR: ".red + "An error occurred while retrieving the participants from the match! Error: " + err);
                return next({ statusCode: 400, error: true, message: "Unable to retrieve the participants" });
            }
            try {
                // Update the match informations saving who wins the match and setting the isOver flag to true
                yield match.getModel().findByIdAndUpdate(req.query.match, { $set: { isOver: true, grid: requestBody["grid"], winner: winnerColour } });
                console.log("SUCCESS: ".green + "The match is updated and set to over, there is a winner!");
                // Just emit match update to the sockets connected. In this way the are gonna to retrieve the match informations again
                ios.emit("match_update_" + req.query.match);
            }
            catch (err) {
                // An error occurred
                console.log("ERROR: ".red + "An error has occurred while updating and closing the match! Error: " + err);
                return next({ statusCoode: 400, error: true, message: "DB error: " + err });
            }
            // Pass each user of the participants and update his stats based if he win, lose or draw.
            var participants = getPart["participants"];
            participants.forEach((elem) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    // Update participants stats based if who wins and who lose, or if the match endend in a draw
                    if (winnerColour == "DRAW")
                        yield user.getModel().findByIdAndUpdate(elem["_id"], { $inc: { "stats.draw": 1, "stats.games": 1 } });
                    else if (winnerColour == elem["colour"])
                        yield user.getModel().findByIdAndUpdate(elem["_id"], { $inc: { "stats.win": 1, "stats.games": 1 } });
                    else
                        yield user.getModel().findByIdAndUpdate(elem["_id"], { $inc: { "stats.lose": 1, "stats.games": 1 } });
                }
                catch (err) {
                    // An error occurred
                    console.log("ERROR: ".red + "An error occurred while updating participant stats! Error: " + err);
                    return next({ statusCode: 400, error: true, code: "MATCH_USER_UPDATE_ERROR", message: "DB error: " + err });
                }
            }));
            // Return a status code 200 cause everything goes well, updating all the stats and the match
            return res.status(200).json({ error: false, message: "Match updated, participants updated and match is over!" });
        }
    }
    else {
        // Return an error
        return next({ statusCode: 500, error: true, message: "Unable to find a suitable handler!" });
    }
})).delete(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // In this case, set the winner the user that doesn't quit
    if (req.query.user && req.query.match) {
        try {
            var getMatch = yield match.getModel().findById(req.query.match, { participants: 1, _id: 0 });
            var getWinner = getMatch.participants.find(elem => elem["_id"] !== req.query.user);
            console.log(getWinner);
            // Find the other participants, he is the winner
            if (getWinner !== undefined) {
                console.log("HERE");
                yield match.getModel().findByIdAndUpdate(req.query.match, { $set: { isOver: true, winner: getWinner["colour"] } });
                ios.emit("match_update_" + req.query.match);
                return res.status(200).json({ error: false, message: "User removed from the match! Update the match." });
            }
            else {
                // An error occurred
                console.log("ERROR: ".red + "An error occurred while a participants quit the match!");
                return next({ statusCode: 400, error: true, code: "QUIT_MATCH_ERROR", message: "Unable to retrieve the participants" });
            }
        }
        catch (err) {
            // An error occurred
            console.log("ERROR: ".red + "An error occurred while a participants quit the match! Error: " + err);
            return next({ statusCode: 400, error: true, code: "QUIT_MATCH_ERROR", message: "DB error: " + err });
        }
    }
    else {
        // An error occurred
        console.log("ERROR: ".red + "Missing some parameters");
        return next({ statusCode: 404, error: true, code: "MISSING_PARAMETERS", message: "Missing parameters" });
    }
}));
app.route("/game/create").get(auth, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // In this case, an user ask to his friend to play a game.
    if (req.query.user && !req.query.status) {
        var opponentInfo = yield user.getModel().findById(req.user["id"], { _id: 0, stats: 1, avatar: 1 });
        // Create a socket used to send a request to other player
        ios.emit("game_request_" + req.query.user, {
            _id: req.user["id"],
            username: req.user["username"],
            stats: opponentInfo.stats,
            avatar: opponentInfo.avatar
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
    user.getModel().findById(userId, { stats: 1, _id: 1, username: 1, email: 1, avatar: 1 }).then((data) => {
        return res.status(200).json({ error: false, informations: data });
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
            try {
                // Get all the users except this one
                var allUsers = yield user.getModel().find({ _id: { $ne: userInfo["id"] } }, { _id: 1, username: 1, email: 1, stats: 1, avatar: 1 });
                console.log("SUCCESS: ".green + "Retrieve the list of the users present inside database!");
                // return an array containing all the users
                return res.status(200).json(allUsers);
            }
            catch (err) {
                // An error occurred
                console.log("ERROR: ".red + "An error occurred while getting the list of the users. Error: " + err);
                return next({ statusCode: 400, error: true, message: "DB error: " + err });
            }
        }
        else {
            // Try to get the friendlist array of an user
            var list = [];
            try {
                var result = yield user.getModel().findById(userInfo["id"], { friendlist: 1, _id: 0 });
                list = result["friendlist"];
            }
            catch (err) { // An error occurred
                console.log("ERROR: ".red + "An error occurred while retrieving the friendlist. Error: " + err);
                return next({ statusCode: 400, error: true, message: "DB error: " + err });
            }
            // Use a temp array cause can't modify the list, adding the stats
            var friendArray = [];
            for (var i = 0; i < list.length; i++) {
                try {
                    var currentUser = yield user.getModel().findById(list[i]["_id"], { stats: 1, username: 1, avatar: 1, _id: 0 });
                    // Create a new map, avoid the fact that on get method, errors are present.
                    // In fact, the get method is used on a Map that get the values inside
                    friendArray.push({
                        _id: list[i]["_id"],
                        username: currentUser["username"],
                        avatar: currentUser["avatar"],
                        stats: {
                            game: currentUser["stats"].get("games"),
                            win: currentUser["stats"].get("win"),
                            lose: currentUser["stats"].get("lose"),
                            draw: currentUser["stats"].get("draw")
                        }
                    });
                }
                catch (err) { // An error occurred
                    console.log("ERROR: ".red + "An error occurred while retrieving the stats of friends. Error: " + err);
                    return next({ statusCode: 400, error: true, message: "DB error: " + err });
                }
            }
            // return the array of friends updated with stats
            console.log("SUCCESS: ".green + "Retrieve the informations about friend list!");
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
            isOnline: false,
            avatar: "man-1"
        });
        firstUser.setPassword("admin");
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