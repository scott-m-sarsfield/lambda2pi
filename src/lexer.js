/*global module*/

function Lexer() {
    // member variables
    'use strict';
    this.rules = {};
}

Lexer.prototype.addRule = function (name, regex) {
    'use strict';
    this.rules[name] = regex;
};

Lexer.prototype.lex = function (str) {
    'use strict';
    var i,
        res = new Array(),
        regex = this.rules[i],
        match = null,
        temp = str,
        ind = 0,
        indOffset,
        obj = {};
    for (i in this.rules) {
        while ((match = temp.match(regex)) != null) {
            //console.log("hit =",match);
            indOffset = ind + match.index;
            ind += match.index + match[0].length;
            //console.log(ind);
            temp = str.slice(ind);
            //console.log(temp);

            obj = {
                name: i,
                index: indOffset,
                length: match[0].length
            };

            res.push(obj);
        }
    }
    return res.sort(function (a, b) {
        return a.index - b.index;
    });
};

module.exports = Lexer;
