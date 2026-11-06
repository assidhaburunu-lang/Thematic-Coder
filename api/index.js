'use strict';
// Vercel entry point: every /api/* request is routed here (see vercel.json).
const { handleApi } = require('../lib/app');
module.exports = (req, res) => handleApi(req, res);
