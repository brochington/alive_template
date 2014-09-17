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
				this.insertionPointGenerators['innerText'].call(this, cn);
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
		innerText: function(node){
			var ipNamesArr = getIPNamesFromStr(node.nodeValue);

			for(var i = 0, l = ipNamesArr.length; i<l; i++){
				this.insertionPoints[ipNamesArr[i]] = new InsertionPoint({
					template: this,
					originalIP: '${' + ipNamesArr[i] + '}',
					node: node,
					previousIPValue: null,
					updateIPValueCallback: function(val){
						console.log('bam');
						var self = this,
							strToReplace = this.previousIPValue ? this.previousIPValue : this.originalIP;

							console.log(strToReplace);

							console.dir(this.node.nodeValue);

							this.node.nodeValue = this.node.nodeValue.replace(strToReplace, val);

							this.previousIPValue = val;

							console.log(this.node);
					}
				})
			}
		},
		className: function(node){
			console.log('reached className');
		}
	}

	function TemplateInstance(tplRef, data){
		console.log('creating a template instance');
		console.log(tplRef);
		console.log(data);

		this.node = tplRef.tplNodeClone.cloneNode(true);
		this.insertionPoints = {};


		console.log(this.node);

		this.processInsertionPoints(this.node);

		this.updateIPValues(data.data);

		if(data.destination){
			this.destination = data.destination;

			data.destination.appendChild(this.node);
		}
	}

	TemplateInstance.prototype.updateIPValues = function(data){
		for(var key in data){
			console.log('updating: ', key);
			if(this.insertionPoints[key]){
				this.insertionPoints[key].updateIPValue(data[key]);	
			}
		}
	}

	function InsertionPoint(data){
		for(var key in data){
			this[key] = data[key];
		}
	}

	InsertionPoint.prototype.updateIPValue = function(val){
		this.updateIPValueCallback.call(this, val);
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

	return new Templates();
});