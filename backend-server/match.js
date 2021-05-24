"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModel = exports.getSchema = void 0;
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
    }
});
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
//# sourceMappingURL=match.js.map