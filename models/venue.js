const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/FYP', { useNewUrlParser: true }, (err) => {
    if (!err) { console.log('MongoDB Connection Succeeded.') }
    else { console.log('Error in DB connection : ' + err) }
});

const VenueSchema = new mongoose.Schema({
    roomNo: {
        type: String,
        
    },
    capacity: {
        type: Number,
        
    },
    venueType: { 
        type: String,
    },
    seatingType:{
        type: String,
    },
    slotStart: {
        type : String

    },
    slotEnd:{
        type : String
    },
    requested:{
        type: [String]
        
    }

});

mongoose.model('venueSch', VenueSchema);

