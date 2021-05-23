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
export interface Chat extends mongoose.Document {
   _id: mongoose.Schema.Types.ObjectId,
   participants: {
      type: [mongoose.Schema.Types.ObjectId]
   }
   messages: Array<Message>
}

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
 * Message schema:
 * Inside the schema used on mongoDB there is an _id, that can be a string
 * formatted as: idUser1_idUser2 or it can have the match id.
 * After that there is an array of message. In this case inside each position
 * there are the informations about a message, as the sender, the content and the
 * timestamp.
 */
var messageSchema = new mongoose.Schema({
   participants: {
      type: [mongoose.SchemaTypes.ObjectId]
   },
   messages: {
      type: [{
         content: {
            type: mongoose.SchemaTypes.String,
            required: true
         },
         timestamp: {
            type: mongoose.SchemaTypes.Date,
            required: true
         },
         author: {
            type: mongoose.SchemaTypes.String,
            required: true
         }
      }]
   }
});
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
      messageModel = mongoose.model('Chat', getSchema())
   }
   return messageModel;
}