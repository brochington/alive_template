require([
	'spec',
	'alive_template/alive_template',	
	'mocha'
	], function (spec, atpl){

	mocha.setup('bdd');

	// for testing purposes only, remove!
	window.t = atpl;

	/************************* sandbox **************************/
	console.time('total');
	var templateInstance = atpl.list.createTemplateInstance({
		data: {person1: 'Broch', person2: 'Stilley', colorClass: 'myClass', myTestClass: ['helloHello', 'helloBroch']},
		destination: document.getElementById('destNode'),
		each: [{
			insert: 'list_items',
			template: 'list_items',
			data: [{
				text: 'This is my first list Item'
			},{
				text: 'Here is some more text'
			}]
		}],
		// if will/won't have dom actually "rendered"
		if: {
			target: "hideMe",
			data: false
		}
		// show/hide will add display: none to Dom.
		show: {
			target: 'something',
			data: 'maybe a function here?'
		}
	});

	console.timeEnd('total');

	window.ti = templateInstance;

	/************************************************************/

	spec.runTests();

	mocha.run();
})