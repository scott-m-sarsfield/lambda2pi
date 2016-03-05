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
