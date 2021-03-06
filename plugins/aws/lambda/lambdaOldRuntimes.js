var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
	title: 'Lambda Old Runtimes',
	category: 'Lambda',
	description: 'Ensures Lambda functions are not using out-of-date runtime environments.',
	more_info: 'Lambda runtimes should be kept current with recent versions of the underlying codebase. Deprecated runtimes should not be used.',
	link: 'http://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html',
	recommended_action: 'Upgrade the Lambda function runtime to use a more current version.',
	apis: ['Lambda:listFunctions'],

	run: function(cache, settings, callback) {
		var results = [];
		var source = {};
		var regions = helpers.regions(settings.govcloud);

		var deprecatedRuntimes = [
			{ 'id':'nodejs', 'name': 'Node.js 0.10', 'endOfLifeDate': '2016-10-31' },
			{ 'id':'nodejs4.3', 'name': 'Node.js 4.3', 'endOfLifeDate': '2018-04-30' },
			{ 'id':'nodejs4.3-edge', 'name': 'Node.js 4.3', 'endOfLifeDate': '2018-04-30' }
		];

		async.each(regions.lambda, function(region, rcb){
			var listFunctions = helpers.addSource(cache, source,
				['lambda', 'listFunctions', region]);

			if (!listFunctions) return rcb();

			if (listFunctions.err || !listFunctions.data) {
				helpers.addResult(results, 3,
					'Unable to query for Lambda functions: ' + helpers.addError(listFunctions), region);
				return rcb();
			}

			if (!listFunctions.data.length) {
				helpers.addResult(results, 0, 'No Lambda functions found', region);
				return rcb();
			}

			var found = false;

			for (f in listFunctions.data) {
				// For resource, attempt to use the endpoint address (more specific) but fallback to the instance identifier
				var lambdaFunction = listFunctions.data[f];

				if (!lambdaFunction.Runtime) continue;

				var deprecatedRunTime = deprecatedRuntimes.filter((d) => {
					return d.id == lambdaFunction.Runtime;
				});

				if (deprecatedRunTime && deprecatedRunTime.length>0){
					found = true;

					helpers.addResult(results, 2,
						'Function is using out-of-date runtime: ' + deprecatedRunTime[0].name + ' end of life: ' + deprecatedRunTime[0].endOfLifeDate,
						region, lambdaFunction.FunctionArn);
				}
			}

			if (!found) {
				helpers.addResult(results, 0,
					'No functions using out-of-date runtimes',
					region);
			}
			
			rcb();
		}, function(){
			callback(null, results, source);
		});
	}
};
