const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deepPopulate = require('mongoose-deep-populate')(mongoose);

const HorseSchema = new Schema({
  runnerId: {type: Number, required: true},
  name: {type: String, required: true},
  number: {type: Number, required: true},
  prices: [{type: Schema.Types.ObjectId, ref: 'Price'}],
  created: {type: Date, default: Date.now},
});

HorseSchema.plugin(deepPopulate);

module.exports = mongoose.model('Horse', HorseSchema);
