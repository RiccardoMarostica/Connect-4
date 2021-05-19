/**
 * -------------------------------------------------------
 * MODULES USED TO DEVELOP THE BACKEND OF THE APPLICATION
 * -------------------------------------------------------
 */
import mongoose = require('mongoose'); // Module designed to use MongoDB in an asynchronous enviroment


/**
 * -------------------------------------------------------
 *                MESSSAGE CODE
 * -------------------------------------------------------
 * 
 * Inside this file are present all the methods to handle the requirements about the chat
 * Infact, inside our web application an user can send a message to a friend or when he is playing / watching a game
 */

/**
 * First of all, create the interface message. This interface rappresent the template of a message
 * Also, inside this interface save how send the message and who is recipent (it can be an user or a match)
 * This interface is exported so it can be used inside other file
 */
export interface Message {
   content: string,
   timestamp: string,
   author: string
}

/**
 * User defined type guard.
 * Type checking cannot be performed during the execution (we don't have the Message interface anyway)
 * but using this function to check if the supplied parameter is compatible with a given type
 * 
 * @param arg An object passed from the server that contains all the infos about a message
 * @returns A boolean that confirm if arg is a Message or not
 */
export function isMessage(arg: any): arg is Message {
   return arg && arg.content && typeof (arg.content) == 'string' && arg.timestamp && arg.timestamp instanceof Date && arg.author && typeof (arg.author) == 'string';
}

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
})

/**
 * Function used to get the current schema about a message
 * 
 * @returns userSchema
 */
export function getSchema() { return messageSchema; }

var messageModel;  // This is not exposed outside the model

/**
 * Function used to create or retrieve message model from MongoDB
 * 
 * @returns messageModel
 */
export function getModel(): mongoose.Model<mongoose.Document> {
   if (!messageModel) {
      messageModel = mongoose.model('Message', getSchema())
   }
   return messageModel;
}