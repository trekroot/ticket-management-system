import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  opponent: { type: String, required: true },
  date: { type: Date, required: true },  // Includes both date and time
  timeTbd: Boolean,
  venue: {
    type: String,
    // enum: ['Fitzpatrick Stadium', 'Franklin Athletic Complex', 'Lewiston High School'],
    default: 'Fitzpatrick Stadium'
  },
  season: { type: Number, required: true },
  matchType: { type: String, default: 'USL League One' },
  isHomeGame: { type: Boolean, default: true },
}, { timestamps: true, collection: 'games' });

gameSchema.index({ date: 1 });
gameSchema.index({ season: 1 });

export default mongoose.model('Game', gameSchema);
