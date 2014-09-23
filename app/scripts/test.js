require([
	'spec',
	'alive_template/alive_template',	
	'mocha'
	], function (spec, atpl){

	mocha.setup('bdd');

	// for testing purposes only, remove!
	window.t = atpl;

	var data = {
		person1: 'Broch', 
		person2: 'Stilley', 
		colorClass: 'myClass', 
		myTestClass: ['helloHello', 'helloBroch'],
		removeThis: true,
		showThis: false,
		someStyling: {
			color: 'orange',
			fontSize: '100px'
		}
	}

	var eachData = [{
			text: 'This is my first list Item',
			hideMe: true
		},{
			text: 'Here is some more text',
			hideMe: true
		}
	]

	/************************* sandbox **************************/
	console.time('total');
	var templateInstance = atpl.list.createTemplateInstance({
		data: data,
		destination: document.getElementById('destNode'),
		each: [{
			insert: 'list_items',
			template: 'list_items',
			data: eachData,
			if: [{
				target: '.hideMe',
				use: 'hideMe'
			}]
		}],
		if: {
			target: ".hideThis",
			use: 'removeThis'
		},
		// show/hide will add display: none to Dom.
		show: {
			target: '.showThis',
			use: 'showThis'
		},
		style: {
			target: '.testBox1',
			use: 'someStyling'
		}
	});

	console.timeEnd('total');

	window.ti = templateInstance;

	/************************************************************/

	spec.runTests();

	mocha.run();
})