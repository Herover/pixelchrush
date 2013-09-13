
	var d = document,
      w = window,
      canvas = d.getElementById("can"),
      noise = d.getElementById("noise"),
      e_myname = d.getElementById("myname"),
      e_messages = d.getElementById("messages"),
      e_power = d.getElementById("g_power"),
      e_powerstr = d.getElementById("g_power_str"),
      e_game = d.getElementById("game"),
      touchstart,
      touch_last_ime = 0,
      touch_e = false
      net_confirm = 0;
  w.requestAnimFrame = (function(){
    return  w.requestAnimationFrame       ||
            w.webkitRequestAnimationFrame ||
            w.mozRequestAnimationFrame    ||
            function( callback ){
              w.setTimeout(callback, 1000 / 60);
            };
  })();
  function addMessage(txt,color){
    var item = d.createElement("li");
    console.log(item);
    item.appendChild(item.ownerDocument.createTextNode(txt));
    item.style.setProperty("color",color);
    e_messages.insertBefore(item,e_messages.firstChild);
  }

	var game = new Boxie.Game(); 
  game.setCanvas(canvas, noise)
 
  function setupconnection(name){
    so = io.connect();
    so.send("connection");

    if(e_game.requestFullscreen)
      e_game.requestFullscreen();
    if(e_game.mozRequestFullScreen)
      e_game.mozRequestFullScreen();
    if(e_game.webkitRequestFullscreen)
      e_game.webkitRequestFullscreen();

    so.on("OK",function(data){
      console.log("got OK");
      so.emit("activate",{name:name});
      so.on("self",function(data){
        console.log("Got self, working...");

        

        player = new Boxie.Man(data.id,data.settings);
        player.pos = data.pos;
        game.addObject(player);
        
        e_myname.innerHTML = data.settings.name;
        var col = data.settings.color;
        e_myname.style.setProperty("color","rgb("+col[0]+","+col[1]+","+col[2]+")");

        var pushmode = true; //Should player drag objects?

        player.listen("move",function(data){
          so.emit("move",data);
          net_confirm++;
          //console.log("move",data);
        });
        so.on("move", function(data){
          if(net_confirm>5){
            player.pos = data;
            net_confirm = 0;
            console.log("CONFIRM 5!");
            so.emit("game");
            so.emit("objects");
          }
          else
            net_confirm--;
          if(net_confirm==0){
            player.pos = data;
            so.emit("hash");
          }
          console.log("confirm",net_confirm);
        })
        player.listen("die", function(data){
          so.emit("respawn");
        });
        so.on("game",function(data){
          console.log("Got game, working");
          game.world = data.world;
        });
        so.on("hash",function(data){
          console.log("hash",game.hash(),data);
          if(game.hash() != data){
            so.emit("game");
            so.emit("objects");
            console.log("data mishmatch");
          }
        });
        so.on("pl",function(data){
          console.log("Got playerlist, working");
          for(var id in data){
            if(typeof game.objects[id]=="undefined"){
              var o;
              if(data[id].settings.type == 1){
                o = new Boxie.Man(id,data[id].settings);
                var col = o.settings.color;
                addMessage(o.settings.name + " joined ", "rgb("+col[0]+","+col[1]+","+col[2]+")");
              }
              else if(data[id].settings.type == 2)
                o = new Boxie.Point(id,data[id].settings);
              console.log(id, o.settings, data[id].settings);
              //game.objects[id] = o;
              game.addObject(o);
              o.pos = data[id].pos;
            }else{
              game.objects[id].settings = data[id].settings;
            }
          }
          for(var i in game.objects){
            if(typeof data[game.objects[i].id] == "undefined"){
              console.log("deleting",game.objects[i].id);
              delete game.objects[game.objects[i].id];
            }
          }
        });
        so.on("pp",function(data){
          console.log(data,game.objects[data.id].pos)
          game.objects[data.id].pos=data.pos;
        });
        so.on("pn",function(data){
          console.log(data);
          game.objects[data.t].settings.points=data.value;
          delete game.objects[data.p];
        });
        so.on("swapb",function(data){
          player.boxie.move(data.a,data.b);
        });
        so.on("die",function(data){
          game.objects[data.id].die(data.reason);
          console.log(data.id, "was killed by", data.reason.player);
          var col = game.objects[data.id].settings.color;
          addMessage(game.objects[data.id].settings.name + " was killed by " + game.objects[data.reason.player].settings.name,"rgb("+col[0]+","+col[1]+","+col[2]+")");
        });
        so.on("respawn",function(data){
          console.log("Respawning...");
          game.objects[data.id].pos=data.pos;
          game.objects[data.id].settings.dead=0;
        });
        so.on("pwr",function(data){
          e_power.removeAttribute("hidden");
          e_powerstr.innerHTML = data;
        });
        so.on("rotate",function(){
          game.can_rotate_to += Math.PI * 2;
        });


        w.addEventListener("keydown", function(e){
          e.preventDefault();
          switch(e.which){
            case 87://W
              player.move([0,-1],pushmode);
              break;
            case 38://W
              player.move([0,-1],pushmode);
              break;
            case 65://A
              player.move([-1,0],pushmode);
              break;
            case 37://A
              player.move([-1,0],pushmode);
              break;
            case 83://S
              player.move([0,1],pushmode);
              break;
            case 40://S
              player.move([0,1],pushmode);
              break;
            case 68://D
              player.move([1,0],pushmode);
              break;
            case 39://D
              player.move([1,0],pushmode);
              break;
            case 32: //space
              pushmode = 2;
              break;
            case 70://F
              e_power.setAttribute("hidden","hidden");
              if(player.settings.pwr!=""){
                so.emit("pwr");
              }
            default:
              console.log(e.which);
          }
        });
        w.onkeyup = function(e){
          switch(e.keyCode){
            case 32: //space
              pushmode = true;
            default:

          }
        }
        /*
        Hammer(canvas,{swipe_velocity: 0.3}).on("swipeleft", function() {
          player.move([-1,0]);
        });
        Hammer(canvas).on("swiperight", function() {
          player.move([1,0]);
        });
        Hammer(canvas).on("swipeup", function() {
          player.move([0,-1]);
        });
        Hammer(canvas).on("swipedown", function() {
          player.move([0,1]);
        });*/

        d.body.addEventListener("touchstart", function(e){
          e.preventDefault();
          starttouch = e.changedTouches[0];
          console.log("touchdown");
          touch_e = e;

          if(
            Math.abs(e.changedTouches[0].pageX-game.settings.screen[0]/2)<game.settings.width
          &&Math.abs(e.changedTouches[0].pageY-game.settings.screen[1]/2)<game.settings.width
          ){
            e_power.setAttribute("hidden","hidden");
            if(player.settings.pwr!=""){
              so.emit("pwr");
            }
          }

          //touchhandle(e);

        });
        d.body.addEventListener("touchend", function(e){
          e.preventDefault();

          touch_e = false;
          //touchhandle(e);

        });
        d.body.addEventListener("touchmove", function(e){
          e.preventDefault();
          touch_e = e;
          touchhandle(e);
        });
        
      });
    });
  }

  function touchhandle(){
    if(!touch_e)return 0;
    var time = new Date().getTime();
    if(touch_last_ime+50<time){
      touch_last_ime = new Date().getTime();
      /*var sX = starttouch.pageX,
          sY = starttouch.pageY,*/
      var sX = game.settings.screen[0]/2,
          sY = game.settings.screen[1]/2,
          nX = touch_e.changedTouches[0].pageX,
          nY = touch_e.changedTouches[0].pageY,
          pushmode;

      if(Math.abs(nX-sX) > Math.abs(nY-sY)){
        pushmode = (nX<game.settings.width||nX>game.settings.screen[0]-game.settings.width)?2:true;
        if(nX<sX)
          player.move([-1, 0],pushmode);
        else
          player.move([1, 0],pushmode);
      }
      else{
        pushmode = (nY<game.settings.width||nY>game.settings.screen[1]-game.settings.width)?2:true;
        if(nY<sY)
          player.move([0,-1],pushmode);
        else
          player.move([0,1],pushmode);
      }
      console.log(nX,nY,sX,sY);
      //alert(nX,nY,sX,sY)

    }
  }

  function update(){
    w.requestAnimFrame(function(){
      game.draw();
      touchhandle();
      update();
    }, canvas);
  }
  
  
  //TODO: MVC'fy or closure
  function sc_hidescreens(){
    var screens = d.getElementsByClassName("sc");
    for(var sc=0;sc<screens.length;sc++){
      screens[sc].setAttribute("hidden","hidden");
    }
  }
  function sc_showscreen(id){
    var screens = d.getElementsByClassName("sc");
    for(var sc=0;sc<screens.length;sc++){
      if(screens[sc].id == id){
        screens[sc].removeAttribute("hidden");
        console.log(screens[sc].id,"screen is showed");
      }
      else{
        screens[sc].setAttribute("hidden","hidden");
        console.log(sc,"is not the right screen");
      }
    }
    //sc_showscreen("sc_startgame");//Fallback
    //console.log("Didn't find screen with id",id);
  }
  sc_hidescreens();
  sc_showscreen("sc_startgame");
  
  function sc_startgame(){
    console.log("starting");
    sc_hidescreens();
    setupconnection(d.getElementById("e_name").value);
  }
  function sc_showhelp(){
    sc_hidescreens();
    sc_showscreen("sc_help");
  }
  function sc_showmenu(){
    sc_showscreen("sc_startgame");
  }


  function onResize(){
    game.settings.screen[0] = noise.width = canvas.width = w.innerWidth;
    game.settings.screen[1] = noise.height = canvas.height = w.innerHeight;
  }
  w.addEventListener("resize", onResize);
  onResize();
  
  update();
