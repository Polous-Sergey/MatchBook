const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deepPopulate = require('mongoose-deep-populate')(mongoose);

const PriceSchema = new Schema({
  lay: {type: Number, default: 0},
  back: {type: Number, default: 0},
  amountLay: {type: Number, default: 0},
  amountBack: {type: Number, default: 0},
  created: {type: Date, default: Date.now},
});

PriceSchema.plugin(deepPopulate);

module.exports = mongoose.model('Price', PriceSchema);
