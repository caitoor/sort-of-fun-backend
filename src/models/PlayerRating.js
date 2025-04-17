import mongoose from 'mongoose';

const PlayerRatingSchema = new mongoose.Schema({
    gameId: { type: Number, required: true, index: true },
    numPlayers: { type: Number, required: true },
    bestVotes: { type: Number, default: 0 },
    recommendedVotes: { type: Number, default: 0 },
    notRecommendedVotes: { type: Number, default: 0 }
});

export default mongoose.model('PlayerRating', PlayerRatingSchema);
