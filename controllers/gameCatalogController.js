const Game = require("../models/Game");

exports.getGames = async (req,res)=>{

try{

const games = await Game.find({
enabled:true
})
.sort({
popularity:-1,
gameName:1
});

res.json({
success:true,
count:games.length,
games
});

}catch(err){

console.log(err);

res.status(500).json({
message:err.message
});

}

};