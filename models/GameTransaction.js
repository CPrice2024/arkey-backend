const mongoose = require("mongoose");

const gameTransactionSchema = new mongoose.Schema(
{
    player:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    transactionId:{
        type:String,
        required:true,
        unique:true
    },

    debitId:{
        type:String,
        default:null
    },

    gameId:String,

    gameMode:String,

    action:{
        type:String,
        enum:[
            "bet",
            "withdraw",
            "rollback"
        ],
        required:true
    },

    amount:{
        type:Number,
        default:0
    },

    result:{
        type:Number,
        default:0
    },

    coefficient:Number,

    currency:{
        type:String,
        default:"ETB"
    },

    balanceBefore:Number,

    balanceAfter:Number,

    isFinished:{
        type:Boolean,
        default:false
    }

},
{
    timestamps:true
});

module.exports = mongoose.model(
    "GameTransaction",
    gameTransactionSchema
);