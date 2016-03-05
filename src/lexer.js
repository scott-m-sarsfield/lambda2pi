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

module.exports = Lexer;
