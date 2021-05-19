"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModel = exports.getSchema = exports.isMessage = void 0;
/**
 * -------------------------------------------------------
 * MODULES USED TO DEVELOP THE BACKEND OF THE APPLICATION
 * -------------------------------------------------------
 */
const mongoose = require("mongoose"); // Module designed to use MongoDB in an asynchronous enviroment
/**
 * User defined type guard.
 * Type checking cannot be performed during the execution (we don't have the Message interface anyway)
 * but using this function to check if the supplied parameter is compatible with a given type
 *
 * @param arg An object passed from the server that contains all the infos about a message
 * @returns A boolean that confirm if arg is a Message or not
 */
function isMessage(arg) {
    return arg && arg.content && typeof (arg.content) == 'string' && arg.timestamp && arg.timestamp instanceof Date && arg.author && typeof (arg.author) == 'string';
}
exports.isMessage = isMessage;
/**
 * We use Mongoose to perform the ODM between our application and mongodb.
 * To do that we need to create a Schema and an associated
 * data model that will be mapped into a mongodb collection
 */
var messageSchema = new mongoose.Schema({
    content: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    timestamp: {
        type: mongoose.SchemaTypes.Date,
        required: true
    },
    sender: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    recipent: {
        type: mongoose.SchemaTypes.String,
        required: true
    }
});
/**
 * Function used to get the current schema about a message
 *
 * @returns userSchema
 */
function getSchema() { return messageSchema; }
exports.getSchema = getSchema;
var messageModel; // This is not exposed outside the model
/**
 * Function used to create or retrieve message model from MongoDB
 *
 * @returns messageModel
 */
function getModel() {
    if (!messageModel) {
        messageModel = mongoose.model('Message', getSchema());
    }
    return messageModel;
}
exports.getModel = getModel;
//# sourceMappingURL=message.js.map