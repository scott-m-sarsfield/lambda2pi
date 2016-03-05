# lambda2pi

_Library to Convert (Pseduo-)Lambda Calculus Expressions to Pi Calculus Expressions_

### Usage
##### Rules
Use the following notation for lambda expressions.

- Format: `L <variable> . <expression>`
- Variables must be lowercase.
- Non-evaluated expressions must be uppercase.



##### Example
```javascript
var l2pt = new Lambda2PiTranslator();

...

var str = "L x . (L y . x)";
var res = l2pt.translate(str);
```
