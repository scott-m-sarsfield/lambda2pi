/*global require, console, module*/
var Lexer = require("./lexer");

function Lambda2PiTranslator() {
    'use strict';
    this.lexer = new Lexer();
    this.lexer.addRule("LAMBDA", /L/);
    this.lexer.addRule("DOT", /\./);
    this.lexer.addRule("START_PAREN", /\(/);
    this.lexer.addRule("END_PAREN", /\)/);
    this.lexer.addRule("VARIABLE", /[a-z][a-z0-9]*/);
    this.lexer.addRule("STAND_IN", /[A-KM-Z]+/);

    this.str = null;
    this.tokens = null;
    this.index = 0;
}

Lambda2PiTranslator.prototype.throwError = function (msg) {
    'use strict';
    msg = msg || "Invalid lambda expression.";
    throw {
        type: "TranslatorError",
        message: msg
    };
};

Lambda2PiTranslator.prototype.expect = function (name) {
    'use strict';
    var actual = this.tokens[this.index];
    if (!actual) {
        this.throwError();
    }
    if (actual.name !== name) {
        this.throwError(["Expected '", name, "', got '", actual.name, "'"].join(" "));
    }
    //console.log( this.getTokenValue() );
    this.index += 1;
};

Lambda2PiTranslator.prototype.peek = function () {
    'use strict';
    return this.tokens[this.index];
};

Lambda2PiTranslator.prototype.getTokenValue = function () {
    'use strict';
    var token = this.tokens[this.index];
    if (!token) {
        this.throwError("Invalid lambda expression.");
    }
    return this.str.substr(token.index, token.length);
};

Lambda2PiTranslator.Node = function (data) {
    'use strict';
    this.type = "VARIABLE";
    this.expression = data;
};

Lambda2PiTranslator.Node.StandIn = function (data) {
    'use strict';
    this.type = "STAND_IN";
    this.expression = data;
};

Lambda2PiTranslator.Node.Application = function (left, right) {
    'use strict';
    this.type = "APPLICATION";
    this.left = left;
    this.right = right;
};

Lambda2PiTranslator.Node.Abstraction = function (variable, definition) {
    'use strict';
    this.type = "ABSTRACTION";
    this.variable = variable;
    this.definition = definition;
};

Lambda2PiTranslator.prototype.parseLambdaTokens = function (str, tokens, index) {
    'use strict';
    if (str !== undefined) { this.str = str; }
    if (tokens !== undefined) { this.tokens = tokens; }
    if (index !== undefined) { this.index = index; }
    var node = null,
        variable,
        definition,
        left,
        nxt,
        right;

    if (!this.peek()) { this.throwError(); }

    //console.log(this.tokens);
    //console.log(this.index);
    switch (this.tokens[this.index].name) {
    case "LAMBDA":
        this.expect("LAMBDA");
        variable = this.getTokenValue();
        this.expect("VARIABLE");
        this.expect("DOT");
        definition = this.parseLambdaTokens();
        node = new Lambda2PiTranslator.Node.Abstraction(variable, definition);
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
    left = node;
    nxt = this.peek();
    if (nxt && nxt.name !== "END_PAREN") {
        right = this.parseLambdaTokens();
        node = new Lambda2PiTranslator.Node.Application(left, right);
    }

    return node;
};

Lambda2PiTranslator.prototype.resetChannels = function (offset) {
    'use strict';
    this.channelNumber = -1;
    this.channelOffset = offset.charCodeAt(0) - 97;
    this.varsInUse = {};
};

Lambda2PiTranslator.prototype.changeVariable = function (tree, old, updated) {
    'use strict';
    switch (tree.type) {
    case "APPLICATION":
        tree.left = this.changeVariable(tree.left, old, updated);
        tree.right = this.changeVariable(tree.right, old, updated);
        break;
    case "ABSTRACTION":
        if (tree.variable === old) {
            tree.variable = updated;
        }
        tree.definition = this.changeVariable(tree.definition, old, updated);
        break;
    case "VARIABLE":
        if (tree.expression === old) {
            tree.expression = updated;
        }
        break;
    default:
        break;
    }
    return tree;
};


Lambda2PiTranslator.prototype.registerTreeVars = function (tree) {
    'use strict';
    switch (tree.type) {
    case "APPLICATION":
        this.registerTreeVars(tree.left);
        this.registerTreeVars(tree.right);
        break;
    case "ABSTRACTION":
        if (this.varsInUse[tree.variable]) {
            console.warn("Variable", tree.variable, "already in use.  Please rename.");
            var i = 1;
            while (this.varsInUse[tree.variable + i]) {
                i += 1;
            }
            tree = this.changeVariable(tree, tree.variable, tree.variable + i);
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

Lambda2PiTranslator.prototype.getNextChannel = function () {
    'use strict';
    this.channelNumber += 1;
    var cn = this.channelNumber + this.channelOffset,
        str = String.fromCharCode((cn % 26) + 97),
        suffix = Math.floor(this.channelNumber / 26);
    if (suffix > 0) { str += suffix; }
    if (this.varsInUse[str]) { str = this.getNextChannel(); }
    return str;
};

Lambda2PiTranslator.prototype.translateTree = function (tree, p) {
    'use strict';
    var str = "",
        a,
        b,
        c;
    switch (tree.type) {
    case "APPLICATION":
        a = this.getNextChannel();
        b = this.getNextChannel();
        c = this.getNextChannel();
        str += "new(" + a + ").new(" + b + ").(";
        str += this.translateTree(tree.left, a);
        str += " | (" + a + "!" + b + "." + a + "!" + p + ") | * ((" + b + "?" + c + ").";
        str += this.translateTree(tree.right, c);
        str += ")";
        break;
    case "ABSTRACTION":
        a = this.getNextChannel();
        str += p + "?" + tree.variable + "." + p + "?" + a + ".";
        str += this.translateTree(tree.definition, a);
        break;
    case "VARIABLE":
        str += tree.expression + "!" + p;
        break;
    case "STAND_IN":
        str += "[" + tree.expression + "](" + p + ")";
        break;
    default:
        break;
    }
    return str;
};

Lambda2PiTranslator.prototype.translate = function (str) {
    'use strict';
    if (!str || !str.length) {
        this.throwError("No expression.");
    }

    // tokenize str.
    var res = this.lexer.lex(str),
    // parse tokenized string into expression tree.
        tree = this.parseLambdaTokens(str, res, 0);

    // resets in-use variables and channel count.
    this.resetChannels('a');

    // make sure channels do not share names with variables
    this.registerTreeVars(tree);

    // perform translation.
    return this.translateTree(tree, this.getNextChannel());
};

module.exports = Lambda2PiTranslator;
