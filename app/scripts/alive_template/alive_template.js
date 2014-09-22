define([
	'alive_pubsub/alive_pubsub'
	], function(ps){

		var ipRegEx = /\$\{(\w+)\}/g,
			localTemplates = null; // so we can access Templates internally.

	function Templates(){
		var self = this;
			

		this.__i__ = {
			tplNodeList: document.querySelectorAll('[data-template]'),
			tplNodeArr: [],
			tplKeys: [],
			templates: {}
		};

		for(var i = 0, l = this.__i__.tplNodeList.length; i<l;i++){
			var node = this.__i__.tplNodeList[i];
			// populate Node List Arr
			this.__i__.tplNodeArr.push(node);

			Object.defineProperty(this.__i__.templates, node.attributes['data-template'].value,{
				value: new Template(node)
			});
		}

		this.__i__.tplNodeArr.forEach(function (v, i, arr){

			self.__i__.tplKeys.push(v.attributes['data-template'].value);

			Object.defineProperty(self, v.attributes['data-template'].value, {
				get: function(){
					return self.__i__.templates[v.attributes['data-template'].value];
				},
				set: function(val){
					console.log('setting Template...', val);
				}
			})
		});
	}

	function Template(node){
		var self = this;
		this.prototype = new Function();

		this.__i__ = {
			originalTplNode: node,
			insertionPoints: {}
		};

		self = function(val){
			console.log('tempFunc', val);
		};

		this.originalTplNode = node;

		this.tplNodeClone = node.cloneNode(true);
		this.tplNodeClone.removeAttribute('data-template');

		this.insertionPoints = {};
		this.templateInstances = [];
	}

	Template.prototype.createTemplateInstance = function(data, id){
		var tplInstance = new TemplateInstance(this, data);
		this.templateInstances.push(tplInstance);
		return tplInstance;

	}

	function TemplateInstance(tplRef, data, id){
		var bindingKeys = [],
			self = this;

		this.id = id || null;
		this.node = tplRef.tplNodeClone.cloneNode(true);
		this.nodeClone = tplRef.tplNodeClone.cloneNode(true);
		this.insertionPoints = {};
		this.eachLoopInstances = {};
		this.textValueArr = null;
		this.nodeIds = {};

		this.processInsertionPoints(this.nodeClone);

		this.updateIPValues(data.data);

		//process bindings on data object.
		for(var key in data){
			if(TemplateInstance.prototype.bindings[key]){
				bindingKeys.push(key);
				TemplateInstance.prototype.bindings[key].call(this, data);
			}
		}

		bindingKeys.forEach(function (v, i, arr){
			Object.defineProperty(self, v, {
				get: function(){
					console.log(key);
					return key;
				},
				set: function(val){
					console.log(val, key);
				}
			})
		})

		if(data.destination){
			this.destination = data.destination;
			this.destination.appendChild(this.nodeClone);
		}
	}

	TemplateInstance.prototype.processInsertionPoints = function(node){
		var self = this;

		for(var i = 0,l = node.childNodes.length; i<l;i++){
			var cn = node.childNodes[i];

			if(cn.nodeName == '#text' && cn.data.indexOf('${') >= 0){
				// handle text node that has insertionPoint in it
				var nodeId = getRandomInt(0, 100000000);
				this.nodeIds[nodeId] = [];

				this.insertionPointGenerators['innerText'].call(this, cn, nodeId);
			}

			if(cn.classList && cn.classList.length > 0){
				this.insertionPointGenerators['className'].call(this, cn);
			}
		}

		// recurse over childNodes..
		if(node.children.length > 0){
			for(var i = 0, l = node.children.length;i<l;i++){
				this.processInsertionPoints(node.children[i]);
			}
		}
	}

	TemplateInstance.prototype.insertionPointGenerators = {
		innerText: function(node, nodeId){
			var ipNamesArr = getIPNamesFromStr(node.nodeValue),
				nodeVal = node.nodeValue,
				tempString = node.nodeValue,
				textValueArr = [];

			// TODO: Break this out into a separate function.
			for(var i = 0, l=ipNamesArr.length; i<l;i++){
				var ip = '${' + ipNamesArr[i] + '}',
					tempStrArr = tempString.split(ip);

				textValueArr.push(tempStrArr[0]);
				tempString = tempStrArr[1];
				textValueArr.push(ip);

				if(l == i+1){
					textValueArr.push(tempString);
				};
			}

			for(var i = 0, l = textValueArr.length;i<l;i++){
				if(textValueArr[i].indexOf('${') !== -1){
					var ipName = textValueArr[i].slice(2, -1);
					
					this.insertionPoints[ipName] = new InsertionPoint({
						templateInstance: this,
						nodeId: nodeId,
						textValueArr: textValueArr,
						textValueArrIndex: i,
						ipName: ipName,
						originalIP: textValueArr[i],
						node: node,
						previousIPValue: null,
						startIndex: null,
						endIndex: null,
						updateIPValueCallback: function(val){
							var self = this,
								tempStr = '';

							this.textValueArr[this.textValueArrIndex] = val;

							if(this.templateInstance.nodeIds[nodeId] && this.templateInstance.nodeIds[nodeId].length == 0){
								this.templateInstance.nodeIds[nodeId].push(this.updateTextNode.bind(this));
							}
						}
					});
					
				}
			}
		},
		className: function(node){
			// console.log('reached className');
		}
	}

	TemplateInstance.prototype.bindings = {
		each: function(data){
			var d = data.each;

			// loop over each instance of each.
			for(var i = 0, l = d.length;i<l;i++){
				var ei = d[i],
					eachLoopId = getRandomInt(0, 1000000);
				this.eachLoopInstances[eachLoopId] = new EachLoopInstance(d[i], eachLoopId, this);
				// this.eachLoopInstances.push(new EachLoopInstance(d[i], eachLoopId, this));
			}
			// eachLoopInstances needs to be an array so that order can be guarenteed.
			for(var id in this.eachLoopInstances){
				// console.log('id: ', id);
				// console.log(this.eachLoopInstances[id]);
				this.eachLoopInstances[id].buildTemplateInstances();
				this.eachLoopInstances[id].updateLoopFragInDom();
			}
		}
	};

	TemplateInstance.prototype.updateIPValues = function(data){ 
		
		for(var key in data){
			if(this.insertionPoints[key]){
				this.insertionPoints[key].updateIPValue(data[key], 'no');
			}
		}
		
		this.callNodeIdFunctions();
	}

	TemplateInstance.prototype.callNodeIdFunctions = function(){
		for(var nodeId in this.nodeIds){
			for(var i=0,l=this.nodeIds[nodeId].length;i<l;i++){
				this.nodeIds[nodeId][i]();
			}
		}
	}

	TemplateInstance.prototype.pushDomNodeClone = function(){
		console.log('pushDomNodeClone');

		console.log(this);
		this.destination.appendChild(this.nodeClone);
	}

	function InsertionPoint(data){
		for(var key in data){
			this[key] = data[key];
		}
	}

	InsertionPoint.prototype.updateIPValue = function(val, callNodeIdFunctions){
		this.updateIPValueCallback.call(this, val);

		if(!(callNodeIdFunctions == 'no')){
			this.templateInstance.callNodeIdFunctions();
		}
		
	}

	InsertionPoint.prototype.updateTextNode = function(){
		var tempStr = '';

		for(var j = 0, m = this.textValueArr.length;j<m;j++){
			tempStr = tempStr.concat([this.textValueArr[j]]);
		}

		this.node.nodeValue = tempStr;
	}

	function EachLoopInstance(data, id, templateInstance){
		this.id = id;
		this.originalData = data;
		this.templateToUse = data.template || null;
		this.templateInstance = templateInstance;
		this.insertDestination = data.insert;
		this.insertDestNodeCollection = templateInstance.nodeClone.getElementsByClassName(data.insert);
		this.nodeCollections = {};
		
	}

	EachLoopInstance.prototype.buildTemplateInstances = function(){
		// console.log('buildTemplateInstances');
		var ti = this.templateInstance;

		if(this.insertDestNodeCollection){
			// for every node that matches the class...
			for(var i = 0, l=this.insertDestNodeCollection.length;i<l;i++){
				var collectionId = getRandomInt(0,1000000000);

				this.nodeCollections[collectionId] = {
					// loopTemplateInstances: {},
					loopTemplateInstances: [],
					node: this.insertDestNodeCollection[i],
					nodeFrag: document.createDocumentFragment()
				};

				// for every object in data array...
				for(var j = 0,m=this.originalData.data.length;j<m;j++){
					if(this.originalData && this.originalData.data[j] !== undefined){
						// console.log('bam', this.originalData.data[j]);
						if(this.templateToUse){
							// populate template instances in node collections.
							this.nodeCollections[collectionId].loopTemplateInstances[j] = localTemplates[this.templateToUse].createTemplateInstance({
								data: this.originalData.data[j],
								destination: this.insertDestNodeCollection[i]
							}, getRandomInt(0, 10000000));

							// update the values stored in instances.
							this.nodeCollections[collectionId].loopTemplateInstances[j].updateIPValues(this.originalData.data[j]);
						}
					}
				}
			}
		}
		this.constructNodeInternals();
	}

	EachLoopInstance.prototype.constructNodeInternals = function(){

		for(var collection in this.nodeCollections){
			for(var id in this.nodeCollections[collection].loopTemplateInstances){
				var ti  = this.nodeCollections[collection].loopTemplateInstances[id];

				this.nodeCollections[collection].nodeFrag.appendChild(ti.nodeClone);
			}
		}
	}

	EachLoopInstance.prototype.updateLoopFragInDom = function(){
		var col = this.nodeCollections;
		
		for(var collection in this.nodeCollections){
			var node = col[collection].node;
			node.appendChild(col[collection].nodeFrag.cloneNode(true));
		}
	}

	// returns an array of insertionPoint names.
	function getIPNamesFromStr(str){

		return str.match(ipRegEx).map(function(ip){
			return ip.slice(2, ip.lastIndexOf('}'));
		});
	}

	function removeIPFromStr(str, ipName){
		var newStr = str.split('${' + ipName + '}').join('');

		if(newStr.indexOf(' ') == 0){
			newStr = newStr.substr(1);
		}
		return newStr;
	}

		function getRandomInt(min, max) {

			return Math.floor(Math.random() * (max - min)) + min;
	}

	localTemplates = new Templates();

	return localTemplates;
});