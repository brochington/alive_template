define([
	'alive_pubsub/alive_pubsub'
	], function(ps){

		var ipRegEx = /\$\{(\w+)\}/g;

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

	Template.prototype.createTemplateInstance = function(data){
		var tplInstance = new TemplateInstance(this, data);
		this.templateInstances.push(tplInstance);
		return tplInstance;

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
						originalIP: "${" + textValueArr[i] + "}",
						node: node,
						previousIPValue: null,
						startIndex: null,
						endIndex: null,
						updateIPValueCallback: function(val){
							console.log('bam', val);
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

	function TemplateInstance(tplRef, data){

		this.node = tplRef.tplNodeClone.cloneNode(true);
		this.insertionPoints = {};
		this.textValueArr = null;
		this.nodeIds = {};

		this.processInsertionPoints(this.node);
		this.updateIPValues(data.data);


		if(data.destination){
			this.destination = data.destination;

			data.destination.appendChild(this.node);
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
		console.log('updateTextNode');
		var tempStr = '';

		for(var j = 0, m = this.textValueArr.length;j<m;j++){
			tempStr = tempStr.concat([this.textValueArr[j]]);
		}

		this.node.nodeValue = tempStr;
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

	return new Templates();
});