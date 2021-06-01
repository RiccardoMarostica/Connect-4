"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWinner = exports.updateGrid = exports.getModel = exports.getSchema = void 0;
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
function updateGrid(x, y, grid, colour) {
    if (grid[x][y] === "EMPTY") {
        grid[x][y] === colour;
    }
    return grid;
}
exports.updateGrid = updateGrid;
/**
 * Function used to control the grid and
 * @param grid
 * @returns
 */
function getWinner(matrix) {
    // rows
    for (var r = 0; r < matrix.length; r++) {
        var rowMatch = matrix[r];
        var redCount = 0;
        var yellowCount = 0;
        // Pass each part of the array and check for consecutive disks
        for (var i = 0; i < rowMatch.length; i++) {
            var elem = rowMatch[i];
            if (elem == "RED") {
                redCount += 1;
                yellowCount = 0;
                if (redCount == 4)
                    return "RED";
            }
            if (elem == "YELLOW") {
                yellowCount += 1;
                redCount = 0;
                if (yellowCount == 4)
                    return "YELLOW";
            }
            if (elem == "EMPTY") {
                redCount = yellowCount = 0;
            }
        }
    }
    // columns
    var columns = getColumns(matrix);
    for (var j = 0; j < columns.length; j++) {
        var colMatch = columns[j];
        var redCount = 0;
        var yellowCount = 0;
        // Pass each part of the array and check for consecutive disks
        for (var i = 0; i < colMatch.length; i++) {
            var elem = colMatch[i];
            if (elem == "RED") {
                redCount += 1;
                yellowCount = 0;
                if (redCount == 4)
                    return "RED";
            }
            if (elem == "YELLOW") {
                yellowCount += 1;
                redCount = 0;
                if (yellowCount == 4)
                    return "YELLOW";
            }
            if (elem == "EMPTY") {
                redCount = yellowCount = 0;
            }
        }
    }
    //diags
    var diags = getDiags(matrix);
    for (var l = 0; l < diags.length; l++) {
        var diagMatch = diags[l];
        var redCount = 0;
        var yellowCount = 0;
        // Pass each part of the array and check for consecutive disks
        for (var i = 0; i < diagMatch.length; i++) {
            var elem = diagMatch[i];
            if (elem == "RED") {
                redCount += 1;
                yellowCount = 0;
                if (redCount == 4)
                    return "RED";
            }
            if (elem == "YELLOW") {
                yellowCount += 1;
                redCount = 0;
                if (yellowCount == 4)
                    return "YELLOW";
            }
            if (elem == "EMPTY") {
                redCount = yellowCount = 0;
            }
        }
    }
    // Control if the match is a draw
    for (var r = 0; r < matrix.length; r++) {
        var rowMatch = matrix[r];
        var result = rowMatch.find(elem => elem == "EMPTY");
        if (result != undefined)
            return undefined;
    }
    return "DRAW";
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