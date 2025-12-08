const jwt = require('jsonwebtoken');
module.exports = function(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
