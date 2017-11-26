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


const assert = require('assert');
const util = require('util');
const expect = require("chai").expect;
const Database = require('../index');
const logger = require("streembit-util").logger;
const LevelDB = require("../adapters/leveldb");

describe("Database handler", function () {
    
    before(function() {
        logger.init();
    });

    describe("Initialize", function () {

        it("database root directory should be the process directory", function () {
            var dbrootdir = Database.instance.rootdir;
            assert.equal(true, typeof dbrootdir == 'string' && dbrootdir.length > 0);
        });

        it("should throw an exception if callback does not exists", function () {
            var instance = Database.instance;
            expect(instance.init).to.throw(); 
        });

    });

    describe("Schema", function () {
        
        it("callback should return error if not database schema sent to init", function () {
            let instance = Database.instance;
            instance.init(null, function(err){
                expect(err).to.exist;
            });
        });

        it("callback should return error if the schema is not an array", function () {
            let schema = require("./schema_with_noarray");
            let instance = Database.instance;
            instance.init(schema, function(err){
                assert.equal(true, err.indexOf("schema must be an array") > -1 );
            });
        });

        it("callback should return error if the schema item has no type attribute", function () {
            let schema = require("./schema_with_invalid_type");
            let instance = Database.instance;
            instance.init(schema, function(err){
                assert.equal(true, err.indexOf("type is required") > -1 );
            });
        });

        it("callback should return error if the schema item has no name attribute", function () {
            let schema = require("./schema_with_invalid_name");
            let instance = Database.instance;
            instance.init(schema, function(err){
                assert.equal(true, err.indexOf("name is required") > -1 );
            });
        });

        it("callback should return error if the schema item has no key attribute", function () {
            let schema = require("./schema_with_invalid_key");
            let instance = Database.instance;
            instance.init(schema, function(err){
                assert.equal(true, err.indexOf("key is required") > -1 );
            });
        });

        it("callback should return error if the schema items key is not unique", function () {
            let schema = require("./schema_with_notuniquekeys");
            let instance = Database.instance;
            instance.init(schema, function(err){
                assert.equal(true, err.indexOf("key must be unique") > -1 );
            });
        });

        it("init should create db, leveldb directories and leveldb database", function () {
            let schema = require("./schema_for_leveldb");
            let instance = Database.instance;
            instance.init(schema, function(err){
                expect(err).to.be.undefined; 
            });
        });

        it("init should create db, sqlite directories and sqlite database", function () {
            let schema = require("./schema_for_sqlite");
            let instance = Database.instance;
            instance.init(schema, function(err){
                expect(err).to.be.undefined; 
            });
        });

        it("getdb() should return a valid object for leveldb 'streembitkv' key", function () {
            // put a timer
            setTimeout(
                ()=> {
                    let instance = Database.instance;
                    let db = Database.instance.getdb("streembitkv");
                    expect(db).to.be.an('object');
                },
                500
            );
        });

        it("getdb() should return a valid object for sqlite 'streembitsql' key", function () {
            setTimeout(
                ()=> {
                    let instance = Database.instance;
                    let db = instance.databases["streembitsql"]; // instance.getdb("streembitsql");
                    expect(db).to.exist;
                },
                1000
            );
            
        });

    });

});