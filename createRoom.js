const mongoose = require('mongoose');
const Room = require('./models/Room');

mongoose.connect('mongodb://localhost:27017/gestion_examens');

async function createRoom() {
  const existingRoom = await Room.findOne();
  if (existingRoom) {
    console.log('🏫 Salle déjà existante:', existingRoom.nom);
    process.exit();
    return;
  }
  
  const room = new Room({
    nom: 'Amphi A',
    capacite: 100,
    batiment: 'Bâtiment Principal',
    etage: 0,
    equipements: ['Tableau', 'Vidéo projecteur']
  });
  
  await room.save();
  console.log('✅ Salle créée:', room.nom);
  console.log('   ID:', room._id);
  process.exit();
}

createRoom();
