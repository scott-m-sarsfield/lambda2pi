(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global) {
var Lambda2PiTranslator = require("./src/translator");

global.Lambda2PiTranslator = Lambda2PiTranslator;

/*

var l2pt = new Lambda2PiTranslator();

var str, res;
//var str = "L x . (L y . x y)";

// K combinator
str = "L x . (L y . x)";
res = l2pt.translate(str);
console.log(str,"==>");
console.log(res,'\n');

// I combinator
str = "L x . x";
res = l2pt.translate(str);
console.log(str,"==>");
console.log(res,'\n');

// In Class Example
str = "(L x . x) N";
res = l2pt.translate(str);
console.log(str,"==>");
console.log(res,'\n');

// Renaming Test
str = "L x . (L x . x)";
res = l2pt.translate(str);
console.log(str,"==>");
console.log(res,'\n');

*/

}).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./src/translator":3}],2:[function (require, module, exports) {
function Lexer() {
  // member variables
  this.rules = {};
}

Lexer.prototype.addRule = function(name, regex) {
  this.rules[name] = regex;
};

Lexer.prototype.lex = function(str) {
  var res = new Array();
  for(var i in this.rules){
    var regex = this.rules[i];
    var match = null;
    var temp = str;
    var ind = 0;
    while((match = temp.match(regex)) != null){
      //console.log("hit =",match);
      var indOffset = ind + match.index;
      ind += match.index + match[0].length;
      //console.log(ind);
      temp = str.slice(ind);
      //console.log(temp);

      var obj = {
        name:i,
        index:indOffset,
        length:match[0].length
      };
      res.push(obj);
    }
  }
  return res.sort(function(a,b){
    return a.index - b.index;
  });
};

module.exports = Lexer;

},{}],3:[function(require,module,exports){
var Lexer = require("./lexer");

function Lambda2PiTranslator(){
  this.lexer = new Lexer();
  this.lexer.addRule("LAMBDA",/L/);
  this.lexer.addRule("DOT",/\./);
  this.lexer.addRule("START_PAREN",/\(/);
  this.lexer.addRule("END_PAREN",/\)/);
  this.lexer.addRule("VARIABLE",/[a-z][a-z0-9]*/);
  this.lexer.addRule("STAND_IN",/[A-KM-Z]+/);

  this.str = null;
  this.tokens = null;
  this.index = 0;
}

Lambda2PiTranslator.prototype.throwError = function(msg){
  msg = msg || "Invalid lambda expression.";
  throw {
    type:"TranslatorError",
    message:msg
  }
}

Lambda2PiTranslator.prototype.expect = function(name){
  var actual = this.tokens[ this.index ];
  if(!actual){
    this.throwError();
  }
  if(actual.name != name){
    this.throwError(["Expected '",name,"', got '",actual.name,"'"].join(" "));
  }
  //console.log( this.getTokenValue() );
  this.index++;
};

Lambda2PiTranslator.prototype.peek = function(){
  return this.tokens[ this.index ];
}

Lambda2PiTranslator.prototype.getTokenValue = function(){
  var token = this.tokens[this.index];
  if(!token){
    this.throwError("Invalid lambda expression.");
  }

  return this.str.substr(token.index,token.length);
};

Lambda2PiTranslator.Node = function(data){
  this.type = "VARIABLE";
  this.expression = data;
};
Lambda2PiTranslator.Node.StandIn = function(data){
  this.type = "STAND_IN";
  this.expression = data;
}

Lambda2PiTranslator.Node.Application = function(left,right){
  this.type = "APPLICATION";
  this.left = left;
  this.right = right;
}
Lambda2PiTranslator.Node.Abstraction = function(variable,definition){
  this.type = "ABSTRACTION";
  this.variable = variable;
  this.definition = definition;
}

Lambda2PiTranslator.prototype.parseLambdaTokens = function(str,tokens,index){
  if(str !== undefined) this.str = str;
  if(tokens !== undefined) this.tokens = tokens;
  if(index !== undefined) this.index = index;

  var node = null;

  if(!this.peek()){ this.throwError(); }

  //console.log(this.tokens);
  //console.log(this.index);
  switch( this.tokens[ this.index ].name ){
    case "LAMBDA":
      this.expect("LAMBDA");
      var variable = this.getTokenValue();
      this.expect("VARIABLE");
      this.expect("DOT");
      var definition = this.parseLambdaTokens();
      node = new Lambda2PiTranslator.Node.Abstraction(variable,definition);
      break;

    case "START_PAREN":
      this.expect("START_PAREN");
      node = this.parseLambdaTokens();
      this.expect("END_PAREN");
      break;

    case "VARIABLE":
      node = new Lambda2PiTranslator.Node(this.getTokenValue());
      this.expect("VARIABLE");
      break;

    case "STAND_IN":
      node = new Lambda2PiTranslator.Node.StandIn(this.getTokenValue());
      this.expect("STAND_IN");
      break;

    default:
      console.log(this.getTokenValue());
      console.error("Non-Lambda Expression Observed.");
      return;
  }

  // Check for application.
  var left = node;
  var nxt = this.peek();
  if(nxt && nxt.name != "END_PAREN"){
    var right = this.parseLambdaTokens();
    node = new Lambda2PiTranslator.Node.Application(left,right);
  }

  return node;
}

Lambda2PiTranslator.prototype.resetChannels = function(offset){
  this.channelNumber = -1;
  this.channelOffset = offset.charCodeAt(0) - 97;
  this.varsInUse = {};
}

Lambda2PiTranslator.prototype.changeVariable = function(tree,old,updated){
  switch(tree.type){
    case "APPLICATION":
      tree.left = this.changeVariable(tree.left,old,updated);
      tree.right = this.changeVariable(tree.right,old,updated);
      break;
    case "ABSTRACTION":
      if(tree.variable == old){
        tree.variable = updated;
      }
      tree.definition = this.changeVariable(tree.definition,old,updated);
      break;
    case "VARIABLE":
      if(tree.expression == old){
        tree.expression = updated;
      }
      break;
    default:
      break;
  }
  return tree;
};


Lambda2PiTranslator.prototype.registerTreeVars = function(tree){
  switch(tree.type){
    case "APPLICATION":
      this.registerTreeVars(tree.left);
      this.registerTreeVars(tree.right);
      break;
    case "ABSTRACTION":
      if(this.varsInUse[tree.variable]){
        console.warn("Variable",tree.variable,"already in use.  Please rename.");
        var i = 1;
        while(this.varsInUse[tree.variable+i]){
          i++;
        }
        tree = this.changeVariable(tree,tree.variable,tree.variable+i);
      }
      this.varsInUse[tree.variable] = true;
      this.registerTreeVars(tree.definition);
      break;
    case "VARIABLE":
      this.varsInUse[tree.expression] = true;
      break;
    default:
      break;
  }
};

Lambda2PiTranslator.prototype.getNextChannel = function(){
  this.channelNumber++;
  var cn = this.channelNumber + this.channelOffset;
  var str = String.fromCharCode((cn % 26)+97)
  var suffix = Math.floor(this.channelNumber / 26);
  if(suffix > 0) str += suffix;
  if(this.varsInUse[str]) str = this.getNextChannel();
  return str;
};

Lambda2PiTranslator.prototype.translateTree = function(tree,p){
  var str = "";
  var a,b,c;
  switch(tree.type){
    case "APPLICATION":
      a = this.getNextChannel();
      b = this.getNextChannel();
      c = this.getNextChannel();
      str += "new("+a+").new("+b+").(";
      str += this.translateTree(tree.left,a);
      str += " | ("+a+"!"+b+"."+a+"!"+p+") | * (("+b+"?"+c+")."
      str += this.translateTree(tree.right,c);
      str += ")";
      break;
    case "ABSTRACTION":
      a = this.getNextChannel();
      str += p+"?"+tree.variable+"."+p+"?"+a+".";
      str += this.translateTree(tree.definition,a);
      break;
    case "VARIABLE":
      str += tree.expression+"!"+p;
      break;
    case "STAND_IN":
      str += "["+tree.expression+"]("+p+")";
    default:
      break;
  }
  return str;
};

Lambda2PiTranslator.prototype.translate = function(str){
  if(!str || !str.length){
    this.throwError("No expression.")
  }

  // tokenize str.
  var res = this.lexer.lex(str);

  // parse tokenized string into expression tree.
  var tree = this.parseLambdaTokens(str,res,0);

  // resets in-use variables and channel count.
  this.resetChannels('a');

  // make sure channels do not share names with variables
  this.registerTreeVars(tree);

  // perform translation.
  return this.translateTree(tree,this.getNextChannel());
}

module.exports = Lambda2PiTranslator;

},{"./lexer":2}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9sZXhlci5qcyIsInNyYy90cmFuc2xhdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgTGFtYmRhMlBpVHJhbnNsYXRvciA9IHJlcXVpcmUoXCIuL3NyYy90cmFuc2xhdG9yXCIpO1xyXG5cclxuZ2xvYmFsLkxhbWJkYTJQaVRyYW5zbGF0b3IgPSBMYW1iZGEyUGlUcmFuc2xhdG9yO1xyXG5cclxuLypcclxuXHJcbnZhciBsMnB0ID0gbmV3IExhbWJkYTJQaVRyYW5zbGF0b3IoKTtcclxuXHJcbnZhciBzdHIsIHJlcztcclxuLy92YXIgc3RyID0gXCJMIHggLiAoTCB5IC4geCB5KVwiO1xyXG5cclxuLy8gSyBjb21iaW5hdG9yXHJcbnN0ciA9IFwiTCB4IC4gKEwgeSAuIHgpXCI7XHJcbnJlcyA9IGwycHQudHJhbnNsYXRlKHN0cik7XHJcbmNvbnNvbGUubG9nKHN0cixcIj09PlwiKTtcclxuY29uc29sZS5sb2cocmVzLCdcXG4nKTtcclxuXHJcbi8vIEkgY29tYmluYXRvclxyXG5zdHIgPSBcIkwgeCAuIHhcIjtcclxucmVzID0gbDJwdC50cmFuc2xhdGUoc3RyKTtcclxuY29uc29sZS5sb2coc3RyLFwiPT0+XCIpO1xyXG5jb25zb2xlLmxvZyhyZXMsJ1xcbicpO1xyXG5cclxuLy8gSW4gQ2xhc3MgRXhhbXBsZVxyXG5zdHIgPSBcIihMIHggLiB4KSBOXCI7XHJcbnJlcyA9IGwycHQudHJhbnNsYXRlKHN0cik7XHJcbmNvbnNvbGUubG9nKHN0cixcIj09PlwiKTtcclxuY29uc29sZS5sb2cocmVzLCdcXG4nKTtcclxuXHJcbi8vIFJlbmFtaW5nIFRlc3Rcclxuc3RyID0gXCJMIHggLiAoTCB4IC4geClcIjtcclxucmVzID0gbDJwdC50cmFuc2xhdGUoc3RyKTtcclxuY29uc29sZS5sb2coc3RyLFwiPT0+XCIpO1xyXG5jb25zb2xlLmxvZyhyZXMsJ1xcbicpO1xyXG5cclxuKi9cclxuIiwiZnVuY3Rpb24gTGV4ZXIoKXtcclxuICAvLyBtZW1iZXIgdmFyaWFibGVzXHJcbiAgdGhpcy5ydWxlcyA9IHt9O1xyXG59XHJcblxyXG5MZXhlci5wcm90b3R5cGUuYWRkUnVsZSA9IGZ1bmN0aW9uKG5hbWUscmVnZXgpe1xyXG4gIHRoaXMucnVsZXNbbmFtZV0gPSByZWdleDtcclxufTtcclxuXHJcbkxleGVyLnByb3RvdHlwZS5sZXggPSBmdW5jdGlvbihzdHIpe1xyXG4gIHZhciByZXMgPSBuZXcgQXJyYXkoKTtcclxuICBmb3IodmFyIGkgaW4gdGhpcy5ydWxlcyl7XHJcbiAgICB2YXIgcmVnZXggPSB0aGlzLnJ1bGVzW2ldO1xyXG4gICAgdmFyIG1hdGNoID0gbnVsbDtcclxuICAgIHZhciB0ZW1wID0gc3RyO1xyXG4gICAgdmFyIGluZCA9IDA7XHJcbiAgICB3aGlsZSgobWF0Y2ggPSB0ZW1wLm1hdGNoKHJlZ2V4KSkgIT0gbnVsbCl7XHJcbiAgICAgIC8vY29uc29sZS5sb2coXCJoaXQgPVwiLG1hdGNoKTtcclxuICAgICAgdmFyIGluZE9mZnNldCA9IGluZCArIG1hdGNoLmluZGV4O1xyXG4gICAgICBpbmQgKz0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XHJcbiAgICAgIC8vY29uc29sZS5sb2coaW5kKTtcclxuICAgICAgdGVtcCA9IHN0ci5zbGljZShpbmQpO1xyXG4gICAgICAvL2NvbnNvbGUubG9nKHRlbXApO1xyXG5cclxuICAgICAgdmFyIG9iaiA9IHtcclxuICAgICAgICBuYW1lOmksXHJcbiAgICAgICAgaW5kZXg6aW5kT2Zmc2V0LFxyXG4gICAgICAgIGxlbmd0aDptYXRjaFswXS5sZW5ndGhcclxuICAgICAgfTtcclxuICAgICAgcmVzLnB1c2gob2JqKTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHJlcy5zb3J0KGZ1bmN0aW9uKGEsYil7XHJcbiAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExleGVyO1xyXG4iLCJ2YXIgTGV4ZXIgPSByZXF1aXJlKFwiLi9sZXhlclwiKTtcclxuXHJcbmZ1bmN0aW9uIExhbWJkYTJQaVRyYW5zbGF0b3IoKXtcclxuICB0aGlzLmxleGVyID0gbmV3IExleGVyKCk7XHJcbiAgdGhpcy5sZXhlci5hZGRSdWxlKFwiTEFNQkRBXCIsL0wvKTtcclxuICB0aGlzLmxleGVyLmFkZFJ1bGUoXCJET1RcIiwvXFwuLyk7XHJcbiAgdGhpcy5sZXhlci5hZGRSdWxlKFwiU1RBUlRfUEFSRU5cIiwvXFwoLyk7XHJcbiAgdGhpcy5sZXhlci5hZGRSdWxlKFwiRU5EX1BBUkVOXCIsL1xcKS8pO1xyXG4gIHRoaXMubGV4ZXIuYWRkUnVsZShcIlZBUklBQkxFXCIsL1thLXpdW2EtejAtOV0qLyk7XHJcbiAgdGhpcy5sZXhlci5hZGRSdWxlKFwiU1RBTkRfSU5cIiwvW0EtS00tWl0rLyk7XHJcblxyXG4gIHRoaXMuc3RyID0gbnVsbDtcclxuICB0aGlzLnRva2VucyA9IG51bGw7XHJcbiAgdGhpcy5pbmRleCA9IDA7XHJcbn1cclxuXHJcbkxhbWJkYTJQaVRyYW5zbGF0b3IucHJvdG90eXBlLnRocm93RXJyb3IgPSBmdW5jdGlvbihtc2cpe1xyXG4gIG1zZyA9IG1zZyB8fCBcIkludmFsaWQgbGFtYmRhIGV4cHJlc3Npb24uXCI7XHJcbiAgdGhyb3cge1xyXG4gICAgdHlwZTpcIlRyYW5zbGF0b3JFcnJvclwiLFxyXG4gICAgbWVzc2FnZTptc2dcclxuICB9XHJcbn1cclxuXHJcbkxhbWJkYTJQaVRyYW5zbGF0b3IucHJvdG90eXBlLmV4cGVjdCA9IGZ1bmN0aW9uKG5hbWUpe1xyXG4gIHZhciBhY3R1YWwgPSB0aGlzLnRva2Vuc1sgdGhpcy5pbmRleCBdO1xyXG4gIGlmKCFhY3R1YWwpe1xyXG4gICAgdGhpcy50aHJvd0Vycm9yKCk7XHJcbiAgfVxyXG4gIGlmKGFjdHVhbC5uYW1lICE9IG5hbWUpe1xyXG4gICAgdGhpcy50aHJvd0Vycm9yKFtcIkV4cGVjdGVkICdcIixuYW1lLFwiJywgZ290ICdcIixhY3R1YWwubmFtZSxcIidcIl0uam9pbihcIiBcIikpO1xyXG4gIH1cclxuICAvL2NvbnNvbGUubG9nKCB0aGlzLmdldFRva2VuVmFsdWUoKSApO1xyXG4gIHRoaXMuaW5kZXgrKztcclxufTtcclxuXHJcbkxhbWJkYTJQaVRyYW5zbGF0b3IucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbigpe1xyXG4gIHJldHVybiB0aGlzLnRva2Vuc1sgdGhpcy5pbmRleCBdO1xyXG59XHJcblxyXG5MYW1iZGEyUGlUcmFuc2xhdG9yLnByb3RvdHlwZS5nZXRUb2tlblZhbHVlID0gZnVuY3Rpb24oKXtcclxuICB2YXIgdG9rZW4gPSB0aGlzLnRva2Vuc1t0aGlzLmluZGV4XTtcclxuICBpZighdG9rZW4pe1xyXG4gICAgdGhpcy50aHJvd0Vycm9yKFwiSW52YWxpZCBsYW1iZGEgZXhwcmVzc2lvbi5cIik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5zdHIuc3Vic3RyKHRva2VuLmluZGV4LHRva2VuLmxlbmd0aCk7XHJcbn07XHJcblxyXG5MYW1iZGEyUGlUcmFuc2xhdG9yLk5vZGUgPSBmdW5jdGlvbihkYXRhKXtcclxuICB0aGlzLnR5cGUgPSBcIlZBUklBQkxFXCI7XHJcbiAgdGhpcy5leHByZXNzaW9uID0gZGF0YTtcclxufTtcclxuTGFtYmRhMlBpVHJhbnNsYXRvci5Ob2RlLlN0YW5kSW4gPSBmdW5jdGlvbihkYXRhKXtcclxuICB0aGlzLnR5cGUgPSBcIlNUQU5EX0lOXCI7XHJcbiAgdGhpcy5leHByZXNzaW9uID0gZGF0YTtcclxufVxyXG5cclxuTGFtYmRhMlBpVHJhbnNsYXRvci5Ob2RlLkFwcGxpY2F0aW9uID0gZnVuY3Rpb24obGVmdCxyaWdodCl7XHJcbiAgdGhpcy50eXBlID0gXCJBUFBMSUNBVElPTlwiO1xyXG4gIHRoaXMubGVmdCA9IGxlZnQ7XHJcbiAgdGhpcy5yaWdodCA9IHJpZ2h0O1xyXG59XHJcbkxhbWJkYTJQaVRyYW5zbGF0b3IuTm9kZS5BYnN0cmFjdGlvbiA9IGZ1bmN0aW9uKHZhcmlhYmxlLGRlZmluaXRpb24pe1xyXG4gIHRoaXMudHlwZSA9IFwiQUJTVFJBQ1RJT05cIjtcclxuICB0aGlzLnZhcmlhYmxlID0gdmFyaWFibGU7XHJcbiAgdGhpcy5kZWZpbml0aW9uID0gZGVmaW5pdGlvbjtcclxufVxyXG5cclxuTGFtYmRhMlBpVHJhbnNsYXRvci5wcm90b3R5cGUucGFyc2VMYW1iZGFUb2tlbnMgPSBmdW5jdGlvbihzdHIsdG9rZW5zLGluZGV4KXtcclxuICBpZihzdHIgIT09IHVuZGVmaW5lZCkgdGhpcy5zdHIgPSBzdHI7XHJcbiAgaWYodG9rZW5zICE9PSB1bmRlZmluZWQpIHRoaXMudG9rZW5zID0gdG9rZW5zO1xyXG4gIGlmKGluZGV4ICE9PSB1bmRlZmluZWQpIHRoaXMuaW5kZXggPSBpbmRleDtcclxuXHJcbiAgdmFyIG5vZGUgPSBudWxsO1xyXG5cclxuICBpZighdGhpcy5wZWVrKCkpeyB0aGlzLnRocm93RXJyb3IoKTsgfVxyXG5cclxuICAvL2NvbnNvbGUubG9nKHRoaXMudG9rZW5zKTtcclxuICAvL2NvbnNvbGUubG9nKHRoaXMuaW5kZXgpO1xyXG4gIHN3aXRjaCggdGhpcy50b2tlbnNbIHRoaXMuaW5kZXggXS5uYW1lICl7XHJcbiAgICBjYXNlIFwiTEFNQkRBXCI6XHJcbiAgICAgIHRoaXMuZXhwZWN0KFwiTEFNQkRBXCIpO1xyXG4gICAgICB2YXIgdmFyaWFibGUgPSB0aGlzLmdldFRva2VuVmFsdWUoKTtcclxuICAgICAgdGhpcy5leHBlY3QoXCJWQVJJQUJMRVwiKTtcclxuICAgICAgdGhpcy5leHBlY3QoXCJET1RcIik7XHJcbiAgICAgIHZhciBkZWZpbml0aW9uID0gdGhpcy5wYXJzZUxhbWJkYVRva2VucygpO1xyXG4gICAgICBub2RlID0gbmV3IExhbWJkYTJQaVRyYW5zbGF0b3IuTm9kZS5BYnN0cmFjdGlvbih2YXJpYWJsZSxkZWZpbml0aW9uKTtcclxuICAgICAgYnJlYWs7XHJcblxyXG4gICAgY2FzZSBcIlNUQVJUX1BBUkVOXCI6XHJcbiAgICAgIHRoaXMuZXhwZWN0KFwiU1RBUlRfUEFSRU5cIik7XHJcbiAgICAgIG5vZGUgPSB0aGlzLnBhcnNlTGFtYmRhVG9rZW5zKCk7XHJcbiAgICAgIHRoaXMuZXhwZWN0KFwiRU5EX1BBUkVOXCIpO1xyXG4gICAgICBicmVhaztcclxuXHJcbiAgICBjYXNlIFwiVkFSSUFCTEVcIjpcclxuICAgICAgbm9kZSA9IG5ldyBMYW1iZGEyUGlUcmFuc2xhdG9yLk5vZGUodGhpcy5nZXRUb2tlblZhbHVlKCkpO1xyXG4gICAgICB0aGlzLmV4cGVjdChcIlZBUklBQkxFXCIpO1xyXG4gICAgICBicmVhaztcclxuXHJcbiAgICBjYXNlIFwiU1RBTkRfSU5cIjpcclxuICAgICAgbm9kZSA9IG5ldyBMYW1iZGEyUGlUcmFuc2xhdG9yLk5vZGUuU3RhbmRJbih0aGlzLmdldFRva2VuVmFsdWUoKSk7XHJcbiAgICAgIHRoaXMuZXhwZWN0KFwiU1RBTkRfSU5cIik7XHJcbiAgICAgIGJyZWFrO1xyXG5cclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZ2V0VG9rZW5WYWx1ZSgpKTtcclxuICAgICAgY29uc29sZS5lcnJvcihcIk5vbi1MYW1iZGEgRXhwcmVzc2lvbiBPYnNlcnZlZC5cIik7XHJcbiAgICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGZvciBhcHBsaWNhdGlvbi5cclxuICB2YXIgbGVmdCA9IG5vZGU7XHJcbiAgdmFyIG54dCA9IHRoaXMucGVlaygpO1xyXG4gIGlmKG54dCAmJiBueHQubmFtZSAhPSBcIkVORF9QQVJFTlwiKXtcclxuICAgIHZhciByaWdodCA9IHRoaXMucGFyc2VMYW1iZGFUb2tlbnMoKTtcclxuICAgIG5vZGUgPSBuZXcgTGFtYmRhMlBpVHJhbnNsYXRvci5Ob2RlLkFwcGxpY2F0aW9uKGxlZnQscmlnaHQpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG5vZGU7XHJcbn1cclxuXHJcbkxhbWJkYTJQaVRyYW5zbGF0b3IucHJvdG90eXBlLnJlc2V0Q2hhbm5lbHMgPSBmdW5jdGlvbihvZmZzZXQpe1xyXG4gIHRoaXMuY2hhbm5lbE51bWJlciA9IC0xO1xyXG4gIHRoaXMuY2hhbm5lbE9mZnNldCA9IG9mZnNldC5jaGFyQ29kZUF0KDApIC0gOTc7XHJcbiAgdGhpcy52YXJzSW5Vc2UgPSB7fTtcclxufVxyXG5cclxuTGFtYmRhMlBpVHJhbnNsYXRvci5wcm90b3R5cGUuY2hhbmdlVmFyaWFibGUgPSBmdW5jdGlvbih0cmVlLG9sZCx1cGRhdGVkKXtcclxuICBzd2l0Y2godHJlZS50eXBlKXtcclxuICAgIGNhc2UgXCJBUFBMSUNBVElPTlwiOlxyXG4gICAgICB0cmVlLmxlZnQgPSB0aGlzLmNoYW5nZVZhcmlhYmxlKHRyZWUubGVmdCxvbGQsdXBkYXRlZCk7XHJcbiAgICAgIHRyZWUucmlnaHQgPSB0aGlzLmNoYW5nZVZhcmlhYmxlKHRyZWUucmlnaHQsb2xkLHVwZGF0ZWQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJBQlNUUkFDVElPTlwiOlxyXG4gICAgICBpZih0cmVlLnZhcmlhYmxlID09IG9sZCl7XHJcbiAgICAgICAgdHJlZS52YXJpYWJsZSA9IHVwZGF0ZWQ7XHJcbiAgICAgIH1cclxuICAgICAgdHJlZS5kZWZpbml0aW9uID0gdGhpcy5jaGFuZ2VWYXJpYWJsZSh0cmVlLmRlZmluaXRpb24sb2xkLHVwZGF0ZWQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJWQVJJQUJMRVwiOlxyXG4gICAgICBpZih0cmVlLmV4cHJlc3Npb24gPT0gb2xkKXtcclxuICAgICAgICB0cmVlLmV4cHJlc3Npb24gPSB1cGRhdGVkO1xyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG4gIHJldHVybiB0cmVlO1xyXG59O1xyXG5cclxuXHJcbkxhbWJkYTJQaVRyYW5zbGF0b3IucHJvdG90eXBlLnJlZ2lzdGVyVHJlZVZhcnMgPSBmdW5jdGlvbih0cmVlKXtcclxuICBzd2l0Y2godHJlZS50eXBlKXtcclxuICAgIGNhc2UgXCJBUFBMSUNBVElPTlwiOlxyXG4gICAgICB0aGlzLnJlZ2lzdGVyVHJlZVZhcnModHJlZS5sZWZ0KTtcclxuICAgICAgdGhpcy5yZWdpc3RlclRyZWVWYXJzKHRyZWUucmlnaHQpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJBQlNUUkFDVElPTlwiOlxyXG4gICAgICBpZih0aGlzLnZhcnNJblVzZVt0cmVlLnZhcmlhYmxlXSl7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiVmFyaWFibGVcIix0cmVlLnZhcmlhYmxlLFwiYWxyZWFkeSBpbiB1c2UuICBQbGVhc2UgcmVuYW1lLlwiKTtcclxuICAgICAgICB2YXIgaSA9IDE7XHJcbiAgICAgICAgd2hpbGUodGhpcy52YXJzSW5Vc2VbdHJlZS52YXJpYWJsZStpXSl7XHJcbiAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyZWUgPSB0aGlzLmNoYW5nZVZhcmlhYmxlKHRyZWUsdHJlZS52YXJpYWJsZSx0cmVlLnZhcmlhYmxlK2kpO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMudmFyc0luVXNlW3RyZWUudmFyaWFibGVdID0gdHJ1ZTtcclxuICAgICAgdGhpcy5yZWdpc3RlclRyZWVWYXJzKHRyZWUuZGVmaW5pdGlvbik7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIlZBUklBQkxFXCI6XHJcbiAgICAgIHRoaXMudmFyc0luVXNlW3RyZWUuZXhwcmVzc2lvbl0gPSB0cnVlO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIGJyZWFrO1xyXG4gIH1cclxufTtcclxuXHJcbkxhbWJkYTJQaVRyYW5zbGF0b3IucHJvdG90eXBlLmdldE5leHRDaGFubmVsID0gZnVuY3Rpb24oKXtcclxuICB0aGlzLmNoYW5uZWxOdW1iZXIrKztcclxuICB2YXIgY24gPSB0aGlzLmNoYW5uZWxOdW1iZXIgKyB0aGlzLmNoYW5uZWxPZmZzZXQ7XHJcbiAgdmFyIHN0ciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGNuICUgMjYpKzk3KVxyXG4gIHZhciBzdWZmaXggPSBNYXRoLmZsb29yKHRoaXMuY2hhbm5lbE51bWJlciAvIDI2KTtcclxuICBpZihzdWZmaXggPiAwKSBzdHIgKz0gc3VmZml4O1xyXG4gIGlmKHRoaXMudmFyc0luVXNlW3N0cl0pIHN0ciA9IHRoaXMuZ2V0TmV4dENoYW5uZWwoKTtcclxuICByZXR1cm4gc3RyO1xyXG59O1xyXG5cclxuTGFtYmRhMlBpVHJhbnNsYXRvci5wcm90b3R5cGUudHJhbnNsYXRlVHJlZSA9IGZ1bmN0aW9uKHRyZWUscCl7XHJcbiAgdmFyIHN0ciA9IFwiXCI7XHJcbiAgdmFyIGEsYixjO1xyXG4gIHN3aXRjaCh0cmVlLnR5cGUpe1xyXG4gICAgY2FzZSBcIkFQUExJQ0FUSU9OXCI6XHJcbiAgICAgIGEgPSB0aGlzLmdldE5leHRDaGFubmVsKCk7XHJcbiAgICAgIGIgPSB0aGlzLmdldE5leHRDaGFubmVsKCk7XHJcbiAgICAgIGMgPSB0aGlzLmdldE5leHRDaGFubmVsKCk7XHJcbiAgICAgIHN0ciArPSBcIm5ldyhcIithK1wiKS5uZXcoXCIrYitcIikuKFwiO1xyXG4gICAgICBzdHIgKz0gdGhpcy50cmFuc2xhdGVUcmVlKHRyZWUubGVmdCxhKTtcclxuICAgICAgc3RyICs9IFwiIHwgKFwiK2ErXCIhXCIrYitcIi5cIithK1wiIVwiK3ArXCIpIHwgKiAoKFwiK2IrXCI/XCIrYytcIikuXCJcclxuICAgICAgc3RyICs9IHRoaXMudHJhbnNsYXRlVHJlZSh0cmVlLnJpZ2h0LGMpO1xyXG4gICAgICBzdHIgKz0gXCIpXCI7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIkFCU1RSQUNUSU9OXCI6XHJcbiAgICAgIGEgPSB0aGlzLmdldE5leHRDaGFubmVsKCk7XHJcbiAgICAgIHN0ciArPSBwK1wiP1wiK3RyZWUudmFyaWFibGUrXCIuXCIrcCtcIj9cIithK1wiLlwiO1xyXG4gICAgICBzdHIgKz0gdGhpcy50cmFuc2xhdGVUcmVlKHRyZWUuZGVmaW5pdGlvbixhKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiVkFSSUFCTEVcIjpcclxuICAgICAgc3RyICs9IHRyZWUuZXhwcmVzc2lvbitcIiFcIitwO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJTVEFORF9JTlwiOlxyXG4gICAgICBzdHIgKz0gXCJbXCIrdHJlZS5leHByZXNzaW9uK1wiXShcIitwK1wiKVwiO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG4gIHJldHVybiBzdHI7XHJcbn07XHJcblxyXG5MYW1iZGEyUGlUcmFuc2xhdG9yLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbihzdHIpe1xyXG4gIGlmKCFzdHIgfHwgIXN0ci5sZW5ndGgpe1xyXG4gICAgdGhpcy50aHJvd0Vycm9yKFwiTm8gZXhwcmVzc2lvbi5cIilcclxuICB9XHJcblxyXG4gIC8vIHRva2VuaXplIHN0ci5cclxuICB2YXIgcmVzID0gdGhpcy5sZXhlci5sZXgoc3RyKTtcclxuXHJcbiAgLy8gcGFyc2UgdG9rZW5pemVkIHN0cmluZyBpbnRvIGV4cHJlc3Npb24gdHJlZS5cclxuICB2YXIgdHJlZSA9IHRoaXMucGFyc2VMYW1iZGFUb2tlbnMoc3RyLHJlcywwKTtcclxuXHJcbiAgLy8gcmVzZXRzIGluLXVzZSB2YXJpYWJsZXMgYW5kIGNoYW5uZWwgY291bnQuXHJcbiAgdGhpcy5yZXNldENoYW5uZWxzKCdhJyk7XHJcblxyXG4gIC8vIG1ha2Ugc3VyZSBjaGFubmVscyBkbyBub3Qgc2hhcmUgbmFtZXMgd2l0aCB2YXJpYWJsZXNcclxuICB0aGlzLnJlZ2lzdGVyVHJlZVZhcnModHJlZSk7XHJcblxyXG4gIC8vIHBlcmZvcm0gdHJhbnNsYXRpb24uXHJcbiAgcmV0dXJuIHRoaXMudHJhbnNsYXRlVHJlZSh0cmVlLHRoaXMuZ2V0TmV4dENoYW5uZWwoKSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGFtYmRhMlBpVHJhbnNsYXRvcjtcclxuIl19
