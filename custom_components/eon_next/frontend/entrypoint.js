function e(e,t,s,a){var i,r=arguments.length,n=r<3?t:null===a?a=Object.getOwnPropertyDescriptor(t,s):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,s,a);else for(var o=e.length-1;o>=0;o--)(i=e[o])&&(n=(r<3?i(n):r>3?i(t,s,n):i(t,s))||n);return r>3&&n&&Object.defineProperty(t,s,n),n}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,s=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,a=Symbol(),i=new WeakMap;let r=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(s&&void 0===e){const s=void 0!==t&&1===t.length;s&&(e=i.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&i.set(t,e))}return e}toString(){return this.cssText}};const n=(e,...t)=>{const s=1===e.length?e[0]:t.reduce((t,s,a)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+e[a+1],e[0]);return new r(s,e,a)},o=s?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const s of e.cssRules)t+=s.cssText;return(e=>new r("string"==typeof e?e:e+"",void 0,a))(t)})(e):e,{is:l,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,g=globalThis,f=g.trustedTypes,v=f?f.emptyScript:"",m=g.reactiveElementPolyfillSupport,b=(e,t)=>e,y={toAttribute(e,t){switch(t){case Boolean:e=e?v:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let s=e;switch(t){case Boolean:s=null!==e;break;case Number:s=null===e?null:Number(e);break;case Object:case Array:try{s=JSON.parse(e)}catch(e){s=null}}return s}},x=(e,t)=>!l(e,t),_={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const s=Symbol(),a=this.getPropertyDescriptor(e,s,t);void 0!==a&&d(this.prototype,e,a)}}static getPropertyDescriptor(e,t,s){const{get:a,set:i}=c(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:a,set(t){const r=a?.call(this);i?.call(this,t),this.requestUpdate(e,r,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const e=u(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const e=this.properties,t=[...h(e),...p(e)];for(const s of t)this.createProperty(s,e[s])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,s]of t)this.elementProperties.set(e,s)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const s=this._$Eu(e,t);void 0!==s&&this._$Eh.set(s,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const s=new Set(e.flat(1/0).reverse());for(const e of s)t.unshift(o(e))}else void 0!==e&&t.push(o(e));return t}static _$Eu(e,t){const s=t.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,a)=>{if(s)e.adoptedStyleSheets=a.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const s of a){const a=document.createElement("style"),i=t.litNonce;void 0!==i&&a.setAttribute("nonce",i),a.textContent=s.cssText,e.appendChild(a)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){const s=this.constructor.elementProperties.get(e),a=this.constructor._$Eu(e,s);if(void 0!==a&&!0===s.reflect){const i=(void 0!==s.converter?.toAttribute?s.converter:y).toAttribute(t,s.type);this._$Em=e,null==i?this.removeAttribute(a):this.setAttribute(a,i),this._$Em=null}}_$AK(e,t){const s=this.constructor,a=s._$Eh.get(e);if(void 0!==a&&this._$Em!==a){const e=s.getPropertyOptions(a),i="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:y;this._$Em=a;const r=i.fromAttribute(t,e.type);this[a]=r??this._$Ej?.get(a)??r,this._$Em=null}}requestUpdate(e,t,s,a=!1,i){if(void 0!==e){const r=this.constructor;if(!1===a&&(i=this[e]),s??=r.getPropertyOptions(e),!((s.hasChanged??x)(i,t)||s.useDefault&&s.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,s))))return;this.C(e,t,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:a,wrapped:i},r){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),!0!==i||void 0!==r)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),!0===a&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,s]of e){const{wrapped:e}=s,a=this[t];!0!==e||this._$AL.has(t)||void 0===a||this.C(t,void 0,s,a)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,m?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,k=e=>e,C=w.trustedTypes,A=C?C.createPolicy("lit-html",{createHTML:e=>e}):void 0,S="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,E="?"+T,z=`<${E}>`,N=document,D=()=>N.createComment(""),M=e=>null===e||"object"!=typeof e&&"function"!=typeof e,P=Array.isArray,H="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,O=/>/g,j=RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),L=/'/g,F=/"/g,B=/^(?:script|style|textarea|title)$/i,I=(e=>(t,...s)=>({_$litType$:e,strings:t,values:s}))(1),q=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),V=new WeakMap,Y=N.createTreeWalker(N,129);function G(e,t){if(!P(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(t):t}const K=(e,t)=>{const s=e.length-1,a=[];let i,r=2===t?"<svg>":3===t?"<math>":"",n=U;for(let t=0;t<s;t++){const s=e[t];let o,l,d=-1,c=0;for(;c<s.length&&(n.lastIndex=c,l=n.exec(s),null!==l);)c=n.lastIndex,n===U?"!--"===l[1]?n=R:void 0!==l[1]?n=O:void 0!==l[2]?(B.test(l[2])&&(i=RegExp("</"+l[2],"g")),n=j):void 0!==l[3]&&(n=j):n===j?">"===l[0]?(n=i??U,d=-1):void 0===l[1]?d=-2:(d=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?j:'"'===l[3]?F:L):n===F||n===L?n=j:n===R||n===O?n=U:(n=j,i=void 0);const h=n===j&&e[t+1].startsWith("/>")?" ":"";r+=n===U?s+z:d>=0?(a.push(o),s.slice(0,d)+S+s.slice(d)+T+h):s+T+(-2===d?t:h)}return[G(e,r+(e[s]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),a]};class J{constructor({strings:e,_$litType$:t},s){let a;this.parts=[];let i=0,r=0;const n=e.length-1,o=this.parts,[l,d]=K(e,t);if(this.el=J.createElement(l,s),Y.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(a=Y.nextNode())&&o.length<n;){if(1===a.nodeType){if(a.hasAttributes())for(const e of a.getAttributeNames())if(e.endsWith(S)){const t=d[r++],s=a.getAttribute(e).split(T),n=/([.?@])?(.*)/.exec(t);o.push({type:1,index:i,name:n[2],strings:s,ctor:"."===n[1]?te:"?"===n[1]?se:"@"===n[1]?ae:ee}),a.removeAttribute(e)}else e.startsWith(T)&&(o.push({type:6,index:i}),a.removeAttribute(e));if(B.test(a.tagName)){const e=a.textContent.split(T),t=e.length-1;if(t>0){a.textContent=C?C.emptyScript:"";for(let s=0;s<t;s++)a.append(e[s],D()),Y.nextNode(),o.push({type:2,index:++i});a.append(e[t],D())}}}else if(8===a.nodeType)if(a.data===E)o.push({type:2,index:i});else{let e=-1;for(;-1!==(e=a.data.indexOf(T,e+1));)o.push({type:7,index:i}),e+=T.length-1}i++}}static createElement(e,t){const s=N.createElement("template");return s.innerHTML=e,s}}function Z(e,t,s=e,a){if(t===q)return t;let i=void 0!==a?s._$Co?.[a]:s._$Cl;const r=M(t)?void 0:t._$litDirective$;return i?.constructor!==r&&(i?._$AO?.(!1),void 0===r?i=void 0:(i=new r(e),i._$AT(e,s,a)),void 0!==a?(s._$Co??=[])[a]=i:s._$Cl=i),void 0!==i&&(t=Z(e,i._$AS(e,t.values),i,a)),t}class Q{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:s}=this._$AD,a=(e?.creationScope??N).importNode(t,!0);Y.currentNode=a;let i=Y.nextNode(),r=0,n=0,o=s[0];for(;void 0!==o;){if(r===o.index){let t;2===o.type?t=new X(i,i.nextSibling,this,e):1===o.type?t=new o.ctor(i,o.name,o.strings,this,e):6===o.type&&(t=new ie(i,this,e)),this._$AV.push(t),o=s[++n]}r!==o?.index&&(i=Y.nextNode(),r++)}return Y.currentNode=N,a}p(e){let t=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,a){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=a,this._$Cv=a?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Z(this,e,t),M(e)?e===W||null==e||""===e?(this._$AH!==W&&this._$AR(),this._$AH=W):e!==this._$AH&&e!==q&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>P(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==W&&M(this._$AH)?this._$AA.nextSibling.data=e:this.T(N.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:s}=e,a="number"==typeof s?this._$AC(e):(void 0===s.el&&(s.el=J.createElement(G(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===a)this._$AH.p(t);else{const e=new Q(a,this),s=e.u(this.options);e.p(t),this.T(s),this._$AH=e}}_$AC(e){let t=V.get(e.strings);return void 0===t&&V.set(e.strings,t=new J(e)),t}k(e){P(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let s,a=0;for(const i of e)a===t.length?t.push(s=new X(this.O(D()),this.O(D()),this,this.options)):s=t[a],s._$AI(i),a++;a<t.length&&(this._$AR(s&&s._$AB.nextSibling,a),t.length=a)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=k(e).nextSibling;k(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,a,i){this.type=1,this._$AH=W,this._$AN=void 0,this.element=e,this.name=t,this._$AM=a,this.options=i,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=W}_$AI(e,t=this,s,a){const i=this.strings;let r=!1;if(void 0===i)e=Z(this,e,t,0),r=!M(e)||e!==this._$AH&&e!==q,r&&(this._$AH=e);else{const a=e;let n,o;for(e=i[0],n=0;n<i.length-1;n++)o=Z(this,a[s+n],t,n),o===q&&(o=this._$AH[n]),r||=!M(o)||o!==this._$AH[n],o===W?e=W:e!==W&&(e+=(o??"")+i[n+1]),this._$AH[n]=o}r&&!a&&this.j(e)}j(e){e===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===W?void 0:e}}class se extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==W)}}class ae extends ee{constructor(e,t,s,a,i){super(e,t,s,a,i),this.type=5}_$AI(e,t=this){if((e=Z(this,e,t,0)??W)===q)return;const s=this._$AH,a=e===W&&s!==W||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,i=e!==W&&(s===W||a);a&&this.element.removeEventListener(this.name,this,s),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ie{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){Z(this,e)}}const re=w.litHtmlPolyfillSupport;re?.(J,X),(w.litHtmlVersions??=[]).push("3.3.2");const ne=globalThis;class oe extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,s)=>{const a=s?.renderBefore??t;let i=a._$litPart$;if(void 0===i){const e=s?.renderBefore??null;a._$litPart$=i=new X(t.insertBefore(D(),e),e,void 0,s??{})}return i._$AI(e),i})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return q}}oe._$litElement$=!0,oe.finalized=!0,ne.litElementHydrateSupport?.({LitElement:oe});const le=ne.litElementPolyfillSupport;le?.({LitElement:oe}),(ne.litElementVersions??=[]).push("4.2.2");const de={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:x},ce=(e=de,t,s)=>{const{kind:a,metadata:i}=s;let r=globalThis.litPropertyMetadata.get(i);if(void 0===r&&globalThis.litPropertyMetadata.set(i,r=new Map),"setter"===a&&((e=Object.create(e)).wrapped=!0),r.set(s.name,e),"accessor"===a){const{name:a}=s;return{set(s){const i=t.get.call(this);t.set.call(this,s),this.requestUpdate(a,i,e,!0,s)},init(t){return void 0!==t&&this.C(a,void 0,e,t),t}}}if("setter"===a){const{name:a}=s;return function(s){const i=this[a];t.call(this,s),this.requestUpdate(a,i,e,!0,s)}}throw Error("Unsupported decorator location: "+a)};function he(e){return(t,s)=>"object"==typeof s?ce(e,t,s):((e,t,s)=>{const a=t.hasOwnProperty(s);return t.constructor.createProperty(s,e),a?Object.getOwnPropertyDescriptor(t,s):void 0})(e,t,s)}function pe(e){return he({...e,state:!0,attribute:!1})}async function ue(e){return e.callWS({type:"eon_next/backfill_status"})}async function ge(e,t,s=7){return e.callWS({type:"eon_next/consumption_history",meter_serial:t,days:s})}class fe{constructor(e,t){this._host=e,this._fetcher=t,this.data=null,this.loading=!0,this.refreshing=!1,this.error=null,this._requestSeq=0,this._lastConnection=void 0,this._started=!1,this._host.addController(this)}hostConnected(){this._startTimer()}hostUpdated(){const e=this._host.hass;e&&(this._started?this._lastConnection!==e.connection&&(this._lastConnection=e.connection,this._fetch(e)):(this._started=!0,this._fetch(e)))}async refresh(){const e=this._host.hass;e&&await this._fetch(e)}_startTimer(){this._stopTimer(),this._timer=setInterval(()=>{const e=this._host.hass;e&&this._fetch(e)},3e5)}_stopTimer(){void 0!==this._timer&&(clearInterval(this._timer),this._timer=void 0)}async _fetch(e){const t=++this._requestSeq;this._lastConnection=e.connection,null===this.data?this.loading=!0:this.refreshing=!0,this.error=null,this._host.requestUpdate();try{const s=await this._fetcher(e);if(t!==this._requestSeq)return;this.data=s}catch(e){if(t!==this._requestSeq)return;this.error=e instanceof Error?e.message:String(e)}finally{t===this._requestSeq&&(this.loading=!1,this.refreshing=!1,this._host.requestUpdate())}}hostDisconnected(){this._stopTimer(),this._requestSeq++,this.data=null,this.loading=!0,this.refreshing=!1,this._lastConnection=void 0,this._started=!1}}function ve(e,t){return e?e.meters.find(e=>me(e.type)===t)??null:null}function me(e){return"gas"===e?"gas":"electricity"}const be={electricity:{label:"Electricity",icon:"mdi:lightning-bolt",tileClass:"tile--elec",usageColor:"var(--eon-elec)",standColor:"var(--eon-elec-standing)"},gas:{label:"Gas",icon:"mdi:fire",tileClass:"tile--gas",usageColor:"var(--eon-gas)",standColor:"var(--eon-gas-standing)"}};function ye(e,t){if(!e)return{rate:null,validFrom:null,validTo:null};switch(t){case"current":return{rate:e.unit_rate,validFrom:e.unit_rate_valid_from,validTo:e.unit_rate_valid_to};case"previous":return{rate:e.previous_unit_rate,validFrom:e.previous_unit_rate_valid_from,validTo:e.previous_unit_rate_valid_to};case"next":return{rate:e.next_unit_rate,validFrom:e.next_unit_rate_valid_from,validTo:e.next_unit_rate_valid_to}}}function xe(e){return e?.is_time_of_use??!1}function _e(e,t=2){return null!=e&&Number.isFinite(e)?`£${e.toFixed(t)}`:"-"}function $e(e,t=2){return null!=e&&Number.isFinite(e)?`${(100*e).toFixed(t)}p`:"-"}function we(e){return null!=e&&Number.isFinite(e)?`£${e.toFixed(4)}`:"-"}function ke(e,t="en"){if(!e)return"-";const s=new Date(e.length<=10?`${e}T00:00:00`:e);return isNaN(s.getTime())?e:s.toLocaleDateString(t,{day:"numeric",month:"short"})}function Ce(e,t,s,a,i="en"){const r=t??0,n=s??0,o=e.map(e=>({date:e.date,usageCost:Math.max(0,e.consumption)*r,standCost:n})),l=Math.max(1e-4,...o.map(e=>e.usageCost+e.standCost));return o.map((t,s)=>({usagePct:t.usageCost/l*100,standPct:t.standCost/l*100,usageCost:t.usageCost,standCost:t.standCost,label:Ae(t.date,s,e.length,a,i)}))}function Ae(e,t,s,a,i){const r=new Date(`${e}T00:00:00`);if(isNaN(r.getTime()))return"";if(a<=14)return r.toLocaleDateString(i,{weekday:"short"});return t%(a<=31?5:15)!==0&&t!==s-1?"":r.toLocaleDateString(i,{day:"numeric",month:"short"})}function Se(e,t,s,a){const i=t??0,r=s??0,n=a.getFullYear(),o=a.getMonth(),l=new Date(n,o-1,1),d=l.getFullYear(),c=l.getMonth();let h=0,p=0,u=0,g=0;for(const t of e){const e=new Date(`${t.date}T00:00:00`);if(isNaN(e.getTime()))continue;const s=Math.max(0,t.consumption)*i+r;e.getFullYear()===n&&e.getMonth()===o?(h+=s,p++):e.getFullYear()===d&&e.getMonth()===c&&(u+=s,g++)}return{monthToDate:Te(h),daysWithData:p,previousMonth:g>0?Te(u):null}}function Te(e){return Math.round(100*e)/100}const Ee=[{page:"overview",label:"Overview",icon:"mdi:view-grid-outline"},{page:"elec",label:"Electricity",icon:"mdi:lightning-bolt"},{page:"gas",label:"Gas",icon:"mdi:fire"},{page:"tariff",label:"Tariff & rates",icon:"mdi:tag-outline"},{page:"ev",label:"EV charging",icon:"mdi:ev-station"}],ze={overview:"Overview",elec:"Electricity",gas:"Gas",tariff:"Tariff & rates",ev:"EV charging",settings:"Settings"},Ne=n`/*
 * Design tokens for the redesigned EON Next dashboard.
 *
 * These are the final, brand-specific colours, radii and fonts from the design
 * handoff. They are intentionally NOT wired to HA theme variables: the dashboard
 * is a self-contained branded surface (warm cream + terracotta) that should read
 * the same regardless of the host theme.
 *
 * Custom properties inherit through shadow-DOM boundaries, so defining them on
 * every dashboard component's :host keeps each component self-sufficient.
 *
 * box-sizing does NOT cross shadow boundaries, so it is reset here - in the one
 * file every dashboard component imports - rather than relying on the host page.
 * The layout is authored for border-box (e.g. a 238px rail with 16px padding, a
 * width:100% content column with 40px padding); without this reset those paddings
 * add to the widths and the panel overflows its host by ~80px, which only shows
 * once HA offsets it behind the 256px sidebar.
 */

:host,
*,
*::before,
*::after {
  box-sizing: border-box;
}

:host {
  /* Surfaces */
  --eon-bg: #efe9df;
  --eon-dark: #26221f;
  --eon-dark-inner: #322c27;
  --eon-dark-pill: #3a342e;
  --eon-card: #faf7f1;
  --eon-card-border: #eadfce;
  --eon-hairline: #e2dacc;
  --eon-hairline-soft: #eee4d3;
  --eon-track: #efe6d7;

  /* Text */
  --eon-text: #2a2521;
  --eon-muted: #8a8178;
  --eon-faint: #a99e92;
  --eon-subtle: #6b625a;
  --eon-on-dark: #f4efe7;
  --eon-on-dark-muted: #b0a596;
  --eon-on-dark-faint: #8f857b;

  /* Fuel + accents */
  --eon-elec: #c4623d;
  --eon-elec-standing: #b79b6f;
  --eon-elec-tile: #f6e3da;
  --eon-gas: #b8863f;
  --eon-gas-standing: #d8c69a;
  --eon-gas-tile: #f4ead6;
  --eon-accent-on-dark: #e6b78c;

  /* Green (credit / healthy / charging) */
  --eon-green: #4f7a52;
  --eon-green-light: #8fbf93;
  --eon-green-bg: #eaf1e9;
  --eon-green-text: #3f6a43;
  --eon-green-ready-bg: #2f4a35;

  /* Amber callout */
  --eon-amber-bg: #f6eede;
  --eon-amber-text: #8a6a3a;

  /* Fonts (loaded into document.head by the panel; graceful fallbacks) */
  --eon-font-ui: 'Figtree', 'Segoe UI', Roboto, system-ui, sans-serif;
  --eon-font-serif: 'Newsreader', Georgia, 'Times New Roman', serif;
  --eon-font-mono: 'Space Mono', 'SF Mono', ui-monospace, monospace;

  /* Radii */
  --eon-radius-card: 18px;
  --eon-radius-stat: 16px;
  --eon-radius-pill: 20px;
  --eon-radius-control: 12px;
  --eon-radius-tile: 10px;
}
`,De=n`:host {
  display: block;
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 5px;
}

.col {
  flex: 1;
  display: flex;
  justify-content: center;
  height: 100%;
  margin-inline: auto;
}

.stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
}

.seg {
  min-height: 1px;
}

.seg--usage {
  border-radius: 3px 3px 0 0;
}

.seg--stand {
  min-height: 2px;
}

.labels {
  display: flex;
  gap: 5px;
  margin-top: 8px;
}

.label {
  flex: 1;
  text-align: center;
  font-size: 10px;
  color: var(--eon-faint);
  font-family: var(--eon-font-mono);
  /* Labels are sparse for dense ranges (every 5th/15th bar), so let a label
     spill into its empty neighbours rather than clip to one thin bar slot -
     otherwise 30d/90d date labels get chopped to a single character. */
  overflow: visible;
  white-space: nowrap;
}
`;class Me extends oe{constructor(){super(...arguments),this.bars=[],this.usageColor="var(--eon-elec)",this.standColor="var(--eon-elec-standing)",this.height=240,this.maxBarWidth=22,this.showLabels=!0}render(){return I`
      <div
        class="bars"
        style="height:${this.height}px"
        role="img"
        aria-label="Daily cost - energy used stacked on the standing charge"
      >
        ${this.bars.map(e=>this._renderBar(e))}
      </div>
      ${this.showLabels?I`<div class="labels">
              ${this.bars.map(e=>I`<span class="label">${e.label}</span>`)}
            </div>`:W}
    `}_renderBar(e){const t=`${_e(e.usageCost+e.standCost)} · usage ${_e(e.usageCost)} + standing ${_e(e.standCost)}`;return I`
      <div class="col" style="max-width:${this.maxBarWidth}px" title=${t}>
        <div class="stack">
          <div
            class="seg seg--usage"
            style="height:${e.usagePct}%;background:${this.usageColor}"
          ></div>
          <div
            class="seg seg--stand"
            style="height:${e.standPct}%;background:${this.standColor}"
          ></div>
        </div>
      </div>
    `}}Me.styles=[Ne,De],e([he({type:Array})],Me.prototype,"bars",void 0),e([he()],Me.prototype,"usageColor",void 0),e([he()],Me.prototype,"standColor",void 0),e([he({type:Number})],Me.prototype,"height",void 0),e([he({type:Number})],Me.prototype,"maxBarWidth",void 0),e([he({type:Boolean})],Me.prototype,"showLabels",void 0),customElements.get("eon-stacked-bar-chart")||customElements.define("eon-stacked-bar-chart",Me);const Pe=n`/* Shared building blocks for the redesigned dashboard pages. */

:host {
  display: block;
  color: var(--eon-text);
  font-family: var(--eon-font-ui);
}

.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* --- Cards --- */

.card {
  background: var(--eon-card);
  border: 1px solid var(--eon-card-border);
  border-radius: var(--eon-radius-card);
  padding: 22px 24px;
}

.card--dark {
  background: var(--eon-dark);
  border: none;
  color: var(--eon-on-dark);
}

.card--stat {
  border-radius: var(--eon-radius-stat);
  padding: 18px 20px;
}

.card--clickable {
  cursor: pointer;
  text-align: left;
  width: 100%;
  font: inherit;
  color: inherit;
}

/* A clickable dark card keeps its light text: the generic \`color: inherit\`
   above would otherwise pull in the page's dark text. */
.card--dark.card--clickable {
  color: var(--eon-on-dark);
}

.card--clickable:focus-visible {
  outline: 2px solid var(--eon-elec);
  outline-offset: 2px;
}

/* --- Typographic helpers --- */

.serif {
  font-family: var(--eon-font-serif);
  font-weight: 400;
}

.mono {
  font-family: var(--eon-font-mono);
}

.eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--eon-on-dark-muted);
}

.muted {
  color: var(--eon-muted);
}

.faint {
  color: var(--eon-faint);
}

/* --- Pills / badges --- */

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--eon-radius-pill);
  padding: 5px 11px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.pill--dark {
  background: var(--eon-dark-pill);
  color: var(--eon-accent-on-dark);
  font-weight: 500;
}

.pill--green {
  background: var(--eon-green-bg);
  color: var(--eon-green-text);
}

.pill--ready {
  background: var(--eon-green-ready-bg);
  color: var(--eon-green-light);
  font-weight: 700;
  padding: 7px 15px;
}

/* --- Status dot --- */

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--eon-green);
  flex: 0 0 auto;
}

/* --- Legend --- */

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 12px;
  color: var(--eon-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-swatch {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex: 0 0 auto;
}

/* --- Amber callout --- */

.callout {
  font-size: 14px;
  color: var(--eon-amber-text);
  background: var(--eon-amber-bg);
  border-radius: var(--eon-radius-tile);
  padding: 11px 14px;
}

/* --- Icon tiles --- */

.tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  flex: 0 0 auto;
}

.tile--elec {
  background: var(--eon-elec-tile);
  color: var(--eon-elec);
}

.tile--gas {
  background: var(--eon-gas-tile);
  color: var(--eon-gas);
}

/* --- Stat number --- */

.stat-label {
  font-size: 12px;
  color: var(--eon-muted);
}

.stat-value {
  font-family: var(--eon-font-serif);
  font-weight: 400;
  font-size: 26px;
  margin-top: 4px;
  line-height: 1.1;
}

.stat-sub {
  font-size: 11px;
  color: var(--eon-faint);
}

/* --- Grids --- */

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 720px) {
  .grid-2,
  .grid-4 {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 460px) {
  .grid-2,
  .grid-4 {
    grid-template-columns: 1fr;
  }
}

/* --- Loading / empty --- */

.placeholder {
  color: var(--eon-faint);
  font-size: 14px;
  padding: 24px 0;
  text-align: center;
}
`,He=n`.greeting {
  font-size: 13px;
  color: var(--eon-muted);
  margin-top: -6px;
}

.accent {
  color: var(--eon-accent-on-dark);
}

.accent-green {
  color: var(--eon-green);
}

/* --- Hero --- */

.hero {
  padding: 30px 32px;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 30px;
  flex-wrap: wrap;
}

.hero-label {
  font-size: 14px;
}

.hero-total {
  font-size: 58px;
  line-height: 1;
  margin-top: 8px;
}

.hero-sub {
  font-size: 14px;
  color: var(--eon-subtle);
  margin-top: 8px;
}

.projection {
  text-align: right;
}

.proj-label {
  font-size: 13px;
}

.proj-value {
  font-size: 30px;
}

.proj-pill {
  margin-top: 8px;
}

.hero-split {
  margin-top: 26px;
}

.split-bar {
  display: flex;
  height: 14px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--eon-track);
}

.split-seg {
  height: 100%;
}

.split-legend {
  margin-top: 12px;
  font-size: 13px;
  color: var(--eon-subtle);
  gap: 22px;
}

.split-val {
  color: var(--eon-text);
}

.hero-callout {
  margin-top: 14px;
}

/* --- Fuel cards --- */

.fuel-card {
  display: flex;
  flex-direction: column;
}

.fuel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.fuel-name {
  display: flex;
  align-items: center;
  gap: 9px;
}

.fuel-name .tile {
  width: 30px;
  height: 30px;
}

.fuel-label {
  font-weight: 700;
  font-size: 15px;
}

.fuel-serial {
  font-size: 11px;
  color: var(--eon-faint);
}

.fuel-cost {
  font-size: 22px;
}

.fuel-chart,
.fuel-chart-empty {
  height: 88px;
}

.fuel-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 13px;
}

/* --- Tariff + health row --- */

.tariff-health {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
}

@media (max-width: 720px) {
  .tariff-health {
    grid-template-columns: 1fr;
  }
}

.tariff-card {
  padding: 22px 26px;
}

.tariff-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.tariff-name {
  font-size: 23px;
  margin-top: 6px;
}

.tariff-stats {
  display: flex;
  gap: 34px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.tariff-stat-value {
  font-size: 20px;
  font-weight: 700;
}

.tariff-stat-label {
  font-size: 12px;
  color: var(--eon-on-dark-muted);
  margin-top: 2px;
}

.tariff-note {
  border-left: 1px solid var(--eon-dark-pill);
  padding-left: 20px;
}

.tariff-note .accent {
  font-size: 13px;
}

/* --- Health card --- */

.health-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-title {
  font-size: 14px;
  font-weight: 700;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--eon-green);
}

.health-row {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 13px;
}

.health-value {
  color: var(--eon-text);
  font-weight: 600;
}

.health-backfill {
  margin-top: 14px;
}

.health-backfill-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 5px;
}

.progress {
  height: 6px;
  background: var(--eon-track);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--eon-green);
}
`;class Ue extends oe{constructor(){super(...arguments),this.summary=null,this.refreshToken=0,this.showProjection=!0,this.showStandingCallout=!0,this.showMeterHealth=!0,this._history={},this._backfill=new fe(this,e=>ue(e)),this._fetchedToken=-1,this._fetching=new Set}updated(){if(!this.hass||!this.summary)return;this.refreshToken!==this._fetchedToken&&(this._fetchedToken=this.refreshToken,this._history={},this._fetching.clear());const e=(new Date).getDate(),t=Math.min(62,e+31);for(const e of this.summary.meters){const s=e.serial;!s||this._history[s]||this._fetching.has(s)||this._fetch(s,t)}}async _fetch(e,t){this._fetching.add(e);try{const s=await ge(this.hass,e,t);this._history={...this._history,[e]:s.entries}}catch{this._history={...this._history,[e]:[]}}finally{this._fetching.delete(e)}}_split(e){return e?.serial?function(e,t,s,a){const i=t??0,r=s??0,n=a.getFullYear(),o=a.getMonth();let l=0,d=0,c=0;for(const t of e){const e=new Date(`${t.date}T00:00:00`);isNaN(e.getTime())||e.getFullYear()===n&&e.getMonth()===o&&(l+=Math.max(0,t.consumption)*i,d+=r,c++)}return{usage:Te(l),standing:Te(d),total:Te(l+d),days:c}}(this._history[e.serial]??[],e.unit_rate,e.standing_charge,new Date):{usage:0,standing:0,total:0,days:0}}_nav(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{page:e},bubbles:!0,composed:!0}))}render(){if(!this.summary)return I`<div class="placeholder">Loading…</div>`;const e=new Date,t=this.hass?.language??"en",s=ve(this.summary,"electricity"),a=ve(this.summary,"gas"),i=this._split(s),r=this._split(a),n=Te(i.usage+r.usage),o=Te(i.standing+r.standing),l=Te(n+o),d=e.toLocaleDateString(t,{month:"long"}),c=Math.max(i.days,r.days,e.getDate()),h=c>0?Te(l/c):0;return I`
      <div class="page">
        <div class="greeting">
          ${function(e){const t=e.getHours();return t<12?"Good morning":t<18?"Good afternoon":"Good evening"}(e)} ·
          ${e.toLocaleDateString(t,{weekday:"long",day:"numeric",month:"long"})}
        </div>

        ${this._renderHero(d,l,n,o,c,h)}
        ${this._renderFuelCards(s,i,a,r)}
        ${this._renderTariffAndHealth(s,a)}
      </div>
    `}_renderHero(e,t,s,a,i,r){const n=t>0?s/t*100:0,o=t>0?a/t*100:0,l=t>0?a/t:0;return I`
      <div class="card hero">
        <div class="hero-top">
          <div>
            <div class="muted hero-label">
              Spent so far in ${e} · gas + electricity
            </div>
            <div class="serif hero-total">${_e(t)}</div>
            <div class="hero-sub">
              ${i} day${1===i?"":"s"} in · about
              <b>${_e(r)}</b> a day
            </div>
          </div>
          ${this._renderProjection(t)}
        </div>

        <div class="hero-split">
          <div class="split-bar" role="img" aria-label="Usage versus standing charge">
            <div
              class="split-seg"
              style="width:${n}%;background:var(--eon-elec)"
            ></div>
            <div
              class="split-seg"
              style="width:${o}%;background:var(--eon-elec-standing)"
            ></div>
          </div>
          <div class="legend split-legend">
            <span class="legend-item">
              <span class="legend-swatch" style="background:var(--eon-elec)"></span>
              Energy used <b class="split-val">${_e(s)}</b>
            </span>
            <span class="legend-item">
              <span
                class="legend-swatch"
                style="background:var(--eon-elec-standing)"
              ></span>
              Standing charge <b class="split-val">${_e(a)}</b>
            </span>
          </div>
          ${this.showStandingCallout&&l>=.4&&a>0?I`<div class="callout hero-callout">
                  ${l>=.5?"Over half":"A large part"} of this month's bill
                  -
                  <b>${_e(a)}</b> - is the fixed daily standing charge
                  you pay before using anything.
                </div>`:W}
        </div>
      </div>
    `}_renderProjection(e){if(!this.showProjection)return W;const t=new Date,s=function(e,t){const s=t.getDate(),a=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();return s<=0?e:Te(e/s*a)}(e,t),a=this.summary?.meters??[];let i=0,r=a.length>0;for(const e of a){const s=e.serial?this._history[e.serial]??null:null,a=s?Se(s,e.unit_rate,e.standing_charge,t).previousMonth:null;if(null==a){r=!1;break}i+=a}const n=r?Te(s-Te(i)):null;return I`
      <div class="projection">
        <div class="muted proj-label">On track for</div>
        <div class="serif proj-value">~${_e(s)}</div>
        ${null!=n?I`<span class="pill pill--green proj-pill">
                ${n<=0?"▼":"▲"} ${_e(Math.abs(n))} vs last month
              </span>`:W}
      </div>
    `}_renderFuelCards(e,t,s,a){return I`
      <div class="grid-2">
        ${this._renderFuelCard("electricity",e,t)}
        ${this._renderFuelCard("gas",s,a)}
      </div>
    `}_renderFuelCard(e,t,s){const a=be[e];if(!t)return I`<div class="card fuel-card">
        <div class="muted">No ${a.label.toLowerCase()} meter.</div>
      </div>`;const i=Ce((t.serial?this._history[t.serial]??[]:[]).slice(-7),t.unit_rate,t.standing_charge,7,this.hass?.language??"en");return I`
      <button
        class="card fuel-card card--clickable"
        @click=${()=>this._nav("gas"===e?"gas":"elec")}
      >
        <div class="fuel-head">
          <div class="fuel-name">
            <span class="tile ${a.tileClass}">
              <ha-icon .icon=${a.icon} style="--mdc-icon-size:16px"></ha-icon>
            </span>
            <div>
              <div class="fuel-label">${a.label}</div>
              <div class="mono fuel-serial">${t.serial??"-"}</div>
            </div>
          </div>
          <div class="serif fuel-cost">${_e(s.total)}</div>
        </div>
        ${i.length?I`<eon-stacked-bar-chart
                class="fuel-chart"
                .bars=${i}
                usageColor=${a.usageColor}
                standColor=${a.standColor}
                .height=${88}
                .maxBarWidth=${13}
                .showLabels=${!1}
              ></eon-stacked-bar-chart>`:I`<div class="fuel-chart-empty"></div>`}
        <div class="fuel-foot muted">
          <span>${$e(t.unit_rate)} /kWh</span>
          <span>${$e(t.standing_charge,0)} /day standing</span>
        </div>
      </button>
    `}_renderTariffAndHealth(e,t){return I`
      <div class="tariff-health">
        ${this._renderTariffCard(e,t)}
        ${this.showMeterHealth?this._renderHealthCard(e??t):W}
      </div>
    `}_renderTariffCard(e,t){const s=e?.tariff_name??t?.tariff_name??"Tariff unavailable",a=xe(e)||xe(t);return I`
      <button
        class="card card--dark tariff-card card--clickable"
        @click=${()=>this._nav("tariff")}
      >
        <div class="tariff-head">
          <div>
            <div class="eyebrow">Your tariff</div>
            <div class="serif tariff-name">${s}</div>
          </div>
          <span class="pill pill--dark">${a?"Time-of-use":"Flat rate"}</span>
        </div>
        <div class="tariff-stats">
          <div>
            <div class="tariff-stat-value">${we(e?.unit_rate)}</div>
            <div class="tariff-stat-label">Electricity /kWh</div>
          </div>
          <div>
            <div class="tariff-stat-value">${we(t?.unit_rate)}</div>
            <div class="tariff-stat-label">Gas /kWh</div>
          </div>
          <div class="tariff-note">
            <div class="accent">
              ${a?"Off-peak window available":"No cheaper window today"}
            </div>
            <div class="tariff-stat-label">
              ${a?"shift usage to save":"same price around the clock"}
            </div>
          </div>
        </div>
      </button>
    `}_renderHealthCard(e){const t=this.hass?.language??"en",s=this._backfill.data,a=s&&s.total_meters>0?Math.round(s.completed_meters/s.total_meters*100):!1===s?.enabled?0:100,i=this.summary?.meters.length??0,r=null!=e?.latest_reading?`${e.latest_reading.toLocaleString(t)} · ${ke(e.latest_reading_date,t)}`:"-";return I`
      <div class="card health-card">
        <div class="health-head">
          <div class="health-title">Meter health</div>
          <span class="health-status"> <span class="dot"></span>All healthy </span>
        </div>
        <div class="health-row">
          <span class="muted">Latest reading</span>
          <span class="health-value">${r}</span>
        </div>
        <div class="health-row">
          <span class="muted">Data completeness</span>
          <span class="health-value accent-green"
            >100% · ${i} meter${1===i?"":"s"}</span
          >
        </div>
        <div class="health-backfill">
          <div class="health-backfill-head faint">
            <span>Historical backfill</span>
            <span>${a}%${a>=100?" · done":""}</span>
          </div>
          <div class="progress">
            <div class="progress-fill" style="width:${a}%"></div>
          </div>
        </div>
      </div>
    `}}Ue.styles=[Ne,Pe,He],e([he({attribute:!1})],Ue.prototype,"hass",void 0),e([he({attribute:!1})],Ue.prototype,"summary",void 0),e([he({type:Number})],Ue.prototype,"refreshToken",void 0),e([he({type:Boolean})],Ue.prototype,"showProjection",void 0),e([he({type:Boolean})],Ue.prototype,"showStandingCallout",void 0),e([he({type:Boolean})],Ue.prototype,"showMeterHealth",void 0),e([pe()],Ue.prototype,"_history",void 0),customElements.get("eon-overview-page")||customElements.define("eon-overview-page",Ue);const Re=n`.range-picker {
  display: inline-flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--eon-divider);
}

.range-btn {
  all: unset;
  cursor: pointer;
  padding: 4px 12px;
  font-size: 0.8em;
  font-weight: 500;
  color: var(--eon-text-secondary);
  background: transparent;
  border-right: 1px solid var(--eon-divider);
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.range-btn:last-child {
  border-right: none;
}

.range-btn:hover {
  background: var(--eon-divider);
}

.range-btn:focus-visible {
  outline: 2px solid var(--eon-primary);
  outline-offset: -2px;
}

/* Prefer the dashboard's dark brand colour when present (the panel pages), so
   the selected range reads clearly on the warm-cream surface. Falls back to the
   HA-theme primary in the legacy Lovelace cards, which don't define --eon-dark. */
.range-btn.active {
  background: var(--eon-dark, var(--eon-primary));
  color: var(--eon-on-dark, #fff);
}
`,Oe=[{label:"7d",value:7},{label:"30d",value:30},{label:"90d",value:90},{label:"1y",value:365}];class je extends oe{constructor(){super(...arguments),this.value=7,this.options=Oe}render(){const e=this.options.findIndex(e=>e.value===this.value),t=e>=0?e:0;return I`
      <div class="range-picker" role="radiogroup" aria-label="Time range">
        ${this.options.map((e,s)=>I`
            <button
              type="button"
              class="range-btn ${this.value===e.value?"active":""}"
              role="radio"
              aria-checked=${this.value===e.value?"true":"false"}
              tabindex=${s===t?"0":"-1"}
              @keydown=${e=>this._onKeydown(e,s)}
              @click=${()=>this._select(e.value)}
            >
              ${e.label}
            </button>
          `)}
      </div>
    `}_select(e){e!==this.value&&(this.value=e,this.dispatchEvent(new CustomEvent("range-changed",{detail:{value:e},bubbles:!0,composed:!0})))}_onKeydown(e,t){let s=null;if("ArrowLeft"===e.key||"ArrowUp"===e.key?s=(t-1+this.options.length)%this.options.length:"ArrowRight"===e.key||"ArrowDown"===e.key?s=(t+1)%this.options.length:"Home"===e.key?s=0:"End"===e.key?s=this.options.length-1:" "!==e.key&&"Enter"!==e.key||(s=t),null==s)return;e.preventDefault();const a=this.options[s]?.value;null!=a&&(this._select(a),this.updateComplete.then(()=>{const e=this.renderRoot.querySelectorAll(".range-btn");e[s]?.focus()}))}}je.styles=[Re],e([he({type:Number})],je.prototype,"value",void 0),e([he({type:Array})],je.prototype,"options",void 0),customElements.get("eon-range-picker")||customElements.define("eon-range-picker",je);const Le=n`.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.meter-id {
  display: flex;
  align-items: center;
  gap: 11px;
}

.meter-id .tile {
  width: 34px;
  height: 34px;
}

.meter-serial {
  font-size: 11px;
  color: var(--eon-faint);
}

.meter-descriptor {
  font-size: 13px;
}

.chart-card {
  padding: 26px 28px;
}

.chart-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20px;
  gap: 12px;
}

.chart-title {
  font-weight: 700;
  font-size: 16px;
}

.chart-range {
  font-size: 12px;
}

.chart-legend {
  margin-top: 16px;
}

.callout {
  margin-top: 16px;
}

.footnote {
  margin-top: 12px;
  font-size: 11px;
  line-height: 1.4;
}

.reading-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border-radius: var(--eon-radius-stat);
  padding: 20px 24px;
}

.reading-title {
  font-size: 13px;
  font-weight: 700;
}

.reading-descriptor {
  font-size: 12px;
  margin-top: 2px;
}

.reading-value {
  font-size: 22px;
}

.reading-unit {
  font-size: 13px;
}
`;class Fe extends oe{constructor(){super(...arguments),this.meter=null,this.refreshToken=0,this._days=30,this._history=[],this._loading=!0,this._fetchedSerial=null,this._fetchedDays=0,this._fetchedToken=-1,this._requestId=0,this._memoHistory=null,this._memoDays=-1,this._memoRate=void 0,this._memoStanding=void 0,this._memoBars=[],this._memoMonthToDate=0}get kind(){return me(this.meter?.type??null)}updated(e){if(!this.hass||!this.meter?.serial)return;const t=this._daysToFetch();(this.meter.serial!==this._fetchedSerial||t!==this._fetchedDays||this.refreshToken!==this._fetchedToken||e.has("meter"))&&this._fetch(t)}_daysToFetch(){const e=(new Date).getDate();return Math.max(this._days,e)}async _fetch(e){this._fetchedSerial=this.meter.serial,this._fetchedDays=e,this._fetchedToken=this.refreshToken,this._loading=!0;const t=++this._requestId;try{const s=await ge(this.hass,this.meter.serial,e);if(t!==this._requestId)return;this._history=s.entries}catch{if(t!==this._requestId)return;this._history=[]}this._loading=!1}_onRange(e){this._days=e.detail.value}_ensureComputed(){const e=this.meter?.unit_rate,t=this.meter?.standing_charge;if(this._memoHistory===this._history&&this._memoDays===this._days&&this._memoRate===e&&this._memoStanding===t)return;this._memoHistory=this._history,this._memoDays=this._days,this._memoRate=e,this._memoStanding=t;const s=this.hass?.language??"en",a=this._history.slice(-this._days);this._memoBars=this._days>=365?function(e,t,s,a="en"){const i=t??0,r=s??0,n=new Map;for(const t of e){const e=new Date(`${t.date}T00:00:00`);if(isNaN(e.getTime()))continue;const s=`${e.getFullYear()}-${e.getMonth()}`,a=n.get(s)??{kwh:0,days:0,date:new Date(e.getFullYear(),e.getMonth(),1)};a.kwh+=Math.max(0,t.consumption),a.days+=1,n.set(s,a)}const o=[...n.values()].sort((e,t)=>e.date.getTime()-t.date.getTime()),l=o.map(e=>({date:e.date,usageCost:e.kwh*i,standCost:e.days*r})),d=Math.max(1e-4,...l.map(e=>e.usageCost+e.standCost));return l.map(e=>({usagePct:e.usageCost/d*100,standPct:e.standCost/d*100,usageCost:e.usageCost,standCost:e.standCost,label:e.date.toLocaleDateString(a,{month:"narrow"})}))}(this._history,e,t,s):Ce(a,e,t,this._days,s),this._memoMonthToDate=Se(this._history,e,t,new Date).monthToDate}render(){if(!this.meter)return I`<div class="placeholder">No meter available.</div>`;this._ensureComputed();const e=this.kind,t=be[e],s=$e(this.meter.standing_charge,0);return I`
      <div class="page">
        ${this._renderHeader(t)}
        ${this._renderChartCard(e,this._memoBars,t,s)}
        ${this._renderStats(s)} ${this._renderReadingStrip(e)}
      </div>
    `}_renderHeader(e){const t=xe(this.meter),s="gas"===this.kind?"Import · volume m³ → kWh":t?"Import · time-of-use":"Import · single rate";return I`
      <div class="detail-header">
        <div class="meter-id">
          <span class="tile ${e.tileClass}">
            <ha-icon .icon=${e.icon} style="--mdc-icon-size:18px"></ha-icon>
          </span>
          <div>
            <div class="mono meter-serial">Meter ${this.meter?.serial??"-"}</div>
            <div class="muted meter-descriptor">${s}</div>
          </div>
        </div>
        <eon-range-picker
          .value=${this._days}
          @range-changed=${this._onRange}
        ></eon-range-picker>
      </div>
    `}_renderChartCard(e,t,s,a){return I`
      <div class="card chart-card">
        <div class="chart-title-row">
          <div class="chart-title">Daily cost - usage &amp; standing charge</div>
          <div class="faint chart-range">${this._rangeLabel()}</div>
        </div>
        ${t.length?I`<eon-stacked-bar-chart
                .bars=${t}
                usageColor=${s.usageColor}
                standColor=${s.standColor}
                .height=${240}
              ></eon-stacked-bar-chart>`:I`<div class="placeholder">
                ${this._loading?"Loading chart…":"No consumption data for this range."}
              </div>`}
        <div class="legend chart-legend">
          <span class="legend-item">
            <span class="legend-swatch" style="background:${s.usageColor}"></span
            >Energy used
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background:${s.standColor}"></span>
            Standing charge (${a} / day, fixed)
          </span>
        </div>
        ${"gas"===e?I`<div class="callout">
                In summer barely any gas is used - nearly every bar is
                <b>pure standing charge</b>. Heating usage grows the caps again from
                autumn.
              </div>`:W}
        <div class="footnote faint">
          Costs use today's unit rate applied to historical usage - an approximation, as
          no historical rate series is available.
        </div>
      </div>
    `}_renderStats(e){return I`
      <div class="grid-4">
        ${this._statCard("This month",_e(this._memoMonthToDate))}
        ${this._statCard("Yesterday",_e(this.meter?.previous_day_cost))}
        ${this._statCard("Unit rate",$e(this.meter?.unit_rate),"per kWh")}
        ${this._statCard("Standing",e,"per day")}
      </div>
    `}_statCard(e,t,s){return I`
      <div class="card card--stat">
        <div class="stat-label">${e}</div>
        <div class="stat-value">${t}</div>
        ${s?I`<div class="stat-sub">${s}</div>`:W}
      </div>
    `}_renderReadingStrip(e){const t=this.meter?.latest_reading;if(null==t)return W;const s=this.hass?.language??"en",a=`${"gas"===e?"Volume":"Register"} read · ${ke(this.meter?.latest_reading_date,s)}`;return I`
      <div class="card reading-strip">
        <div>
          <div class="reading-title">Latest meter reading</div>
          <div class="faint reading-descriptor">${a}</div>
        </div>
        <div class="mono reading-value">
          ${t.toLocaleString(s)}
          <span class="reading-unit faint">kWh</span>
        </div>
      </div>
    `}_rangeLabel(){return{7:"Last 7 days",30:"Last 30 days",90:"Last 90 days",365:"Last 12 months"}[this._days]??`Last ${this._days} days`}}Fe.styles=[Ne,Pe,Le],e([he({attribute:!1})],Fe.prototype,"hass",void 0),e([he({attribute:!1})],Fe.prototype,"meter",void 0),e([he({type:Number})],Fe.prototype,"refreshToken",void 0),e([pe()],Fe.prototype,"_days",void 0),e([pe()],Fe.prototype,"_history",void 0),e([pe()],Fe.prototype,"_loading",void 0),customElements.get("eon-meter-detail-page")||customElements.define("eon-meter-detail-page",Fe);const Be=n`:host {
  display: block;
}

.strip {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  position: relative;
}

.bar {
  flex: 1;
  border-radius: 2px 2px 0 0;
  min-height: 1px;
}

.now {
  position: absolute;
  top: -4px;
  bottom: 0;
  width: 2px;
  background: var(--eon-elec);
}

.now-label {
  position: absolute;
  top: -18px;
  left: -10px;
  font-size: 10px;
  font-weight: 700;
  color: var(--eon-elec);
}

.axis {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 10px;
  color: var(--eon-faint);
}
`;class Ie extends oe{constructor(){super(...arguments),this.bars=[],this.height=64,this.nowFraction=null,this.axis=[],this.ariaLabel="Half-hourly chart"}render(){return I`
      <div
        class="strip"
        style="height:${this.height}px"
        role="img"
        aria-label=${this.ariaLabel}
      >
        ${this.bars.map(e=>I`<div
              class="bar"
              style="height:${e.heightPct}%;background:${e.color}"
            ></div>`)}
        ${null!=this.nowFraction?I`<div class="now" style="left:${100*this.nowFraction}%">
                <span class="now-label mono">now</span>
              </div>`:W}
      </div>
      ${this.axis.length?I`<div class="axis mono">
              ${this.axis.map(e=>I`<span>${e}</span>`)}
            </div>`:W}
    `}}Ie.styles=[Ne,Be],e([he({type:Array})],Ie.prototype,"bars",void 0),e([he({type:Number})],Ie.prototype,"height",void 0),e([he({type:Number})],Ie.prototype,"nowFraction",void 0),e([he({type:Array})],Ie.prototype,"axis",void 0),e([he()],Ie.prototype,"ariaLabel",void 0),customElements.get("eon-halfhour-strip")||customElements.define("eon-halfhour-strip",Ie);const qe=n`.chart-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.chart-title {
  font-weight: 700;
  font-size: 16px;
}

/* --- Dark tariff hero --- */

.tariff-hero {
  padding: 28px 30px;
}

.tariff-hero-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 14px;
}

.tariff-hero-name {
  font-size: 30px;
  margin-top: 6px;
}

.tariff-hero-dates {
  font-size: 13px;
  color: var(--eon-on-dark-muted);
  margin-top: 4px;
}

.tariff-hero-pill {
  height: fit-content;
}

.tariff-hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 24px;
}

@media (max-width: 720px) {
  .tariff-hero-stats {
    grid-template-columns: 1fr 1fr;
  }
}

.hero-stat {
  border-left: 2px solid var(--eon-elec);
  padding-left: 14px;
}

.tariff-stat-label {
  font-size: 12px;
  color: var(--eon-on-dark-muted);
}

.hero-stat-value {
  font-size: 24px;
  margin-top: 3px;
}

.hero-stat-sub {
  font-size: 11px;
  color: var(--eon-on-dark-faint);
}

/* --- Rate strip --- */

.rate-strip-card {
  padding: 24px 28px;
}

.rate-headline {
  font-size: 13px;
}

.rate-callout {
  margin-top: 14px;
}

/* --- Timelines --- */

.timeline-card {
  padding: 22px 24px;
}

.timeline-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 14px;
}

.timeline-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--eon-hairline-soft);
  font-size: 14px;
}

.timeline-row:last-child {
  border-bottom: none;
}

.timeline-row--current .timeline-rate {
  font-weight: 700;
}

.timeline-note {
  font-size: 12px;
  font-weight: 400;
  margin-left: 2px;
}
`;class We extends oe{constructor(){super(...arguments),this.summary=null}render(){const e=ve(this.summary,"electricity"),t=ve(this.summary,"gas"),s=xe(e)||xe(t);return I`
      <div class="page">
        ${this._renderTariffCard(e,t,s)} ${this._renderRateStrip(e,s)}
        ${this._renderTimelines(e,t)}
      </div>
    `}_renderTariffCard(e,t,s){const a=this.hass?.language??"en",i=e?.tariff_name??t?.tariff_name??"Tariff unavailable",r=e??t,n=r?.tariff_valid_from??null,o=r?.tariff_valid_to??null,l=r?.tariff_type??null,d=[];return l&&d.push(l),n&&d.push(`started ${Ve(n,a)}`),o&&d.push(`locked until ${Ve(o,a)}`),I`
      <div class="card card--dark tariff-hero">
        <div class="tariff-hero-head">
          <div>
            <div class="eyebrow">Current tariff</div>
            <div class="serif tariff-hero-name">${i}</div>
            ${d.length?I`<div class="tariff-hero-dates">${d.join(" · ")}</div>`:W}
          </div>
          <span class="pill pill--dark tariff-hero-pill">
            ${s?"Time-of-use":"Flat rate · no off-peak"}
          </span>
        </div>
        <div class="tariff-hero-stats">
          ${this._heroStat("Electricity unit",we(e?.unit_rate),"per kWh","var(--eon-elec)")}
          ${this._heroStat("Elec standing",we(e?.standing_charge),"per day","var(--eon-elec-standing)")}
          ${this._heroStat("Gas unit",we(t?.unit_rate),"per kWh","var(--eon-gas)")}
          ${this._heroStat("Gas standing",we(t?.standing_charge),"per day","var(--eon-gas-standing)")}
        </div>
      </div>
    `}_heroStat(e,t,s,a){return I`
      <div class="hero-stat" style="border-left-color:${a}">
        <div class="tariff-stat-label">${e}</div>
        <div class="serif hero-stat-value">${t}</div>
        <div class="hero-stat-sub">${s}</div>
      </div>
    `}_renderRateStrip(e,t){const s=(a=e,a?.day_rates?a.day_rates.map(e=>({start:e.start,end:e.end,rate:e.rate,isOffPeak:e.is_off_peak})):[]);var a;const i=function(e,t){const s=[],a=[],i=new Date;i.setHours(0,0,0,0);for(let r=0;r<48;r++){const n=new Date(i.getTime()+30*r*6e4),o=new Date(n.getTime()+9e5);let l=t??0,d=!1;for(const t of e){const e=new Date(t.start),s=new Date(t.end);if(!isNaN(e.getTime())&&!isNaN(s.getTime())&&(o>=e&&o<s)){l=t.rate,d=t.isOffPeak;break}}s.push(l),a.push(d)}const r=Math.min(...s),n=Math.max(...s),o=n-r<1e-6;return s.map((e,t)=>({heightPct:o?72:45+(e-r)/(n-r)*50,color:a[t]?"var(--eon-green-light)":"var(--eon-elec-tile)"}))}(s,e?.unit_rate??null),r=new Date,n=(60*r.getHours()+r.getMinutes())/1440,o=t?"Varies through the day":`Flat · ${$e(e?.unit_rate)}/kWh all day`;return I`
      <div class="card rate-strip-card">
        <div class="chart-title-row">
          <div class="chart-title">Today's electricity rate</div>
          <div class="muted rate-headline">${o}</div>
        </div>
        <eon-halfhour-strip
          .bars=${i}
          .height=${64}
          .nowFraction=${n}
          .axis=${["00:00","06:00","12:00","18:00","24:00"]}
          ariaLabel="Today's electricity rate by half-hour"
        ></eon-halfhour-strip>
        ${t?W:I`<div class="callout rate-callout">
                You're on a fixed tariff, so there's no cheaper window - the price is
                identical every half-hour. On a time-of-use tariff this strip would shade
                the off-peak hours automatically.
              </div>`}
      </div>
    `}_renderTimelines(e,t){return I`
      <div class="grid-2">
        ${this._renderTimeline("Electricity",e,"var(--eon-elec)")}
        ${this._renderTimeline("Gas",t,"var(--eon-gas)")}
      </div>
    `}_renderTimeline(e,t,s){const a=this.hass?.language??"en",i=ye(t,"previous"),r=ye(t,"next"),n=t?.unit_rate??null;return I`
      <div class="card timeline-card">
        <div class="timeline-title">${e} rate timeline</div>
        ${this._timelineRow("Previous",i.rate,i.validTo?`→ ${Ve(i.validTo,a)}`:"",!1,s)}
        ${this._timelineRow("Current",n,i.validTo?`from ${Ve(i.validTo,a)}`:"",!0,s)}
        ${this._timelineRow("Next",r.rate??n,null==r.rate?"fixed":r.validFrom?`from ${Ve(r.validFrom,a)}`:"",!1,s)}
      </div>
    `}_timelineRow(e,t,s,a,i){return I`
      <div class="timeline-row ${a?"timeline-row--current":""}">
        <span class="muted">${e}</span>
        <span class="timeline-rate" style=${a?`color:${i}`:""}>
          ${$e(t)}
          ${s?I`<span class="faint timeline-note">${s}</span>`:W}
        </span>
      </div>
    `}}function Ve(e,t){const s=new Date(e.length<=10?`${e}T00:00:00`:e);return isNaN(s.getTime())?e:s.toLocaleDateString(t,{day:"numeric",month:"short",year:"numeric"})}We.styles=[Ne,Pe,qe],e([he({attribute:!1})],We.prototype,"hass",void 0),e([he({attribute:!1})],We.prototype,"summary",void 0),customElements.get("eon-tariff-page")||customElements.define("eon-tariff-page",We);const Ye=n`.ev-banner {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
  padding: 28px 30px;
}

.ev-tile {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: var(--eon-dark-pill);
  color: var(--eon-accent-on-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.ev-banner-text {
  flex: 1;
  min-width: 200px;
}

.ev-banner-title {
  font-size: 24px;
}

.ev-banner-desc {
  font-size: 13px;
  color: var(--eon-on-dark-muted);
  margin-top: 4px;
}

.charge-card {
  padding: 22px 24px;
}

.charge-label {
  font-size: 13px;
}

.charge-value {
  font-size: 30px;
  margin-top: 6px;
}

.charge-value--empty {
  font-size: 22px;
  color: var(--eon-faint);
}

.charge-desc {
  font-size: 13px;
  color: var(--eon-subtle);
  margin-top: 6px;
}

.schedule-card {
  padding: 22px 26px;
}

.schedule-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
}

.schedule-legend {
  margin-top: 14px;
}
`;class Ge extends oe{constructor(){super(...arguments),this.deviceId="",this.refreshToken=0,this._data=null,this._loading=!0,this._error=!1,this._fetchedDeviceId=null,this._fetchedToken=-1}updated(){this.hass&&this.deviceId&&(this.deviceId===this._fetchedDeviceId&&this.refreshToken===this._fetchedToken||this._fetch())}async _fetch(){this._fetchedDeviceId=this.deviceId,this._fetchedToken=this.refreshToken,this._loading=!0,this._error=!1;try{this._data=await async function(e,t){return e.callWS({type:"eon_next/ev_schedule",device_id:t})}(this.hass,this.deviceId)}catch{this._error=!0,this._data=null}this._loading=!1}render(){if(!this.deviceId)return I`<div class="placeholder">No EV charger available.</div>`;if(this._loading&&!this._data)return I`<div class="placeholder">Loading EV schedule…</div>`;if(this._error||!this._data)return I`<div class="placeholder">Unable to load EV schedule.</div>`;const{status:e,slots:t}=this._data,s="scheduled"===e||"active"===e;return I`
      <div class="page">
        ${this._renderBanner(s)} ${this._renderChargeCards(t)}
        ${this._renderSchedule(t)}
      </div>
    `}_renderBanner(e){return I`
      <div class="card card--dark ev-banner">
        <div class="ev-tile">
          <ha-icon icon="mdi:ev-station" style="--mdc-icon-size:26px"></ha-icon>
        </div>
        <div class="ev-banner-text">
          <div class="serif ev-banner-title">
            ${e?"Smart charging active":"Charging idle"}
          </div>
          <div class="ev-banner-desc">
            ${e?"Schedule optimised for the cheapest overnight slots":"No charge scheduled - plug in to schedule a cheap overnight charge"}
          </div>
        </div>
        <span class="pill ${e?"pill--ready":"pill--dark"}">
          ${e?"Ready":"Idle"}
        </span>
      </div>
    `}_renderChargeCards(e){const t=this.hass?.language??"en";return I`
      <div class="grid-2">
        ${this._chargeCard("Next charge",e[0],t)}
        ${this._chargeCard("Following charge",e[1],t)}
      </div>
    `}_chargeCard(e,t,s){if(!t)return I`<div class="card card--stat charge-card">
        <div class="muted charge-label">${e}</div>
        <div class="serif charge-value charge-value--empty">Not scheduled</div>
      </div>`;const a=new Date(t.start),i=new Date(t.end),r=`${Ke(a)} → ${Ke(i)}`,n=function(e,t){const s=Math.round((t.getTime()-e.getTime())/6e4);if(!Number.isFinite(s)||s<=0)return"scheduled";const a=Math.floor(s/60),i=s%60,r=0===i?`${a} hr`:`${(s/60).toFixed(1)} hr`;return`${r} window`}(a,i),o=`${function(e,t){if(isNaN(e.getTime()))return"";const s=new Date,a=new Date(s.getFullYear(),s.getMonth(),s.getDate()),i=new Date(e.getFullYear(),e.getMonth(),e.getDate()),r=Math.round((i.getTime()-a.getTime())/864e5);return r<=0?e.getHours()>=18||e.getHours()<6?"Tonight":"Today":1===r?"Tomorrow":e.toLocaleDateString(t,{weekday:"short"})}(a,s)} · ${n}`;return I`
      <div class="card card--stat charge-card">
        <div class="muted charge-label">${e}</div>
        <div class="serif charge-value">${r}</div>
        <div class="charge-desc">${o}</div>
      </div>
    `}_renderSchedule(e){const t=function(e){const t=new Date;t.setHours(18,0,0,0);const s=e.map(e=>[new Date(e.start).getTime(),new Date(e.end).getTime()]).filter(([e,t])=>Number.isFinite(e)&&Number.isFinite(t)&&t>e),a=[];for(let e=0;e<48;e++){const i=t.getTime()+30*e*6e4,r=i+18e5,n=s.some(([e,t])=>e<r&&t>i);a.push({heightPct:n?90:18,color:n?"var(--eon-green)":"var(--eon-hairline)"})}return a}(e);return I`
      <div class="card schedule-card">
        <div class="schedule-title">Charging schedule</div>
        <eon-halfhour-strip
          .bars=${t}
          .height=${56}
          .axis=${["18:00","00:00","06:00","12:00"]}
          ariaLabel="Charging schedule by half-hour"
        ></eon-halfhour-strip>
        <div class="legend schedule-legend">
          <span class="legend-item">
            <span class="legend-swatch" style="background:var(--eon-green)"></span>
            Charging (off-peak)
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background:var(--eon-hairline)"></span>Idle
          </span>
        </div>
      </div>
    `}}function Ke(e){return isNaN(e.getTime())?"-":`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`}Ge.styles=[Ne,Pe,Ye],e([he({attribute:!1})],Ge.prototype,"hass",void 0),e([he()],Ge.prototype,"deviceId",void 0),e([he({type:Number})],Ge.prototype,"refreshToken",void 0),e([pe()],Ge.prototype,"_data",void 0),e([pe()],Ge.prototype,"_loading",void 0),e([pe()],Ge.prototype,"_error",void 0),customElements.get("eon-ev-page")||customElements.define("eon-ev-page",Ge);const Je=n`/* Shared styles using HA CSS custom properties for automatic theme support. */

:host {
  --eon-primary: var(--primary-color, #03a9f4);
  --eon-text-primary: var(--primary-text-color, #212121);
  --eon-text-secondary: var(--secondary-text-color, #727272);
  --eon-background: var(--card-background-color, #fff);
  --eon-divider: var(--divider-color, #e0e0e0);
}

.card-header {
  font-size: 1.2em;
  font-weight: 500;
  color: var(--eon-text-primary);
  padding: 16px 16px 0;
}

.card-content {
  padding: 16px;
}

.secondary-text {
  color: var(--eon-text-secondary);
  font-size: 0.9em;
}

.value {
  font-size: 1.4em;
  font-weight: 500;
  color: var(--eon-text-primary);
}

.unit {
  font-size: 0.8em;
  color: var(--eon-text-secondary);
  margin-left: 2px;
}
`,Ze=n`.backfill-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--eon-text-primary);
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 0.9em;
}

.status-row .label {
  color: var(--eon-text-secondary);
}

.status-row .value {
  font-size: 1em;
  font-weight: 400;
  color: var(--eon-text-primary);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--eon-divider);
  border-radius: 3px;
  overflow: hidden;
  margin: 8px 0;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--eon-primary);
  transition: width 0.3s ease;
}

.state-badge {
  font-size: 0.8em;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 12px;
}

.state-badge.running {
  background: rgba(3, 169, 244, 0.15);
  color: var(--eon-primary);
}

.state-badge.completed {
  background: rgba(76, 175, 80, 0.15);
  color: var(--label-badge-green, #4caf50);
}

.state-badge.disabled {
  background: rgba(158, 158, 158, 0.15);
  color: var(--eon-text-secondary);
}

.state-badge.initializing {
  background: rgba(255, 152, 0, 0.15);
  color: var(--label-badge-yellow, #ff9800);
}

.meter-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85em;
  padding: 4px 0;
}

.meter-serial {
  color: var(--eon-text-secondary);
  font-family: monospace;
}

.meter-done {
  color: var(--label-badge-green, #4caf50);
}

.meter-pending {
  color: var(--eon-text-secondary);
}

.disabled-notice {
  color: var(--eon-text-secondary);
  font-size: 0.9em;
  font-style: italic;
  padding: 4px 0;
}
`;class Qe extends oe{constructor(){super(...arguments),this._data=new fe(this,e=>ue(e))}render(){if(this._data.loading)return I`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">Loading status…</div>
      `;if(this._data.error)return I`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">Failed to load backfill status.</div>
      `;const e=this._data.data;if(!e)return I`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">No backfill status available.</div>
      `;if(!e.enabled)return I`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">
          Backfill is disabled. Enable it in the integration options.
        </div>
      `;const t=e.total_meters>0?Math.round(e.completed_meters/e.total_meters*100):0;return I`
      <div class="backfill-header">
        <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
        Historical Backfill
        <span class="state-badge ${e.state}">${e.state}</span>
      </div>

      <div class="status-row">
        <span class="label">Progress</span>
        <span class="value"
          >${e.completed_meters} / ${e.total_meters} meters (${t}%)</span
        >
      </div>

      <div class="progress-bar">
        <div class="progress-bar-fill" style="width: ${t}%"></div>
      </div>

      ${e.lookback_days>0?I`<div class="status-row">
              <span class="label">Lookback</span>
              <span class="value">${e.lookback_days} days</span>
            </div>`:W}
      ${e.next_start_date?I`<div class="status-row">
              <span class="label">Next backfill from</span>
              <span class="value">${e.next_start_date}</span>
            </div>`:W}
      ${e.meters.length>0?I`<div class="meter-list">
              ${e.meters.map(e=>I`
                  <div class="meter-item">
                    <span class="meter-serial">${e.serial}</span>
                    ${e.done?I`<span class="meter-done">Complete</span>`:I`<span class="meter-pending"
                            >${e.days_completed}/${e.days_completed+e.days_remaining}
                            days</span
                          >`}
                  </div>
                `)}
            </div>`:W}
    `}}Qe.styles=[Je,Ze],e([he({attribute:!1})],Qe.prototype,"hass",void 0),customElements.get("eon-backfill-status")||customElements.define("eon-backfill-status",Qe);const Xe=n`.intro {
  padding: 28px 30px;
}

.intro-title {
  font-size: 22px;
  color: var(--eon-text);
}

.intro-body {
  font-size: 14px;
  margin-top: 8px;
  line-height: 1.5;
  max-width: 62ch;
}

.version {
  font-size: 12px;
  margin-top: 14px;
  font-family: var(--eon-font-mono);
}
`;class et extends oe{constructor(){super(...arguments),this.version=null}render(){return I`
      <div class="page">
        <div class="card intro">
          <div class="serif intro-title">Settings</div>
          <div class="muted intro-body">
            Account details, the integration refresh interval and backfill controls are
            managed from the E.ON Next integration's options in Home Assistant.
          </div>
          ${this.version?I`<div class="faint version">Version ${this.version}</div>`:W}
        </div>

        <div class="card">
          <eon-backfill-status .hass=${this.hass}></eon-backfill-status>
        </div>
      </div>
    `}}et.styles=[Ne,Pe,Xe],e([he({attribute:!1})],et.prototype,"hass",void 0),e([he()],et.prototype,"version",void 0),customElements.get("eon-settings-page")||customElements.define("eon-settings-page",et);const tt=n`:host {
  display: block;
  font-family: var(--eon-font-ui);
  color: var(--eon-text);
  background: var(--eon-bg);
}

.shell {
  display: flex;
  min-height: 100vh;
  background: var(--eon-bg);
}

/* ============================= RAIL ============================= */

.rail {
  width: 238px;
  flex: 0 0 238px;
  background: var(--eon-dark);
  color: var(--eon-on-dark);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 8px 26px;
}

/* Doubles as the sidebar toggle (see EonNextPanel._toggleSidebar). */
.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--eon-elec);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: none;
  padding: 0;
  cursor: pointer;
}

.brand-logo:hover {
  filter: brightness(1.08);
}

.brand-logo:focus-visible {
  outline: 2px solid var(--eon-accent-on-dark);
  outline-offset: 2px;
}

.brand-bolt {
  width: 24px;
  height: 24px;
  display: block;
}

.brand-name {
  font-weight: 800;
  font-size: 15px;
  letter-spacing: 0.01em;
}

.brand-sub {
  font-size: 11px;
  color: var(--eon-on-dark-faint);
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: var(--eon-radius-control);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
  font-family: inherit;
  background: transparent;
  color: var(--eon-on-dark-faint);
}

.nav-item:hover {
  color: var(--eon-on-dark);
}

.nav-item:focus-visible {
  outline: 2px solid var(--eon-accent-on-dark);
  outline-offset: 2px;
}

.nav-item--active {
  background: var(--eon-elec);
  color: #fff;
  font-weight: 700;
}

.nav-item--active:hover {
  color: #fff;
}

.nav-item ha-icon {
  flex: 0 0 auto;
}

.rail-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.balance {
  margin: 12px 8px;
  padding: 14px;
  background: var(--eon-dark-inner);
  border-radius: 14px;
}

.balance-label {
  font-size: 11px;
  color: var(--eon-on-dark-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.balance-value {
  font-size: 26px;
  margin-top: 3px;
}

.balance--credit {
  color: var(--eon-green-light);
}

.balance--debit {
  color: var(--eon-accent-on-dark);
}

.balance-sub {
  font-size: 12px;
  color: var(--eon-on-dark-faint);
}

/* ============================= MAIN ============================= */

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  border-bottom: 1px solid var(--eon-hairline);
  gap: 12px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.topbar-title {
  font-size: 24px;
  color: var(--eon-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.freshness {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--eon-muted);
  white-space: nowrap;
}

.refresh-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--eon-radius-control);
  border: 1px solid var(--eon-hairline);
  background: var(--eon-card);
  color: var(--eon-subtle);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.refresh-btn:hover {
  background: var(--eon-track);
}

.refresh-btn:focus-visible {
  outline: 2px solid var(--eon-elec);
  outline-offset: 2px;
}

.content {
  flex: 1;
  padding: 32px 40px 56px;
  max-width: 1080px;
  width: 100%;
}

/* --- Full-view states --- */

.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 64px 16px;
  color: var(--eon-muted);
  font-size: 16px;
}

.state-msg--error {
  color: var(--eon-elec);
}

.state-sub {
  font-size: 13px;
  color: var(--eon-faint);
}

/* ============================= RESPONSIVE ============================= */

@media (max-width: 860px) {
  .shell {
    flex-direction: column;
  }

  .rail {
    width: 100%;
    flex: none;
    height: auto;
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 12px 12px;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
  }

  .brand {
    padding: 0 8px 0 4px;
    flex: 0 0 auto;
  }

  .brand-sub {
    display: none;
  }

  .nav-items {
    flex-direction: row;
    gap: 4px;
    flex: 1;
  }

  .nav-item {
    padding: 9px 12px;
    white-space: nowrap;
  }

  .nav-item span {
    display: none;
  }

  .nav-item--active span {
    display: inline;
  }

  .rail-bottom {
    margin-top: 0;
    flex-direction: row;
    align-items: center;
    flex: 0 0 auto;
  }

  .balance {
    display: none;
  }

  .topbar {
    padding: 16px 20px;
  }

  .content {
    padding: 20px 20px 40px;
  }
}

@media (max-width: 520px) {
  .freshness {
    display: none;
  }
}
`;class st extends oe{constructor(){super(...arguments),this.narrow=!1,this._page="overview",this._lastUpdated=null,this._refreshToken=0,this._version=new fe(this,e=>async function(e){return e.callWS({type:"eon_next/version"})}(e)),this._summary=new fe(this,e=>async function(e){return e.callWS({type:"eon_next/dashboard_summary"})}(e)),this._hadData=!1,this._navigate=e=>{this._page=e},this._toggleSidebar=()=>{this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}))},this._onNavigateEvent=e=>{this._navigate(e.detail.page)},this._refresh=()=>{this._refreshToken++,this._lastUpdated=new Date,this._summary.refresh(),this._version.refresh()}}connectedCallback(){super.connectedCallback(),this._ensureFonts()}updated(){!this._summary.data||this._summary.loading||this._summary.refreshing||this._hadData||(this._hadData=!0,this._lastUpdated=new Date)}_ensureFonts(){const e=this.ownerDocument;if(!e||e.getElementById("eon-next-fonts"))return;const t=e.createElement("link");t.id="eon-next-fonts",t.rel="stylesheet",t.href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Mono&display=swap",e.head.appendChild(t)}render(){return I`
      <div class="shell" @navigate=${this._onNavigateEvent}>
        ${this._renderRail()}
        <main class="main">
          ${this._renderTopBar()}
          <div class="content">${this._renderPage()}</div>
        </main>
      </div>
    `}_renderRail(){const e=this._summary.data?.account_balance??null;return I`
      <nav class="rail" aria-label="Dashboard sections">
        <div class="brand">
          <button
            class="brand-logo"
            type="button"
            title="Toggle Home Assistant menu"
            aria-label="Toggle Home Assistant menu"
            @click=${this._toggleSidebar}
          >
            <svg
              viewBox="0 0 48 48"
              class="brand-bolt"
              focusable="false"
              aria-hidden="true"
            >
              <path d="M27 4 11 27h11l-2 17 18-24H26z" fill="#fff" />
            </svg>
          </button>
          <div>
            <div class="brand-name">EON Next</div>
            <div class="brand-sub mono">home energy</div>
          </div>
        </div>

        <div class="nav-items">
          ${Ee.map(e=>this._renderNavButton(e.page,e.label,e.icon))}
        </div>

        <div class="rail-bottom">
          ${null!=e?I`<div class="balance">
                  <div class="balance-label">Balance</div>
                  <div
                    class="serif balance-value ${e>=0?"balance--credit":"balance--debit"}"
                  >
                    ${_e(Math.abs(e))}
                  </div>
                  <div class="balance-sub">${e>=0?"in credit":"owed"}</div>
                </div>`:W}
          ${this._renderNavButton("settings","Settings","mdi:cog-outline")}
        </div>
      </nav>
    `}_renderNavButton(e,t,s){const a=this._page===e;return I`
      <button
        class="nav-item ${a?"nav-item--active":""}"
        aria-current=${a?"page":"false"}
        @click=${()=>this._navigate(e)}
      >
        <ha-icon .icon=${s} style="--mdc-icon-size:18px"></ha-icon>
        <span>${t}</span>
      </button>
    `}_renderTopBar(){const e=this._summary.refreshing?"Updating…":`Updated ${function(e){if(!e)return"-";const t=Math.max(0,Math.round((Date.now()-e.getTime())/1e3));if(t<45)return"just now";const s=Math.round(t/60);if(s<60)return`${s} min${1===s?"":"s"} ago`;const a=Math.round(s/60);if(a<24)return`${a} hr${1===a?"":"s"} ago`;const i=Math.round(a/24);return`${i} day${1===i?"":"s"} ago`}(this._lastUpdated)}`;return I`
      <header class="topbar">
        <div class="topbar-left">
          <h1 class="serif topbar-title">${ze[this._page]}</h1>
        </div>
        <div class="topbar-right">
          <span class="freshness"> <span class="dot"></span>${e} </span>
          <button
            class="refresh-btn"
            title="Refresh data"
            aria-label="Refresh data"
            @click=${this._refresh}
          >
            <ha-icon icon="mdi:refresh" style="--mdc-icon-size:18px"></ha-icon>
          </button>
        </div>
      </header>
    `}_renderPage(){if(this._summary.loading&&!this._summary.data)return I`<div class="state-msg" role="status">Loading energy data…</div>`;if(this._summary.error&&!this._summary.data)return I`
        <div class="state-msg state-msg--error" role="alert">
          <ha-icon icon="mdi:alert-circle" style="--mdc-icon-size:40px"></ha-icon>
          <div>Unable to load data</div>
          <div class="state-sub">${this._summary.error}</div>
        </div>
      `;const e=this._summary.data,t=(e?.meters.length??0)>0,s=(e?.ev_chargers.length??0)>0;if(!t&&!s)return I`
        <div class="state-msg" role="status">
          <ha-icon
            icon="mdi:lightning-bolt-circle"
            style="--mdc-icon-size:40px"
          ></ha-icon>
          <div>No data available</div>
          <div class="state-sub">No meter or EV data found for this account.</div>
        </div>
      `;const a=this._refreshToken;switch(this._page){case"overview":return I`<eon-overview-page
          .hass=${this.hass}
          .summary=${e}
          .refreshToken=${a}
        ></eon-overview-page>`;case"elec":return I`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${ve(e,"electricity")}
          .refreshToken=${a}
        ></eon-meter-detail-page>`;case"gas":return I`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${ve(e,"gas")}
          .refreshToken=${a}
        ></eon-meter-detail-page>`;case"tariff":return I`<eon-tariff-page
          .hass=${this.hass}
          .summary=${e}
        ></eon-tariff-page>`;case"ev":return I`<eon-ev-page
          .hass=${this.hass}
          .deviceId=${e?.ev_chargers[0]?.device_id??""}
          .refreshToken=${a}
        ></eon-ev-page>`;case"settings":return I`<eon-settings-page
          .hass=${this.hass}
          .version=${this._version.data?.version??null}
        ></eon-settings-page>`}}}st.styles=[Ne,tt],e([he({attribute:!1})],st.prototype,"hass",void 0),e([he({type:Boolean})],st.prototype,"narrow",void 0),e([he({attribute:!1})],st.prototype,"route",void 0),e([he({attribute:!1})],st.prototype,"panel",void 0),e([pe()],st.prototype,"_page",void 0),e([pe()],st.prototype,"_lastUpdated",void 0),e([pe()],st.prototype,"_refreshToken",void 0),customElements.define("eon-next-panel",st);
