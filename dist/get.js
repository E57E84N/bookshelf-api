'use strict';

var HowhapList = require('howhap-list');
module.exports = function (req, res, urlPieces, model, config) {
	var promise = model;
	var list = new HowhapList(null, {
		availableErrors: config.errors
	});

	if (model.hasTimestamps.indexOf(config.deletedAttribute) !== -1) {
		promise = promise.where(config.deletedAttribute, null);
	}

	var fetchParams = {};
	if (req.query && Array.isArray(req.query.withRelated)) {
		fetchParams.withRelated = req.query.withRelated;
	}

	// Get individual record
	if (urlPieces.length > 1) {
		promise = promise.fetch(fetchParams);
	}
	// Get all records
	else {
			if (req.query) {
				// Where clause support
				if (req.query.where) {
					if (Array.isArray(req.query.where)) {
						promise = promise.where.apply(promise, req.query.where);
					} else if (Object.prototype.toString.call(req.query.where) == '[object Object]') {
						promise = promise.where(req.query.where);
					}
				}

				// Order by support
				if (req.query.sort) {
					var direction = req.query.direction || 'ASC';
					direction = direction.toLowerCase();
					promise = promise.query('orderBy', req.query.sort, direction);
				}

				
				if (req.query._perPage && req.query._page) {
				  var offset=(req.query._page -1)*req.query._perPage;
				  var limit= offset + req.query._perPage;
				  promise = promise.query(function(qb){
				    qb.offset(offset).limit(limit);
				  });
				}
			}

			promise = promise.fetchAll(fetchParams);
		}
	return promise.then(function (results) {
		if (!results) {
			list.add('RECORD_NOT_FOUND', {
				model: urlPieces[0],
				id: urlPieces[1]
			});
			res.status(config.errors.RECORD_NOT_FOUND.status).json(list.toJSON());
		} else {
			model.query().count('id')
				.then(function (countRes) {
				  res.set('X-Total-Count', countRes[0]['count(`id`)']);
				  res.json(results.toJSON());
				});
		}
	}).catch(function (err) {
		list.add('RECORD_NOT_FOUND', {
			error: err.toString()
		});
		res.status(config.errors.UNKNOWN.status).json(list.toJSON());
	}).then(function () {
		return Promise.resolve({
			urlPieces: urlPieces,
			model: model
		});
	});
};
