/**
 * -------------------------------------------------------
 * MODULES USED TO DEVELOP THE BACKEND OF THE APPLICATION
 * -------------------------------------------------------
 */
import mongoose = require('mongoose');
import * as message from './message';

/**
 * -------------------------------------------------------
 *                       MATCH CODE
 * -------------------------------------------------------
 * 
 * Inside this file is present all the methods and the calls used to handle a game infos.
 * Also it is present the call to create and handle the request to mongoDB collection "matches" 
 */

/**
 * First of all, create the interface message. This interface rappresent the template of a message
 * Also, inside this interface save how send the message and who is recipent (it can be an user or a match)
 * This interface is exported so it can be used inside other file
 */
export interface Match extends mongoose.Document {
   readonly _id: mongoose.Schema.Types.ObjectId,
   participants: Array<string>,
   messages: Array<message.Message>,
   isOver: boolean
}


var matchSchema = new mongoose.Schema({
   participants: {
      type: [mongoose.SchemaTypes.ObjectId],
      required: true
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
   },
   isOver: {
      type: mongoose.SchemaTypes.Boolean,
      required: true
   }
});


/**
 * Function used to get the current schema about a message
 * 
 * @returns userSchema
 */
 export function getSchema() { return matchSchema; }

 var matchModel;  // This is not exposed outside the model
 
 /**
  * Function used to create or retrieve message model from MongoDB
  * 
  * @returns messageModel
  */
 export function getModel(): mongoose.Model<mongoose.Document> {
    if (!matchModel) {
      matchModel = mongoose.model('Matches', getSchema())
    }
    return matchModel;
 }