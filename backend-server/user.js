"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newUser = exports.getModel = exports.getSchema = void 0;
/**
 * -------------------------------------------------------
 * MODULES USED TO DEVELOP THE BACKEND OF THE APPLICATION
 * -------------------------------------------------------
 */
const mongoose = require("mongoose"); // Module designed to use MongoDB in an asynchronous enviroment
const crypto = require("crypto");
// Then create user mongoose schema, that contains, as the interface, all the informations and the methods about an user.
var userSchema = new mongoose.Schema({
    username: {
        type: mongoose.SchemaTypes.String,
        required: true,
        unique: true
    },
    email: {
        type: mongoose.SchemaTypes.String,
        required: true,
        unique: true
    },
    digest: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    salt: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    roles: {
        type: mongoose.SchemaTypes.Map,
        of: mongoose.SchemaTypes.Mixed
    },
    stats: {
        type: mongoose.SchemaTypes.Map,
        of: mongoose.SchemaTypes.Number
    },
    friendlist: {
        type: [{
                username: mongoose.SchemaTypes.String,
                _id: mongoose.SchemaTypes.String
            }]
    },
    isOnline: {
        type: mongoose.SchemaTypes.Boolean,
        required: false
    }
});
// Add methods to user schema
/**
 * Function used to hash the password so it can be clear inside MongoDB
 * We use the hash function sha512 to hash both the password and salt to obtain a password digest.
 *
 * @param password User password
 */
userSchema.methods.setPassword = function (password) {
    this.salt = crypto.randomBytes(16).toString('hex'); // We use a random 16-bytes hex string for salt
    // From wikipedia: (https://en.wikipedia.org/wiki/HMAC)
    // In cryptography, an HMAC (sometimes disabbreviated as either keyed-hash message 
    // authentication code or hash-based message authentication code) is a specific type 
    // of message authentication code (MAC) involving a cryptographic hash function and 
    // a secret cryptographic key.
    var hmac = crypto.createHmac('sha512', this.salt);
    hmac.update(password);
    this.digest = hmac.digest('hex'); // The final digest depends both by the password and the salt
};
/**
 * Function created to check if the password used by the user is equal to the digest present
 * inside MongoDB during the login phase.
 *
 * @param password User password
 * @returns True if the password is equal to the digest inside MongoDB, otherwise false
 */
userSchema.methods.validatePassword = function (password) {
    // To validate the password, we compute the digest with the
    // same HMAC to check if it matches with the digest we stored
    // in the database.
    //
    var hmac = crypto.createHmac('sha512', this.salt);
    hmac.update(password);
    var digest = hmac.digest('hex');
    return (this.digest === digest);
};
/**
 * Function that check if the user is a moderator
 *
 * @returns True if the user is an moderator, false otherwise
 */
userSchema.methods.isModerator = function () {
    if (this.roles['mod'])
        return true;
    return false;
};
/**
 * Function used to add a moderator privilege to an user
 */
userSchema.methods.setModerator = function () {
    if (!this.isModerator()) {
        this.roles['mod'] = true;
    }
};
/**
 * Function used to get the current schema about an user
 *
 * @returns userSchema
 */
function getSchema() {
    return userSchema;
}
exports.getSchema = getSchema;
// In the end create the MongoDB model used to connect to used document and work with it
var userModel;
/**
 * Function used to create or retrieve user model from MongoDB
 *
 * @returns userModel
 */
function getModel() {
    if (!userModel)
        userModel = mongoose.model('User', getSchema());
    return userModel;
}
exports.getModel = getModel;
/**
 *
 * Function used to create a new user. It is exported so this function can be used on other files
 *
 * @param data Object contains the infos about a new user
 * @returns
 */
function newUser(data) {
    var _model = getModel(); // Retrieve the user model on MongoDB
    return new _model(data); // create a new user
}
exports.newUser = newUser;
//# sourceMappingURL=user.js.map