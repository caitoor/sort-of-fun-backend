import connectDB from '../db.js';

export async function getAllGames() {
    const db = await connectDB();
    return db.collection('games').find({}).toArray();
}

export async function addGame(game) {
    const db = await connectDB();
    return db.collection('games').insertOne(game);
}

export async function findGameById(bggId) {
    const db = await connectDB();
    return db.collection('games').findOne({ bggId: parseInt(bggId) });
}

export async function deleteGame(bggId) {
    const db = await connectDB();
    return db.collection('games').deleteOne({ bggId: parseInt(bggId) });
}
