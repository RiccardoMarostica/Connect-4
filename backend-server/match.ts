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
   winner: string,
   grid: [][],
   timestamp: string
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
   winner: {
      type: mongoose.SchemaTypes.String
   },
   turn: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true
   },
   grid: {
      type: [[mongoose.SchemaTypes.String]],
      required: true
   },
   timestamp: {
      type: mongoose.SchemaTypes.Date,
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
      matchModel = mongoose.model<Match>('Matches', getSchema())
   }
   return matchModel;
}


export function updateGrid (x: number, y: number, grid: any, colour: string): any {
   if (grid[x][y] === "EMPTY") {
      grid[x][y] === colour;
   }
   return grid;
}

/**
 * Function used to control the grid and 
 * @param grid 
 * @returns 
 */
export function getWinner(matrix: any): string | undefined {
   // rows
   for (var r = 0; r < matrix.length; r++) {
      var rowMatch: Array<string> = matrix[r];
      var redCount = 0;
      var yellowCount = 0;

      // Pass each part of the array and check for consecutive disks
      for (var i = 0; i < rowMatch.length; i++) {
         var elem = rowMatch[i];
         if (elem == "RED") {
            redCount += 1;
            yellowCount = 0;
            if (redCount == 4) return "RED";
         }
         if (elem == "YELLOW") {
            yellowCount += 1;
            redCount = 0;
            if (yellowCount == 4) return "YELLOW";
         }
         if (elem == "EMPTY") {
            redCount = yellowCount = 0;
         }
      }
   }

   // columns
   var columns = getColumns(matrix);
   for (var j = 0; j < columns.length; j++) {
      var colMatch: Array<string> = columns[j];
      var redCount = 0;
      var yellowCount = 0;

      // Pass each part of the array and check for consecutive disks
      for (var i = 0; i < colMatch.length; i++) {
         var elem = colMatch[i];
         if (elem == "RED") {
            redCount += 1;
            yellowCount = 0;
            if (redCount == 4) return "RED";
         }
         if (elem == "YELLOW") {
            yellowCount += 1;
            redCount = 0;
            if (yellowCount == 4) return "YELLOW";
         }
         if (elem == "EMPTY") {
            redCount = yellowCount = 0;
         }
      }
   }

   //diags
   var diags = getDiags(matrix);
   for (var l = 0; l < diags.length; l++) {
      var diagMatch: Array<string> = diags[l];
      var redCount = 0;
      var yellowCount = 0;

      // Pass each part of the array and check for consecutive disks
      for (var i = 0; i < diagMatch.length; i++) {
         var elem = diagMatch[i];
         if (elem == "RED") {
            redCount += 1;
            yellowCount = 0;
            if (redCount == 4) return "RED";
         }
         if (elem == "YELLOW") {
            yellowCount += 1;
            redCount = 0;
            if (yellowCount == 4) return "YELLOW";
         }
         if (elem == "EMPTY") {
            redCount = yellowCount = 0;
         }
      }
   }

   // Control if the match is a draw
   for (var r = 0; r < matrix.length; r++) {
      var rowMatch: Array<string> = matrix[r];
      
      var result = rowMatch.find(elem => elem == "EMPTY");
      if (result != undefined) return undefined;
   }

   return "DRAW";
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
