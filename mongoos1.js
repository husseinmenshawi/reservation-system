const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const dbname = "FYP";
const url = "mongodb://localhost:27017";
const mongoOptions = { useNewUrlParser: true };

const state = {

    db: null
};


const connect = (cb) => { // connect method
    if (state.db) //if there is connection
        cb();
    else { // if there isnt
        MongoClient.connect(url, mongoOptions, (err, client) => { // we use mongoclient to connect
            if (err)
                cb(err);
            else {
                state.db = client.db(dbname); // if no error , set state
                cb();
            }
        });
    }
}



const getDB = () => { // to get database
    return state.db;

}

module.exports = { getDB, connect }; //exposing methods