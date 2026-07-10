console.log("🔥 GAME AUTH ROUTES LOADED");
const express = require("express");
const crypto = require("crypto");


const router = express.Router();

const auth = require("../middleware/auth");

const User = require("../models/User");

const GameSession =
require("../models/GameSession");


router.post(
"/authenticate",
auth,
async(req,res)=>{

try{

const player =
await User.findById(req.user._id);

if(!player){

return res.status(404).json({
message:"Player not found"
});

}

if(!player.isActive){

return res.status(403).json({
message:"Player disabled"
});

}

const sessionToken =
crypto.randomBytes(32)
.toString("hex");

const session =
await GameSession.create({

player:player._id,

telegramId:player.telegramId,

provider:req.body.provider,

gameCode:req.body.gameCode,

sessionToken,

ip:req.ip,

expiredAt:
new Date(
Date.now()+60*60*1000
)

});

res.json({

success:true,

sessionToken,

balance:player.balance,

player:{
id:player._id,
username:player.username,
telegramId:player.telegramId
}

});

}catch(err){

console.log(err);

res.status(500).json({
message:err.message
});

}

});

module.exports = router;