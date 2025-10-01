
/*
 * Testing our lambda function
 */

var lambda = require('./index.js').handler

// Should Work
var subscription = {
  "email": "costa@innovationbound.com",
  "list": "chatgpt-training-business-owners-only"
}
// The curly braces below create an object, remember ; )
lambda({body: JSON.stringify({subscription})}).then( console.log ).catch( console.log )

// Missing Info

// Bad Email

// Not Signed

