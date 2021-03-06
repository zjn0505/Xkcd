'use strict';

const SUCCESS_CODE = 200;
const CLIENT_FAILURE_CODE = 400;
const SERVER_FAILURE_CODE = 400;

var mongoose = require('mongoose'),
	WhatIf = mongoose.model('whatif'),
	whatIfCrawler = require('../../crawlers/whatIfCrawler');

var latestIndex = 157;

exports.latestIndex = latestIndex;

exports.setLatest = function (latest) {
	latestIndex = latest;
}

exports.what_if_thumb_up = function (req, res) {
	var id = parseInt(req.body.what_if_id);
	if (id == NaN || id == null || id <= 0 || id > latestIndex + 2) {
		res.sendStatus(400);
		return;
	}
	WhatIf.findOne({
		'num': id
	}, {
		__v: 0
	}, function (err, whatIf) {
		if (err || whatIf == null) {
			var newWhatIf = new WhatIf({
				num: id + "",
				thumbCount: 1,
			});
			res.json(newWhatIf);
			newWhatIf.save();
			return;
		}
		whatIf.thumbCount = whatIf.thumbCount + 1;
		whatIf.save(function (err, whatIfSaved) {
			if (err) {
				res.sendStatus(500);
			}
			if (whatIfSaved) {
				res.json(whatIfSaved);
			}
		});
	});
}

exports.what_if_top = function (req, res) {
	var sortby = req.query.sortby;
	var size = parseInt(req.query.size);
	if (sortby != "thumb-up") {
		res.sendStatus(400);
		return;
	}

	WhatIf.find({
			thumbCount: {
				$gt: 0
			}
		}, {
			_id: 0,
			__v: 0
		})
		.sort({
			thumbCount: -1
		})
		.limit(isNaN(size) ? 100 : size)
		.exec(function (err, docs) {
			if (err) {
				console.error(err);
				res.sendStatus(500);
			}
			if (docs) {
				res.json(docs);
			}
		});
}

exports.what_if_suggest = function (req, res) {
	var keyword = req.query.q;
	var size = parseInt(req.query.size);
	if (!keyword) {
		res.sendStatus(SERVER_FAILURE_CODE);
		return;
	}
	var id = !isNaN(keyword) ? keyword : 0;
	WhatIf.find({
			$or: [{
					$text: {
						$search: keyword
					}
				},
				{
					"num": id
				}
			]
		}, {
			score: {
				$meta: "textScore"
			},
			_id: 0,
			__v: 0
		}).limit(isNaN(size) ? 20 : size).sort({
			score: {
				$meta: "textScore"
			},
			"num": -1
		})
		.exec(
			function (err, docs) {
				if (err) {
					console.error(err);
				}
				if (docs) {
					res.json(docs);
				}
			});
}

exports.what_if_list = function (req, res) {
	var start = parseInt(req.query.start);
	var reversed = parseInt(req.query.reversed);
	var size = parseInt(req.query.size);
	if (isNaN(start) || start < 0 || start > latestIndex ||
		(req.query.reversed && isNaN(reversed) || reversed != 0 && reversed != 1 && !isNaN(reversed)) ||
		(req.query.size && isNaN(size) || size < 0 && !isNaN(size)) ||
		(start == 0 && reversed != 1)) {
		res.sendStatus(400);
		return;
	}
	if (isNaN(reversed)) {
		reversed = 0;
	}
	if (isNaN(size)) {
		size = 100;
	}
	var end;
	if (reversed == 0) {
		end = start + size;
	} else if (start == 0 && reversed == 1) {
		end = latestIndex + 1;
		start = latestIndex - size + 1;
	} else {
		end = start + 1;
		start = end - size;
	}
	end = end > latestIndex ? latestIndex + 1 : end;
	start = start < 1 ? 1 : start;
	WhatIf.find({
			num: {
				$gt: start - 1,
				$lt: end
			}
		}, {
			_id: 0,
			__v: 0
		})
		.sort({
			num: reversed == 0 ? 1 : -1
		})
		.exec(
			function (err, docs) {
				if (err) {
					console.error(err);
					res.sendStatus(500);
				}
				if (docs) {
					res.json(docs);
				}
			});
}

exports.what_if_refresh = function (req, res) {
	whatIfCrawler.regularCheck()
	res.sendStatus(202)
}

exports.what_if_random = function (req, res) {
	var size = parseInt(req.query.size);

	if (!size) {
		size = 1
	}
	WhatIf.aggregate()
		.sample(size)
		.then((comics) => {
			res.json(comics)

		}, (error) => {
			res.error(error)
			res.sendStatus(500)
		})
}
