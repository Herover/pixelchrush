Boxie = {};
Boxie.Game = function(){
  this.world = [];
  this.canvas = false;
  this.ctx = false;
  this.canvasnoise = false;
  this.ctxnoise = false;

  this.settings = {
    width: 40,
    screen: [0,0],
    pwr: ""
  };

  this.svars = {}; //Server vars

  this.objects = [];

  this.can_rotate = 0;
  this.can_rotate_to = 0;

  this.callbacks = {};
}
Boxie.Game.prototype = {
  buildWorld: function(size,blockc,pointsd){
    this.world = [[]];
    for(var x = 0; x<size[0]; x++){
      this.world[x]=[]
      for(var y = 0; y<size[1]; y++){
        this.world[x][y] = new Boxie.Solid(Math.round(Math.random()*0.6));
      }
    }
    var sizen = size[0]*size[1],
        pnts = 0, times = 0;
    for(var i in this.objects){
      if(!this.objects[i])continue;
      if(this.objects[i].settings.type==2 && this.objects[i].pos[0]>size[0] && this.objects[i].pos[1]>size[1]){
        delete this.objects[i];
      }
      /*else if(this.objects[i].settings.type==1){
        this.objects[i].pos = Server.getSpawnPos(this);//Notice: serverside only
      }*/
    }
    while(pnts<sizen*pointsd&&times<sizen){
      times++;
      var x = Math.floor(Math.random()*size[0]),
          y = Math.floor(Math.random()*size[1]);
      if(this.isEmpty([x,y])===true){
        pnts++;
        var o = new Boxie.Point(false);
        o.pos = [x,y];
        this.addObject(o);
        //o.listen("touch", function(r){ontouch(o);});
      }

    }



    this.canvas.width = this.settings.width * size[0];
    this.canvas.height = this.settings.width * size[1];
    this.canvasnoise.width = this.settings.width * size[0];
    this.canvasnoise.height = this.settings.width * size[1];
  },
  //Client only
  draw: function(){
    var viewport = [0,0];
    if(this.can_rotate < this.can_rotate_to){
      this.can_rotate += Math.PI/100;
    }
    if(this.can_rotate > this.can_rotate_to){
      this.can_rotate = this.can_rotate_to = 0;
    }
    //Yes, I know i shouldn't rely on a variable in the global scope, but time didn't
    //allow me to set up a more appropriate system.
    if(typeof player!="undefined"){
      viewport[0] = -player.pos[0] * this.settings.width +this.settings.screen[0]/2;
      viewport[1] = -player.pos[1] * this.settings.width +this.settings.screen[1]/2;
    }
    this.ctxnoise.clearRect(0,0,this.canvasnoise.width,this.canvasnoise.height);
    var time = new Date().getTime()/1000;
    var col_ins = [
      ~~(256 * (Math.sin(time/3)/2+0.5)),
      ~~(256 * (Math.sin(time/3+2*Math.PI/3)/2+0.5)),
      ~~(256 * (Math.sin(time/3+4*Math.PI/3)/2+0.5))
    ];
    var col_out = [col_ins[1],col_ins[2],col_ins[0]];
    var col = col_ins;
    for(var x = 0; x<this.canvasnoise.width;x+=this.settings.width/4){
      for(var y = 0; y<this.canvasnoise.height;y+=this.settings.width/4){
        var vx = Math.floor((x - viewport[0])/this.settings.width);
        if(
          typeof this.world[vx] != "undefined" &&
          typeof this.world[vx][Math.floor((y - viewport[1])/this.settings.width)] != "undefined"
        )
          col = col_ins;
        else
          col = col_out;
        this.ctxnoise.fillStyle="rgba("+col[0]+", "+col[1]+", "+col[2]+", "+~~(Math.random()*10)/40+")";
        //console.log(this.ctxnoise.fillStyle);
        this.ctxnoise.fillRect(
          x,
          y,
          this.settings.width/4,
          this.settings.width/4
        );
      }
    }
    this.ctx.save();
    this.ctxnoise.save();
    this.ctx.translate(
      this.settings.screen[0]/2,
      this.settings.screen[1]/2
    );
    this.ctxnoise.translate(
      this.settings.screen[0]/2,
      this.settings.screen[1]/2
    );
    this.ctx.rotate(this.can_rotate);
    this.ctxnoise.rotate(this.can_rotate);
    this.ctx.translate(
      -this.settings.screen[0]/2,
      -this.settings.screen[1]/2
    );
    this.ctxnoise.translate(
      -this.settings.screen[0]/2,
      -this.settings.screen[1]/2
    );
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.translate(
      viewport[0],
      viewport[1]
    );
    this.ctxnoise.translate(
      viewport[0],
      viewport[1]
    );

    
    this.ctx.fillStyle = "#000";
    for(var x = 0; x<this.world.length;x++){
      for(var y = 0; y<this.world[x].length;y++){
        if(this.world[x][y].type==1){
          /*this.ctx.fillStyle = "#000";
          }
          else{
            this.ctx.fillStyle = "#fff";
          }*/
          this.ctx.fillRect(
            x*this.settings.width,
            y*this.settings.width,
            this.settings.width,
            this.settings.width
          )
        }
      }
    }

    for(var i in this.objects){
      if(!this.objects[i])continue;
      this.objects[i].draw(this.ctx, this.ctxnoise);
    }
    this.ctx.restore();
    this.ctxnoise.restore();
    
    this.ctx.drawImage(this.canvasnoise,0,0);
  },
  tick: function(){
    for(var i in this.objects){
      if(!this.objects[i])continue;
      if(this.objects[i].settings.dead == 1)
      {
        delete this.objects[i];
        this.objects[i] = false;
        continue;
      }
      this.objects[i].tick();
    }
  },
  addObject: function(obj){
    if(typeof obj=="undefined"){
      console.log("NO OBJECT!!!");
      return false;
    }
    if(obj.id === false){
      obj.id = this.objects.length;
      console.log("New id:",obj.id);
    }
    this.objects[obj.id] = obj;
    obj.boxie = this;
  },
  isEmpty: function(newpos){
    if(
      typeof this.world[newpos[0]]=="undefined" ||
      typeof this.world[newpos[0]][newpos[1]]=="undefined"
    ){
      return null;
    }
    if(this.world[newpos[0]][newpos[1]].type==1){
      return false;
    }
    for(var p in this.objects){
      if(!this.objects[p])continue;
      if(
        this.objects[p].pos[0]==newpos[0]&&
        this.objects[p].pos[1]==newpos[1]
      )
      {
        if(this.objects[p].settings.type==1){
          return false;
        }
        if(this.objects[p].settings.type==2){
          return this.objects[p];
        }
      }
    }
    return true;
  },
  setCanvas: function(canvas, noise){
    this.canvas = canvas;
    this.canvasnoise = noise;
    this.ctx = this.canvas.getContext("2d");
    this.ctxnoise = this.canvasnoise.getContext("2d");
  }, 
  move: function(a,b){
    var one = this.world[a[0]][a[1]];
    this.world[a[0]][a[1]] = this.world[b[0]][b[1]];
    this.world[b[0]][b[1]] = one;

    /*var toDie
    if(toDie = this.getObjectAt(b)){
      console.log("die", toDie);
    }*/
  },
  removeObject: function(id){
    delete this.objects[id];
  },
  getWorldObjectAt: function(pos){
    if(typeof this.world[pos[0]]!="undefined"&&typeof this.world[pos[0]][pos[1]]!="undefined"){
      return this.world[pos[0]][pos[1]]
    }
    else{
      return false;
    }
  },
  getObjectAt: function(pos){
    for(var id in this.objects){
      if(!this.objects[id])continue;
      if(this.objects[id].pos[0] == pos[0]&&this.objects[id].pos[1] == pos[1]){
        return this.objects[id];
      }
    }
    return false;
  },
  countFreePoints: function(){
    var pnts = 0;
    for(var id in this.objects){
      if(!this.objects[id]||this.objects[id].settings.dead)continue;
      if(this.objects[id].settings.type==2){
        pnts += this.objects[id].settings.value;
      }
    }
    return pnts;
  },
  listen: function(type, callback){
    if(typeof this.callbacks[type]=="undefined"){
      this.callbacks[type]=[];
    }
    this.callbacks[type].push(callback);
  },
  _listen: function(type,arg){
    if(typeof this.callbacks[type]=="undefined"){
      return false;}
    for(var i in this.callbacks[type]){
      if(typeof this.callbacks[type][i]=="function"){
        this.callbacks[type][i].call(this,arg);
      }
    }
  },
  hash: function(){
    var n = 0;
    for(var x = 0; x<this.world.length;x++){
      for(var y = 0; y<this.world[x].length;y++){
        if(this.world[x][y].type==1){
          n+=x*y;
          n%=999;
        }
      }
    }
    return n;
  }
}
/*
  Solid: type integer, settings object, unique id integer

  Drawed by Boxie
*/
Boxie.Solid = function(type,settings,id){
  this.type = type;
  this.settings = {
    
  };
  for(var i in settings){
    this.settings[i] = settings[i];
  }
}
/*
  Player: settings object, unique id integer

  Draw itself
*/
Boxie.Man = function(id,settings){
  this.settings = settings||{points:0};
  this.settings.dead = 0;
  this.settings.type = 1;
  this.settings.movespeed = 100;
  this.id = id;

  this.pos = [0,0];
  this.boxie = false;

  this.lastmove = 0;

  this.callbacks = {};
}
Boxie.Man.prototype = {
  tick: function(){

  },
  //Pass canvas context and noise context
  draw: function(ctx, noise){
    var multiplier = this.boxie.settings.width;
    ctx.beginPath();
    if(this.settings.dead)
      ctx.fillStyle = "rgb(0,0,0)";
    else
      ctx.fillStyle = "rgb("+
        this.settings.color[0]+","+
        this.settings.color[1]+","+
        this.settings.color[2]+")";
    ctx.arc(
      this.pos[0]*multiplier+multiplier/2,
      this.pos[1]*multiplier+multiplier/2,
      multiplier/2,0,2*Math.PI);
    ctx.fill();
    ctx.stroke();

    noise.save();
    noise.globalCompositeOperation="destination-out";
    noise.strokeStyle="rgba(0,0,0,0)";
    noise.beginPath();
    var x=this.pos[0]*multiplier+multiplier/2,
      y=this.pos[1]*multiplier+multiplier/2,
      r=multiplier/2*(this.settings.points/4+1)
    var grad = noise.createRadialGradient(
      x, 
      y,
      0,
      x, 
      y,
      r
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.65)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    noise.fillStyle = grad;
    noise.arc(
      x, 
      y,
      r,0,2*Math.PI
    );
    noise.fill();
    noise.stroke();
    noise.restore();
      
  },
  //Callback: "move" "drag" "push"
  //Push: false = no, true = yes, 2 = drag, undefined = true
  move: function(pos, push){
    if(this.settings.dead)
      return false;
    var time = new Date().getTime();
    if(this.lastmove+this.settings.movespeed>time)
      return false;
    if(typeof push=="undefined"){
      var push=true;
    }
    var newpos = [
      this.pos[0]+pos[0],
      this.pos[1]+pos[1]
    ];
    //console.log(this.pos,"+",pos,"=",newpos);
    //console.log(this.boxie);
    var ie = this.boxie.isEmpty(newpos);
    //console.log(ie);
    if(ie) {
      if(typeof ie=="object"){
        console.log("touch",ie.id);
        ie.touch({player:this.id});
        this._listen("touched",{player:this.id})
      }
      var oldpos = [this.pos[0],this.pos[1]];
      this.pos=newpos;
      this.lastmove = new Date().getTime();
      //drag
      if(push==2){
        var dragpos = [
          oldpos[0]+pos[0]*-1,
          oldpos[1]+pos[1]*-1
        ];
        if(this.boxie.isEmpty(dragpos)==false){
          this._listen("drag",{a: dragpos, b: oldpos});
          this.boxie.move(dragpos,oldpos);
        }
        //console.log(this.pos,oldpos,dragpos);
      }
      this._listen("move",{pos:pos,push:push});
    }
    else if(push===true){
      //Granted that we only move 1 or -1 step a time
      var dragpos = [
        this.pos[0]+pos[0]*2,
        this.pos[1]+pos[1]*2
      ];
      var atdragpos = this.boxie.getObjectAt(dragpos);
      if(this.boxie.isEmpty(dragpos)||atdragpos){
        if(atdragpos){
          atdragpos.die({player:this.id});
        }
        this.boxie.move(newpos,dragpos);
        this._listen("push",{a: newpos, b: dragpos});
        this.pos=newpos;
        this.lastmove = new Date().getTime();
        this._listen("move",{pos:pos,push:push});
      }
    }
  },
  die: function(reason){
    //this.pos = [0,0];
    var pnt = new Boxie.Point(false, {value: this.settings.points});
    pnt.pos = [this.pos[0], this.pos[1]];
    this.boxie.addObject(pnt);
    this.settings.dead = 1;
    this.settings.points = 0;
    this._listen("die",reason);
  },
  touch: function(reason){
    this._listen("touch",reason);
  },
  listen: function(type, callback){
    if(typeof this.callbacks[type]=="undefined"){
      this.callbacks[type]=[];
    }
    this.callbacks[type].push(callback);
  },
  _listen: function(type,arg){
    if(typeof this.callbacks[type]=="undefined"){
      return false;}
    for(var i in this.callbacks[type]){
      if(typeof this.callbacks[type][i]=="function"){
        this.callbacks[type][i].call(this,arg);
      }
    }
  }
}

Boxie.Point = function(id,settings){
  this.settings = settings||{value: 1};
  this.settings.type = 2;
  this.settings.dead = 0;
  this.settings.color = [255,255,255];
  this.id = id;

  this.pos = [0,0];
  this.boxie = false;

  this.callbacks = {};
}
Boxie.Point.prototype = {
  tick: function(){

  },
  //Pass canvas context and noise context
  draw: function(ctx, noise){
    var multiplier = this.boxie.settings.width;
    noise.beginPath();
    if(this.settings.dead)
      return false;
    else
      noise.fillStyle = "rgb("+
        this.settings.color[0]+","+
        this.settings.color[1]+","+
        this.settings.color[2]+")";
    noise.arc(
      this.pos[0]*multiplier+multiplier/2,
      this.pos[1]*multiplier+multiplier/2,
      multiplier/3,0,2*Math.PI);
    noise.fill();
    noise.stroke();
  },
  die: function(reason){

  },
  touch: function(reason){
    if(this.settings.dead)
      return false;
    this.boxie.objects[reason.player].settings.points+=this.settings.value;
    this.settings.dead = 1;
    this.boxie._listen("ptouch",{
      p:this.id,
      t:this.boxie.objects[reason.player].id,
      value:this.boxie.objects[reason.player].settings.points
    });
    this._listen("touch",reason);
  },
  listen: function(type, callback){
    if(typeof this.callbacks[type]=="undefined"){
      this.callbacks[type]=[];
    }
    this.callbacks[type].push(callback);
  },
  _listen: function(type,arg){
    if(typeof this.callbacks[type]=="undefined"){
      return false;}
    for(var i in this.callbacks[type]){
      if(typeof this.callbacks[type][i]=="function"){
        this.callbacks[type][i].call(this,arg);
      }
    }
  }
}

if (typeof module !== 'undefined') {
    module.exports = Boxie;
}
