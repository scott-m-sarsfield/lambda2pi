function Lexer(){
  // member variables
  this.rules = {};
}

Lexer.prototype.addRule = function(name,regex){
  this.rules[name] = regex;
};

Lexer.prototype.lex = function(str){
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

Lambda2PiTranslator.prototype.expect = function(name){
  var actual = this.tokens[ this.index ];
  if(actual.name != name){
    console.error("Expected '",name,"', got '",actual.name,"'");
  }
  //console.log( this.getTokenValue() );
  this.index++;
};

Lambda2PiTranslator.prototype.peek = function(){
  return this.tokens[ this.index ].name;
}

Lambda2PiTranslator.prototype.getTokenValue = function(){
  //console.log(str);
  //console.log(str.substr(token.index));
  var token = this.tokens[this.index];
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
  if(this.index < this.tokens.length && this.peek() != "END_PAREN"){
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
