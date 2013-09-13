/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström 
    
    http://underscorediscovery.com
    
    MIT Licensed. See LICENSE for full license.
 
    Usage : node simplest.app.js
*/

   var 
        gameport        = process.env.PORT || 27025,
        
        //express         = require("express"),
        http            = require("http"),
        //UUID            = require('node-uuid'),
        path            = require('path'),
        url             = require('url'),
        fs              = require('fs'),
        //app             = express(),
        server          = http.createServer(app),
        //io              = require('so.io').listen(server),
        app = http.createServer(function(request, response) {//https://gist.github.com/webgio/4573344

          var uri = url.parse(request.url).pathname,
            filename = path.join(process.cwd() + "/pub/", uri);

          path.exists(filename, function(exists) {
            if (!exists) {
              response.writeHead(404, {
                "Content-Type": "text/plain"
              });
              response.write("404 Not Found\n"+filename);
              response.end();
              return;
            }

            if (fs.statSync(filename).isDirectory()) filename += '/index.html';

            fs.readFile(filename, "binary", function(err, file) {
              if (err) {
                response.writeHead(500, {
                  "Content-Type": "text/plain"
                });
                response.write(err + "\n");
                response.end();
                return;
              }

              response.writeHead(200);
              response.write(file, "binary");
              response.end();
            });
          });
        }).listen(gameport),
        io              = require('socket.io').listen(app);
 
    var Boxie = require("./pub/boxie.js");

    /*server.listen(gameport, function(){
      console.log(gameport);
    });*/


    Server = {
        getPlayerList: function(game){
          var pls={};
          for(var i in game.objects){
            if(!game.objects)continue
            if(game.objects[i].settings.dead==1&&game.objects[i].settings.type==2){
              delete game.objects[i];
              continue;
            }
            var p = game.objects[i];
            /*if(typeof player == "object" && pl.id==p.id){
                continue;
            }*/
            pls[game.objects[i].id]={pos: p.pos, settings: p.settings};
          }
          return pls;
        },
        getNumberOfPlayers: function(game){
          var n=0;
          for(var i in game){
              n++;
          }
          return n;
        },
        _colors: [[255,0,0],[0,255,0],[0,0,255],[255,255,0],[0,255,255],
                  [255,0,255]],
        generateColor: function(seed){
          return Server._colors[seed%Server._colors.length];
          /*[
            200*seed%255,
            200*seed%255+85,
            200*seed%255+170
          ];*/
          
        },
        sendPlayerList: function(game){
          io.sockets.emit("pl",Server.getPlayerList(game));
        },
        //Prints rotated 90 deg
        printMap: function(game){
          console.log("Map:");
          for(var x = 0; x<game.world.length;x++){
            var line = "";
            for(var y = 0; y<game.world[x].length;y++){
              line += game.world[x][y].type;
            }
            console.log(line);
          }
        },
        getSpawnPos: function(game){
          var times = 0,
              pos = false,
              x, y;
          while(!pos){
            x = Math.floor(Math.random()*game.world.length);
            y = Math.floor(Math.random()*game.world[x].length);
            if(game.world[x][y].type==0 || times>200) //Bail out if trying too much
              pos = [x,y];
          }
          return pos;
        },
        powers: [
          {
            name:"Scramble!",
            F: function(game){
              game.buildWorld([game.world.length,game.world[0].length],0.4,0);
            }
          }/*,
          {
            name:"Smallmap!",
            F: function(game){
              game.buildWorld([20,20],0.4,0.1);
            }
          },
          {
            name:"Hugemap!",
            F: function(game){
              game.buildWorld([100,100],0.4,0.1);
            }
          }*/
        ],
        mapsize: [50,50],
        mappoints: 0.1,
        powerInterval: 10000
    }


    var game = new Boxie.Game();
    game.buildWorld([Server.mapsize[0],Server.mapsize[1]],0.4,Server.mappoints);
    var numberOfPlayers = 0;
    game.svars.pwrtime = 0;
    game.svars.pwrto = false;

    game.listen("ptouch", function(d){
      console.log("ptouch");
      io.sockets.emit("pn",d);
      if(game.svars.pwrtime+Server.powerInterval<new Date().getTime()){
        var n = game.countFreePoints();
        //console.log(10,"<",(Server.mapsize[0]*Server.mapsize[1]*Server.mappoints),"-",n);
        if(10<(Server.mapsize[0]*Server.mapsize[1]*Server.mappoints)-n){
          console.log("POWER!",(Server.mapsize[0]*Server.mapsize[1]*Server.mappoints)-n);
          var mpnts = 0,
              best;
          for(var id in this.objects){
            if(!this.objects[id]||this.objects[id].settings.type==2)continue;
            if(this.objects[id].settings.points>mpnts){
              mpnts = this.objects[id].settings.points;
              best = this.objects[id];
            }
          }
          var pwr = Server.powers[Math.floor(Math.random()*Server.powers.length)];
          console.log(pwr);
          best.so.emit("pwr",pwr.name);
          game.svars.pwr = pwr;
          game.svars.pwrto = best;
        }
      }
    });

        //Configure the so.io connection settings.
        //See http://so.io/
    io.configure(function (){

        io.set('log level', 0);

        io.set('authorization', function (handshakeData, callback) {
          callback(null, true); // error first callback style
        });

    });

    io.sockets.on('connection', function (so) {
      so.emit("OK");
      console.log("New dude");
      so.on("activate",function(data){
        console.log("activate",data);
        //if(typeof data.name=="string"){
          var name = data.name.replace(["<",">"],["&lt;","&gt"]);
        /*}else{
          return false;
        }*/
        var pl = so.player = new Boxie.Man(
          false,
          {color: Server.generateColor(numberOfPlayers),name:name,points:0}
        );
        pl.pos = Server.getSpawnPos(game);
        game.addObject(pl);
        pl.so = so;

        pl.listen("drag",function(data){
          //pl.boxie.move(data.a,data.b);
          console.log("drag");
          so.broadcast.emit("swapb",{a:data.a, b:data.b});
        });
        pl.listen("push",function(data){
          //pl.boxie.move(data.a,data.b);
          io.sockets.emit("swapb",{a:data.a, b:data.b});
          console.log("push");
        });
        pl.listen("die", function(reason){
          //console.log("die",pl.id,reason.player);
          pl.settings.points = 0;
          so.broadcast.emit("die",{id: pl.id, reason:reason});
          so.emit("die",{id: pl.id, reason:reason});
        });

        numberOfPlayers++;

        so.emit('self', { id: pl.id, pos: pl.pos, settings: pl.settings });
        so.emit('game', { world: game.world });
        so.broadcast.emit("")
        so.on("move",function(data){
          pl.move(data.pos,data.push);
          so.broadcast.emit("pp",{id:pl.id, pos: pl.pos});
          so.emit("move",pl.pos);
        });
        so.on("respawn",function(data){
          pl.pos = Server.getSpawnPos(game);
          pl.settings.dead = 0;
          io.sockets.emit("respawn",{id:pl.id, pos: pl.pos});
          //Server.sendPlayerList(game);
        });
        so.on("pwr",function(){
          console.log("pwr",game.svars.pwrto.id,pl.id);
          if(game.svars.pwrtime+Server.powerInterval<new Date().getTime() && game.svars.pwrto.id == pl.id){
            io.sockets.emit('rotate');
            game.svars.pwrtime = new Date().getTime();
            setTimeout(function(){
              game.svars.pwr.F(game);
              io.sockets.emit('game', { world: game.world });
              Server.sendPlayerList(game);
            }, 1500);
          }
        });
        so.on("game", function(){
          so.emit('game', { world: game.world });
        });
        so.on("hash", function(){
          so.emit('hash', game.hash());
        });
        so.on("objects", function(){
          Server.sendPlayerList(game);
        });

        /*var startpos;
        do{
          startpos = [
            Math.floor(Math.random()*game.world.length),
            Math.floor(Math.random()*game.world[0].length)
          ];
        }while(!game.isEmpty(startpos));
        console.log("new pos",startpos);
        pl.pos=startpos;*/

        Server.sendPlayerList(game);

        so.on("disconnect",function(){
          delete game.objects[pl.id];
          console.log("DELETED",pl.id);
          console.log("PLayers right now: "+Server.getNumberOfPlayers());
          Server.sendPlayerList(game);
        });

        so.on("admin",function(data){
          console.log("admin command:",data)
          if(typeof data.act==undefined){
            return false;
          }
          if(data.act=="newmap"){
            game.buildWorld([10,10]);
            io.sockets.emit("game",{ world: game.world});
          }else if(data.act=="col"){
            if(typeof data.target!="undefined"
            && typeof game.objects[data.target]!="undefined"
            && typeof data.col=="object"){
              game.objects[data.target].settings.color = data.col;
              Server.sendPlayerList(game);
            }else{
              return false;
            }
          }
        })
      });
      console.log("PLayers right now: "+Server.getNumberOfPlayers());
    });
