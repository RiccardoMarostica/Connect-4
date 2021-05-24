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