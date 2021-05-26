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
   participants: Array<any>,
   messages: Array<message.Message>,
   isOver: boolean,
   turn: string,
   grid: [][],
   createGrid: () => void,
   changeTurn: () => void,
   closeMatch: () => void
}


var matchSchema = new mongoose.Schema({
   participants: {
      type: [{
         _id: {
            type: mongoose.SchemaTypes.ObjectId,
            required: true,
         },
         colour: {
            type: mongoose.SchemaTypes.String,
            required: true,
         }
      }],
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
   },
   turn: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true
   },
   grid: {
      type: [[mongoose.SchemaTypes.String]],
      required: true
   }
});


matchSchema.methods.createGrid = function (): void {
   this.grid = [
      ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
      ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
      ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
      ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
      ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
      ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
      ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"]
   ];
}

/**
 * Method used to change the turn between the players
 */
matchSchema.methods.changeTurn = function (): void {
   // Get the other player filtring the participants array (it has only 2 elems, so retrieve only one of them)
   var otherPlayer = this.participants.filter(elem => elem != this.turn);
   otherPlayer = otherPlayer[0];

   // Change the turn string
   this.turn = otherPlayer;
}

/**
 * Method used to change the state of the match setting the flag "isOver" to true, setting that the match is over
 */
matchSchema.methods.closeGame = function (): void {
   this.isOver = true;
}


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
      matchModel = mongoose.model<Match>('Matches', getSchema())
   }
   return matchModel;
}

/**
 * Function used to control the grid and 
 * @param grid 
 * @returns 
 */
export function getWinner(matrix: any): string | undefined {

   // rows
   for (var i = 0; i < matrix.length; i++) {
      var rowMatch = matrix[i];
      if (rowMatch.filter((elem) => elem == "RED").length == 4) {
         return "RED";
      }
      if (rowMatch.filter((elem) => elem == "YELLOW").length == 4) {
         return "YELLOW";
      }
   }

   // columns
   var columns = getColumns(matrix);
   for (var j = 0; j < columns.length; j++) {
      var colMatch = columns[j];
      if (colMatch.filter((elem) => elem == "RED").length == 4) {
         return "RED";
      }
      if (colMatch.filter((elem) => elem == "YELLOW").length == 4) {
         return "YELLOW";
      }
   }

   //diags
   var diags = getDiags(matrix);
   for (var l = 0; l < diags.length; l++) {
      var diagMatch = diags[l];
      if (diagMatch.filter((elem) => elem == "RED").length == 4) {
         return "RED";
      }
      if (diagMatch.filter((elem) => elem == "YELLOW").length == 4) {
         return "YELLOW";
      }
   }
   return undefined;
}


function getColumns(matrix) {
   var columns = [];
   for (var j = 0; j < matrix[0].length; j++) {
      var column = [];
      for (var k = 0; k < matrix.length; k++) {
         column.push(matrix[k][j]);
      }
      columns.push(column);
   }
   return columns;
}

function getDiags(arr) {
   var diags = [];
   for (var i = -5; i < 7; i++) {
      var group = [];
      for (var j = 0; j < 6; j++) {
         if ((i + j) >= 0 && (i + j) < 7) {
            group.push(arr[j][i + j]);
         }
      }
      diags.push(group);
   }
   for (i = 0; i < 12; i++) {
      var group = [];
      for (var j = 5; j >= 0; j--) {
         if ((i - j) >= 0 && (i - j) < 7) {
            group.push(arr[j][i - j]);
         }
      }
      diags.push(group);
   }
   return diags.filter(function (a) {
      return a.length > 3;
   });
};
