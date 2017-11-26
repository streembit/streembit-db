/*
 
This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Z Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';

const util = require('util');
const async = require('async');
const logger = require("streembit-util").logger;

const singleton = Symbol();
const singleton_verifier = Symbol()

class Database {
    constructor(verifier) {
        if (verifier != singleton_verifier) {
            throw "Constructing Database singleton is not allowed";
        }

        this.databases = {};
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new Database(singleton_verifier);
        }
        return this[singleton];
    } 

    get rootdir(){
        var dir = process.cwd();
        return dir;
    }    

    getdb(key){
        return this.databases[key];
    }

    validate_schema(dbschema){
        if (!dbschema ) {
            throw new Error("database schema is missing");
        }

        if (!Array.isArray(dbschema)) {
            throw new Error("invalid database schema, schema must be an array");
        }

        var keys = [];

        for (let i = 0; i < dbschema.length; i++) {
            let database = dbschema[i];
            let type = database.type;
            if(!type){
                throw new Error("invalid database schema item, type is required");
            }
            let name = database.name;
            if(!name){
                throw new Error("invalid database schema item, name is required");
            }
            let key = database.key;
            if(!key){
                throw new Error("invalid database schema item, key is required");
            }

            if(keys.indexOf(key) > -1 ){
                throw new Error("invalid database schema item, key must be unique");
            }
            keys.push(key);
        }         
    }

    createdb(dbitem, callback){       
        let type = dbitem.type;
        let DbLib = require("./adapters/" + type);
        let dblib = new DbLib();

        if( Database.instance.databases[dbitem.key]){
            return callback();
        }

        dblib.create(Database.instance.rootdir, type, dbitem.name, dbitem.tables, dbitem.indexes).then(
            () => {                
                Database.instance.databases[dbitem.key] = dblib.db;
                //console.log("added type " + type +  " db key " + dbitem.key );
                callback();
            })
            .catch(
                (err) => {
                    callback(err);
                }
            );        
    }

    init(dbschema, callback) {
        if(!callback || typeof callback != "function"){
            throw new Error("callback is required")
        }

        try {          
            this.validate_schema(dbschema);            
            async.eachSeries(
                dbschema,
                Database.instance.createdb,
                function(err){
                    callback(err);
                }
            );
        }
        catch (e) {
            callback(e.message);
        }        
    }
}

module.exports = Database;




