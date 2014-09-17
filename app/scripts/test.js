require([
	'spec',
	'alive_template/alive_template',	
	'mocha'
	], function (spec, atpl){

	mocha.setup('bdd');

	// for testing purposes only, remove!
	window.t = atpl;

	/************************* sandbox **************************/

	var templateInstance = atpl.list.createTemplateInstance({
		data: {person: 'Broch', colorClass: 'myClass'},
		destination: document.getElementById('destNode'),
		each: [{
			text: 'This is my first list Item',
		}, {
			text: 'Here is my secon list Item'
		}]
	});

	window.ti = templateInstance;

	/************************************************************/

	spec.runTests();

	mocha.run();
})