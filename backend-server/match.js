"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWinner = exports.getModel = exports.getSchema = void 0;
/**
 * -------------------------------------------------------
 * MODULES USED TO DEVELOP THE BACKEND OF THE APPLICATION
 * -------------------------------------------------------
 */
const mongoose = require("mongoose");
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
matchSchema.methods.createGrid = function () {
    this.grid = [
        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
        ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"]
    ];
};
/**
 * Method used to change the turn between the players
 */
matchSchema.methods.changeTurn = function () {
    // Get the other player filtring the participants array (it has only 2 elems, so retrieve only one of them)
    var otherPlayer = this.participants.filter(elem => elem != this.turn);
    otherPlayer = otherPlayer[0];
    // Change the turn string
    this.turn = otherPlayer;
};
/**
 * Method used to change the state of the match setting the flag "isOver" to true, setting that the match is over
 */
matchSchema.methods.closeGame = function () {
    this.isOver = true;
};
/**
 * Function used to get the current schema about a message
 *
 * @returns userSchema
 */
function getSchema() { return matchSchema; }
exports.getSchema = getSchema;
var matchModel; // This is not exposed outside the model
/**
 * Function used to create or retrieve message model from MongoDB
 *
 * @returns messageModel
 */
function getModel() {
    if (!matchModel) {
        matchModel = mongoose.model('Matches', getSchema());
    }
    return matchModel;
}
exports.getModel = getModel;
/**
 * Function used to control the grid and
 * @param grid
 * @returns
 */
function getWinner(matrix) {
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
exports.getWinner = getWinner;
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
}
;
//# sourceMappingURL=match.js.map