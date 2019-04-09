const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/FYP', { useNewUrlParser: true }, (err) => {
    if (!err) { console.log('MongoDB Connection Succeeded.') }
    else { console.log('Error in DB connection : ' + err) }
});

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    matricNo: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "user"
    },
    date: {
        type: Date,
        default: Date.now
    }
});

UserSchema.methods.isAdmin = function () {
    return (this.role === "admin");
};



const User = mongoose.model('User', UserSchema);


module.exports = User;
