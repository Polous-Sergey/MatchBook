const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deepPopulate = require('mongoose-deep-populate')(mongoose);

const EventSchema = new Schema({
    marketId: {type: Number, required: true},
    name: {type: String, required: true},
    start: {type: Number, required: true},
    horses: [{type: Schema.Types.ObjectId, ref: 'Horse'}],
    created: {type: Date, default: Date.now()},
});

EventSchema.plugin(deepPopulate, {
    populate: {
        'horses': {
            select: ['name', 'prices', 'number']
        },
        'horses.prices': {
            select: ['lay', 'back', 'amountBack', 'amountLay']
        }
    }
});

module.exports = mongoose.model('Event', EventSchema);
