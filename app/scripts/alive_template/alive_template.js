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
		var self = this, nodeId;

		for(var i = 0,l = node.childNodes.length; i<l;i++){
			var cn = node.childNodes[i];

			if(cn.nodeName == '#text' && cn.data.indexOf('${') >= 0){
				// handle text node that has insertionPoint in it
				nodeId = getRandomInt(0, 100000000);
				this.nodeIds[nodeId] = [];

				this.insertionPointGenerators['innerText'].call(this, cn, nodeId);
			}

			if(cn.classList && cn.classList.length > 0){
				nodeId = getRandomInt(0, 100000000); // not DRY...
				this.nodeIds[nodeId] = [];

				this.insertionPointGenerators['className'].call(this, cn, nodeId);
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

							this.textValueArr[this.textValueArrIndex] = val;

							if(this.templateInstance.nodeIds[nodeId] && this.templateInstance.nodeIds[nodeId].length == 0){
								this.templateInstance.nodeIds[nodeId].push(this.updateTextNode.bind(this));
							}
						}
					});
					
				}
			}
		},
		className: function(node, nodeId){
			var classArr = node.className.split(' ');

			if(classArr){
				for(var i = 0, l = classArr.length;i<l;i++){
					if(classArr[i].indexOf('${') !== -1){
						var ipName = classArr[i].slice(2, -1);

						this.insertionPoints[ipName] = new InsertionPoint({
							templateInstance: this,
							nodeId: nodeId,
							ipName: ipName,
							originalIP: classArr[i],
							classNameVal: node.className,
							classIndex: i,
							node: node,
							classValArr: classArr,
							updateIPValueCallback: function(val){
								var tempStr = '';
								// TODO: will need to make update a brand new classname string.
								// in case it changes without alive template knowing.
								if(typeof val == 'string'){
									this.classValArr[this.classIndex] = val;
								}else if(val instanceof Array){
									for(var i = 0,l = val.length;i<l; i++){
										tempStr += val[i] + (i+1 == l ? '' : ' ');
									}
									this.classValArr[this.classIndex] = tempStr;
								}

								if(this.templateInstance.nodeIds[nodeId] && this.templateInstance.nodeIds[nodeId].length == 0){
									this.templateInstance.nodeIds[nodeId].push(this.updateClassNames.bind(this));
								}
							}
						})
					}
				}
			}
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
			}

			for(var id in this.eachLoopInstances){
				this.eachLoopInstances[id].buildTemplateInstances();
				this.eachLoopInstances[id].updateLoopFragInDom();
			}
		},
		if: function(data){
			if(data.if instanceof Array){
				for(var i = 0,l = data.if.length;i<l;i++){
					for(var key in data.data){
						if(key == data.if[i].use && data.data[key] == true){
							this.removeDomOnTplInstance(data.if[i].target);
						}
					}	
				}
			}else if(data.if.use){
				for(var key in data.data){
					if(key == data.if.use && data.data[key] == true){
						this.removeDomOnTplInstance(data.if.target);
					}
				}
			}


		},
		show: function(data){

			if(data.show.use){
				for(var key in data.data){
					if(key == data.show.use && data.data[key] !== true){
						this.addDisplayNoneToTarget(data.show.target);
					}
				}
			}
		},
		style: function(data){

			if(data.style.use){
				for(var key in data.data){
					if(key == data.style.use && data.data[key]){
						this.updateStyleOnTarget(data.style.target, data.data[key]);
					}
				}
			}

		}
	};

	TemplateInstance.prototype.updateStyleOnTarget = function(target, data){
		var domNodes = this.nodeClone.querySelectorAll(target);

		for(var i = 0,l = domNodes.length; i<l; i++){
			for(var styleAttr in data){
				domNodes[i].style[styleAttr] = data[styleAttr];
			}
		}
	}

	TemplateInstance.prototype.addDisplayNoneToTarget = function(target){
		var domNodes = this.nodeClone.querySelectorAll(target);

		for(var i = 0,l = domNodes.length; i<l;i++){
			domNodes[i].style.display = 'none'
		}
	}

	TemplateInstance.prototype.removeDomOnTplInstance = function(target){
		var domNodes = this.nodeClone.querySelectorAll(target);

		for(var i = 0, l = domNodes.length; i<l;i++){
			this.nodeClone.removeChild(domNodes[i]);
		}
	}

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
			tempStr += this.textValueArr[j];
		}

		this.node.nodeValue = tempStr;
	}

	InsertionPoint.prototype.updateClassNames = function(){
		var tempStr = '';

		for(var i = 0,l = this.classValArr.length;i<l;i++){
			tempStr += this.classValArr[i] + (i+1 == l ? '': ' ');
		}

		this.node.className = tempStr
	}

	function EachLoopInstance(data, id, templateInstance){
		var supportedBindings = ['each','if'];

		this.id = id;
		this.originalData = data;
		this.templateToUse = data.template || null;
		this.templateInstance = templateInstance;
		this.insertDestination = data.insert;
		this.insertDestNodeCollection = templateInstance.nodeClone.getElementsByClassName(data.insert);
		this.nodeCollections = {};

		for(var i = 0,l = supportedBindings.length;i<l;i++){
			var key = supportedBindings[i];
			if(data[key]){
				this[key] = data[key];
			}
		}

	}

	EachLoopInstance.prototype.buildTemplateInstances = function(){
		var ti = this.templateInstance;

		if(this.insertDestNodeCollection){
			// for every node that matches the class...
			for(var i = 0, l=this.insertDestNodeCollection.length;i<l;i++){
				var collectionId = getRandomInt(0,1000000000);

				this.nodeCollections[collectionId] = {
					loopTemplateInstances: [],
					node: this.insertDestNodeCollection[i],
					nodeFrag: document.createDocumentFragment()
				};

				// for every object in data array...
				for(var j = 0,m=this.originalData.data.length;j<m;j++){
					if(this.originalData && this.originalData.data[j] !== undefined){
						if(this.templateToUse){
							// populate template instances in node collections.
							var configObj = {
								data: this.originalData.data[j],
								destination: this.insertDestNodeCollection[i],
								if: this.if
							};

							this.nodeCollections[collectionId].loopTemplateInstances[j] = localTemplates[this.templateToUse].createTemplateInstance( configObj, getRandomInt(0, 10000000));

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
			var ti = this.nodeCollections[collection].loopTemplateInstances;

			for(var i = 0,l = ti.length; i<l;i++){
				this.nodeCollections[collection].nodeFrag.appendChild(ti[i].nodeClone);				
			}
		}
	}

	EachLoopInstance.prototype.removeDomFromNodeClone = function(){
		console.log('removeDomFromNodeClone');
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

		var match = str.match(ipRegEx);

		if(match){
			return str.match(ipRegEx).map(function(ip){
				return ip.slice(2, ip.lastIndexOf('}'));
			});
		}
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