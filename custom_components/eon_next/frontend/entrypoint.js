function e(e,t,s,i){var a,r=arguments.length,n=r<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,s,i);else for(var o=e.length-1;o>=0;o--)(a=e[o])&&(n=(r<3?a(n):r>3?a(t,s,n):a(t,s))||n);return r>3&&n&&Object.defineProperty(t,s,n),n}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,s=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),a=new WeakMap;let r=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(s&&void 0===e){const s=void 0!==t&&1===t.length;s&&(e=a.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&a.set(t,e))}return e}toString(){return this.cssText}};const n=(e,...t)=>{const s=1===e.length?e[0]:t.reduce((t,s,i)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+e[i+1],e[0]);return new r(s,e,i)},o=s?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const s of e.cssRules)t+=s.cssText;return(e=>new r("string"==typeof e?e:e+"",void 0,i))(t)})(e):e,{is:l,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,g=globalThis,f=g.trustedTypes,v=f?f.emptyScript:"",m=g.reactiveElementPolyfillSupport,y=(e,t)=>e,b={toAttribute(e,t){switch(t){case Boolean:e=e?v:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let s=e;switch(t){case Boolean:s=null!==e;break;case Number:s=null===e?null:Number(e);break;case Object:case Array:try{s=JSON.parse(e)}catch(e){s=null}}return s}},x=(e,t)=>!l(e,t),_={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(e,s,t);void 0!==i&&d(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){const{get:i,set:a}=c(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:i,set(t){const r=i?.call(this);a?.call(this,t),this.requestUpdate(e,r,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(y("elementProperties")))return;const e=u(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y("properties"))){const e=this.properties,t=[...h(e),...p(e)];for(const s of t)this.createProperty(s,e[s])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,s]of t)this.elementProperties.set(e,s)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const s=this._$Eu(e,t);void 0!==s&&this._$Eh.set(s,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const s=new Set(e.flat(1/0).reverse());for(const e of s)t.unshift(o(e))}else void 0!==e&&t.push(o(e));return t}static _$Eu(e,t){const s=t.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,i)=>{if(s)e.adoptedStyleSheets=i.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const s of i){const i=document.createElement("style"),a=t.litNonce;void 0!==a&&i.setAttribute("nonce",a),i.textContent=s.cssText,e.appendChild(i)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){const s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(void 0!==i&&!0===s.reflect){const a=(void 0!==s.converter?.toAttribute?s.converter:b).toAttribute(t,s.type);this._$Em=e,null==a?this.removeAttribute(i):this.setAttribute(i,a),this._$Em=null}}_$AK(e,t){const s=this.constructor,i=s._$Eh.get(e);if(void 0!==i&&this._$Em!==i){const e=s.getPropertyOptions(i),a="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:b;this._$Em=i;const r=a.fromAttribute(t,e.type);this[i]=r??this._$Ej?.get(i)??r,this._$Em=null}}requestUpdate(e,t,s,i=!1,a){if(void 0!==e){const r=this.constructor;if(!1===i&&(a=this[e]),s??=r.getPropertyOptions(e),!((s.hasChanged??x)(a,t)||s.useDefault&&s.reflect&&a===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,s))))return;this.C(e,t,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:a},r){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),!0!==a||void 0!==r)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),!0===i&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,s]of e){const{wrapped:e}=s,i=this[t];!0!==e||this._$AL.has(t)||void 0===i||this.C(t,void 0,s,i)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[y("elementProperties")]=new Map,$[y("finalized")]=new Map,m?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,k=e=>e,C=w.trustedTypes,A=C?C.createPolicy("lit-html",{createHTML:e=>e}):void 0,S="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,E="?"+T,z=`<${E}>`,N=document,D=()=>N.createComment(""),M=e=>null===e||"object"!=typeof e&&"function"!=typeof e,P=Array.isArray,H="[ \t\n\f\r]",j=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,U=/>/g,R=RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),L=/'/g,F=/"/g,B=/^(?:script|style|textarea|title)$/i,I=(e=>(t,...s)=>({_$litType$:e,strings:t,values:s}))(1),W=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),V=new WeakMap,Y=N.createTreeWalker(N,129);function G(e,t){if(!P(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(t):t}const K=(e,t)=>{const s=e.length-1,i=[];let a,r=2===t?"<svg>":3===t?"<math>":"",n=j;for(let t=0;t<s;t++){const s=e[t];let o,l,d=-1,c=0;for(;c<s.length&&(n.lastIndex=c,l=n.exec(s),null!==l);)c=n.lastIndex,n===j?"!--"===l[1]?n=O:void 0!==l[1]?n=U:void 0!==l[2]?(B.test(l[2])&&(a=RegExp("</"+l[2],"g")),n=R):void 0!==l[3]&&(n=R):n===R?">"===l[0]?(n=a??j,d=-1):void 0===l[1]?d=-2:(d=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?R:'"'===l[3]?F:L):n===F||n===L?n=R:n===O||n===U?n=j:(n=R,a=void 0);const h=n===R&&e[t+1].startsWith("/>")?" ":"";r+=n===j?s+z:d>=0?(i.push(o),s.slice(0,d)+S+s.slice(d)+T+h):s+T+(-2===d?t:h)}return[G(e,r+(e[s]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),i]};class J{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let a=0,r=0;const n=e.length-1,o=this.parts,[l,d]=K(e,t);if(this.el=J.createElement(l,s),Y.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(i=Y.nextNode())&&o.length<n;){if(1===i.nodeType){if(i.hasAttributes())for(const e of i.getAttributeNames())if(e.endsWith(S)){const t=d[r++],s=i.getAttribute(e).split(T),n=/([.?@])?(.*)/.exec(t);o.push({type:1,index:a,name:n[2],strings:s,ctor:"."===n[1]?te:"?"===n[1]?se:"@"===n[1]?ie:ee}),i.removeAttribute(e)}else e.startsWith(T)&&(o.push({type:6,index:a}),i.removeAttribute(e));if(B.test(i.tagName)){const e=i.textContent.split(T),t=e.length-1;if(t>0){i.textContent=C?C.emptyScript:"";for(let s=0;s<t;s++)i.append(e[s],D()),Y.nextNode(),o.push({type:2,index:++a});i.append(e[t],D())}}}else if(8===i.nodeType)if(i.data===E)o.push({type:2,index:a});else{let e=-1;for(;-1!==(e=i.data.indexOf(T,e+1));)o.push({type:7,index:a}),e+=T.length-1}a++}}static createElement(e,t){const s=N.createElement("template");return s.innerHTML=e,s}}function Z(e,t,s=e,i){if(t===W)return t;let a=void 0!==i?s._$Co?.[i]:s._$Cl;const r=M(t)?void 0:t._$litDirective$;return a?.constructor!==r&&(a?._$AO?.(!1),void 0===r?a=void 0:(a=new r(e),a._$AT(e,s,i)),void 0!==i?(s._$Co??=[])[i]=a:s._$Cl=a),void 0!==a&&(t=Z(e,a._$AS(e,t.values),a,i)),t}class Q{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:s}=this._$AD,i=(e?.creationScope??N).importNode(t,!0);Y.currentNode=i;let a=Y.nextNode(),r=0,n=0,o=s[0];for(;void 0!==o;){if(r===o.index){let t;2===o.type?t=new X(a,a.nextSibling,this,e):1===o.type?t=new o.ctor(a,o.name,o.strings,this,e):6===o.type&&(t=new ae(a,this,e)),this._$AV.push(t),o=s[++n]}r!==o?.index&&(a=Y.nextNode(),r++)}return Y.currentNode=N,i}p(e){let t=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,i){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Z(this,e,t),M(e)?e===q||null==e||""===e?(this._$AH!==q&&this._$AR(),this._$AH=q):e!==this._$AH&&e!==W&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>P(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==q&&M(this._$AH)?this._$AA.nextSibling.data=e:this.T(N.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:s}=e,i="number"==typeof s?this._$AC(e):(void 0===s.el&&(s.el=J.createElement(G(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(t);else{const e=new Q(i,this),s=e.u(this.options);e.p(t),this.T(s),this._$AH=e}}_$AC(e){let t=V.get(e.strings);return void 0===t&&V.set(e.strings,t=new J(e)),t}k(e){P(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let s,i=0;for(const a of e)i===t.length?t.push(s=new X(this.O(D()),this.O(D()),this,this.options)):s=t[i],s._$AI(a),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=k(e).nextSibling;k(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,a){this.type=1,this._$AH=q,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=a,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=q}_$AI(e,t=this,s,i){const a=this.strings;let r=!1;if(void 0===a)e=Z(this,e,t,0),r=!M(e)||e!==this._$AH&&e!==W,r&&(this._$AH=e);else{const i=e;let n,o;for(e=a[0],n=0;n<a.length-1;n++)o=Z(this,i[s+n],t,n),o===W&&(o=this._$AH[n]),r||=!M(o)||o!==this._$AH[n],o===q?e=q:e!==q&&(e+=(o??"")+a[n+1]),this._$AH[n]=o}r&&!i&&this.j(e)}j(e){e===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===q?void 0:e}}class se extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==q)}}class ie extends ee{constructor(e,t,s,i,a){super(e,t,s,i,a),this.type=5}_$AI(e,t=this){if((e=Z(this,e,t,0)??q)===W)return;const s=this._$AH,i=e===q&&s!==q||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,a=e!==q&&(s===q||i);i&&this.element.removeEventListener(this.name,this,s),a&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){Z(this,e)}}const re=w.litHtmlPolyfillSupport;re?.(J,X),(w.litHtmlVersions??=[]).push("3.3.2");const ne=globalThis;class oe extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,s)=>{const i=s?.renderBefore??t;let a=i._$litPart$;if(void 0===a){const e=s?.renderBefore??null;i._$litPart$=a=new X(t.insertBefore(D(),e),e,void 0,s??{})}return a._$AI(e),a})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}oe._$litElement$=!0,oe.finalized=!0,ne.litElementHydrateSupport?.({LitElement:oe});const le=ne.litElementPolyfillSupport;le?.({LitElement:oe}),(ne.litElementVersions??=[]).push("4.2.2");const de={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:x},ce=(e=de,t,s)=>{const{kind:i,metadata:a}=s;let r=globalThis.litPropertyMetadata.get(a);if(void 0===r&&globalThis.litPropertyMetadata.set(a,r=new Map),"setter"===i&&((e=Object.create(e)).wrapped=!0),r.set(s.name,e),"accessor"===i){const{name:i}=s;return{set(s){const a=t.get.call(this);t.set.call(this,s),this.requestUpdate(i,a,e,!0,s)},init(t){return void 0!==t&&this.C(i,void 0,e,t),t}}}if("setter"===i){const{name:i}=s;return function(s){const a=this[i];t.call(this,s),this.requestUpdate(i,a,e,!0,s)}}throw Error("Unsupported decorator location: "+i)};function he(e){return(t,s)=>"object"==typeof s?ce(e,t,s):((e,t,s)=>{const i=t.hasOwnProperty(s);return t.constructor.createProperty(s,e),i?Object.getOwnPropertyDescriptor(t,s):void 0})(e,t,s)}function pe(e){return he({...e,state:!0,attribute:!1})}async function ue(e){return e.callWS({type:"eon_next/backfill_status"})}async function ge(e,t,s=7){return e.callWS({type:"eon_next/consumption_history",meter_serial:t,days:s})}class fe{constructor(e,t){this._host=e,this._fetcher=t,this.data=null,this.loading=!0,this.refreshing=!1,this.error=null,this._requestSeq=0,this._lastConnection=void 0,this._started=!1,this._host.addController(this)}hostConnected(){this._startTimer()}hostUpdated(){const e=this._host.hass;e&&(this._started?this._lastConnection!==e.connection&&(this._lastConnection=e.connection,this._fetch(e)):(this._started=!0,this._fetch(e)))}async refresh(){const e=this._host.hass;e&&await this._fetch(e)}_startTimer(){this._stopTimer(),this._timer=setInterval(()=>{const e=this._host.hass;e&&this._fetch(e)},3e5)}_stopTimer(){void 0!==this._timer&&(clearInterval(this._timer),this._timer=void 0)}async _fetch(e){const t=++this._requestSeq;this._lastConnection=e.connection,null===this.data?this.loading=!0:this.refreshing=!0,this.error=null,this._host.requestUpdate();try{const s=await this._fetcher(e);if(t!==this._requestSeq)return;this.data=s}catch(e){if(t!==this._requestSeq)return;this.error=e instanceof Error?e.message:String(e)}finally{t===this._requestSeq&&(this.loading=!1,this.refreshing=!1,this._host.requestUpdate())}}hostDisconnected(){this._stopTimer(),this._requestSeq++,this.data=null,this.loading=!0,this.refreshing=!1,this._lastConnection=void 0,this._started=!1}}function ve(e,t){return e?e.meters.find(e=>me(e.type)===t)??null:null}function me(e){return"gas"===e?"gas":"electricity"}const ye={electricity:{label:"Electricity",icon:"mdi:lightning-bolt",tileClass:"tile--elec",usageColor:"var(--eon-elec)",standColor:"var(--eon-elec-standing)"},gas:{label:"Gas",icon:"mdi:fire",tileClass:"tile--gas",usageColor:"var(--eon-gas)",standColor:"var(--eon-gas-standing)"}};function be(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}const xe=new WeakMap;function _e(e,t,s){let i=xe.get(e);if(i||(i=new Map,xe.set(e,i)),i.has(t))return i.get(t)??null;const a=s();return i.set(t,a),a}function $e(e,t,s,i){if(!e?.states||!s)return null;const a=e.states;return _e(a,`${t}|${s}|${i}`,()=>{const e=`${t}.${be(s)}_${i}`,r=a[e];if(r)return r;const n=be(s),o=`_${i}`;for(const[e,s]of Object.entries(a))if(e.startsWith(`${t}.`)&&e.includes(n)&&e.endsWith(o))return s;return null})}function we(e){if(!e)return null;const t=Number(e.state);return Number.isFinite(t)?t:null}function ke(e,t,s){const i=$e(e,"sensor",t,s);return{rate:we(i),validFrom:Ce(i,"valid_from"),validTo:Ce(i,"valid_to")}}function Ce(e,t){const s=e?.attributes?.[t];return"string"==typeof s&&""!==s?s:null}function Ae(e,t){const s=$e(e,"binary_sensor",t,"off_peak");return null!=s&&"unavailable"!==s.state&&"unknown"!==s.state}function Se(e,t=2){return null!=e&&Number.isFinite(e)?`£${e.toFixed(t)}`:"—"}function Te(e,t=2){return null!=e&&Number.isFinite(e)?`${(100*e).toFixed(t)}p`:"—"}function Ee(e){return null!=e&&Number.isFinite(e)?`£${e.toFixed(4)}`:"—"}function ze(e,t="en"){if(!e)return"—";const s=new Date(e.length<=10?`${e}T00:00:00`:e);return isNaN(s.getTime())?e:s.toLocaleDateString(t,{day:"numeric",month:"short"})}function Ne(e,t,s,i,a="en"){const r=t??0,n=s??0,o=e.map(e=>({date:e.date,usageCost:Math.max(0,e.consumption)*r,standCost:n})),l=Math.max(1e-4,...o.map(e=>e.usageCost+e.standCost));return o.map((t,s)=>({usagePct:t.usageCost/l*100,standPct:t.standCost/l*100,usageCost:t.usageCost,standCost:t.standCost,label:De(t.date,s,e.length,i,a)}))}function De(e,t,s,i,a){const r=new Date(`${e}T00:00:00`);if(isNaN(r.getTime()))return"";if(i<=14)return r.toLocaleDateString(a,{weekday:"short"});return t%(i<=31?5:15)!==0&&t!==s-1?"":i<=31?r.toLocaleDateString(a,{day:"numeric"}):r.toLocaleDateString(a,{month:"short",day:"numeric"})}function Me(e,t,s,i){const a=t??0,r=s??0,n=i.getFullYear(),o=i.getMonth(),l=new Date(n,o-1,1),d=l.getFullYear(),c=l.getMonth();let h=0,p=0,u=0,g=0;for(const t of e){const e=new Date(`${t.date}T00:00:00`);if(isNaN(e.getTime()))continue;const s=Math.max(0,t.consumption)*a+r;e.getFullYear()===n&&e.getMonth()===o?(h+=s,p++):e.getFullYear()===d&&e.getMonth()===c&&(u+=s,g++)}return{monthToDate:Pe(h),daysWithData:p,previousMonth:g>0?Pe(u):null}}function Pe(e){return Math.round(100*e)/100}const He=[{page:"overview",label:"Overview",icon:"mdi:view-grid-outline"},{page:"elec",label:"Electricity",icon:"mdi:lightning-bolt"},{page:"gas",label:"Gas",icon:"mdi:fire"},{page:"tariff",label:"Tariff & rates",icon:"mdi:tag-outline"},{page:"ev",label:"EV charging",icon:"mdi:ev-station"}],je={overview:"Overview",elec:"Electricity",gas:"Gas",tariff:"Tariff & rates",ev:"EV charging",settings:"Settings"},Oe=n`/*
 * Design tokens for the redesigned EON Next dashboard.
 *
 * These are the final, brand-specific colours, radii and fonts from the design
 * handoff. They are intentionally NOT wired to HA theme variables: the dashboard
 * is a self-contained branded surface (warm cream + terracotta) that should read
 * the same regardless of the host theme.
 *
 * Custom properties inherit through shadow-DOM boundaries, so defining them on
 * every dashboard component's :host keeps each component self-sufficient.
 */

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
`,Ue=n`:host {
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
  overflow: hidden;
  white-space: nowrap;
}
`;class Re extends oe{constructor(){super(...arguments),this.bars=[],this.usageColor="var(--eon-elec)",this.standColor="var(--eon-elec-standing)",this.height=240,this.maxBarWidth=22,this.showLabels=!0}render(){return I`
      <div
        class="bars"
        style="height:${this.height}px"
        role="img"
        aria-label="Daily cost — energy used stacked on the standing charge"
      >
        ${this.bars.map(e=>this._renderBar(e))}
      </div>
      ${this.showLabels?I`<div class="labels">
              ${this.bars.map(e=>I`<span class="label">${e.label}</span>`)}
            </div>`:q}
    `}_renderBar(e){const t=`${Se(e.usageCost+e.standCost)} · usage ${Se(e.usageCost)} + standing ${Se(e.standCost)}`;return I`
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
    `}}Re.styles=[Oe,Ue],e([he({type:Array})],Re.prototype,"bars",void 0),e([he()],Re.prototype,"usageColor",void 0),e([he()],Re.prototype,"standColor",void 0),e([he({type:Number})],Re.prototype,"height",void 0),e([he({type:Number})],Re.prototype,"maxBarWidth",void 0),e([he({type:Boolean})],Re.prototype,"showLabels",void 0),customElements.get("eon-stacked-bar-chart")||customElements.define("eon-stacked-bar-chart",Re);const Le=n`/* Shared building blocks for the redesigned dashboard pages. */

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
`,Fe=n`.greeting {
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
`;class Be extends oe{constructor(){super(...arguments),this.summary=null,this.refreshToken=0,this.showProjection=!0,this.showStandingCallout=!0,this.showMeterHealth=!0,this._history={},this._backfill=new fe(this,e=>ue(e)),this._fetchedToken=-1,this._fetching=new Set}updated(e){if(!this.hass||!this.summary)return;this.refreshToken!==this._fetchedToken&&(this._fetchedToken=this.refreshToken,this._history={},this._fetching.clear());const t=(new Date).getDate(),s=Math.min(62,t+31);for(const e of this.summary.meters){const t=e.serial;!t||this._history[t]||this._fetching.has(t)||this._fetch(t,s)}}async _fetch(e,t){this._fetching.add(e);try{const s=await ge(this.hass,e,t);this._history={...this._history,[e]:s.entries}}catch{this._history={...this._history,[e]:[]}}finally{this._fetching.delete(e)}}_split(e){return e?.serial?function(e,t,s,i){const a=t??0,r=s??0,n=i.getFullYear(),o=i.getMonth();let l=0,d=0,c=0;for(const t of e){const e=new Date(`${t.date}T00:00:00`);isNaN(e.getTime())||e.getFullYear()===n&&e.getMonth()===o&&(l+=Math.max(0,t.consumption)*a,d+=r,c++)}return{usage:Pe(l),standing:Pe(d),total:Pe(l+d),days:c}}(this._history[e.serial]??[],e.unit_rate,e.standing_charge,new Date):{usage:0,standing:0,total:0,days:0}}_nav(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{page:e},bubbles:!0,composed:!0}))}render(){if(!this.summary)return I`<div class="placeholder">Loading…</div>`;const e=new Date,t=this.hass?.language??"en",s=ve(this.summary,"electricity"),i=ve(this.summary,"gas"),a=this._split(s),r=this._split(i),n=Pe(a.usage+r.usage),o=Pe(a.standing+r.standing),l=Pe(n+o),d=e.toLocaleDateString(t,{month:"long"}),c=Math.max(a.days,r.days,e.getDate()),h=c>0?Pe(l/c):0;return I`
      <div class="page">
        <div class="greeting">
          ${function(e){const t=e.getHours();return t<12?"Good morning":t<18?"Good afternoon":"Good evening"}(e)} ·
          ${e.toLocaleDateString(t,{weekday:"long",day:"numeric",month:"long"})}
        </div>

        ${this._renderHero(d,l,n,o,c,h)}
        ${this._renderFuelCards(s,a,i,r)}
        ${this._renderTariffAndHealth(s,i)}
      </div>
    `}_renderHero(e,t,s,i,a,r){const n=t>0?s/t*100:0,o=t>0?i/t*100:0,l=t>0?i/t:0;return I`
      <div class="card hero">
        <div class="hero-top">
          <div>
            <div class="muted hero-label">
              Spent so far in ${e} · gas + electricity
            </div>
            <div class="serif hero-total">${Se(t)}</div>
            <div class="hero-sub">
              ${a} day${1===a?"":"s"} in · about
              <b>${Se(r)}</b> a day
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
              Energy used <b class="split-val">${Se(s)}</b>
            </span>
            <span class="legend-item">
              <span
                class="legend-swatch"
                style="background:var(--eon-elec-standing)"
              ></span>
              Standing charge <b class="split-val">${Se(i)}</b>
            </span>
          </div>
          ${this.showStandingCallout&&l>=.4&&i>0?I`<div class="callout hero-callout">
                  ${l>=.5?"Over half":"A large part"} of this month's bill
                  —
                  <b>${Se(i)}</b> — is the fixed daily standing charge
                  you pay before using anything.
                </div>`:q}
        </div>
      </div>
    `}_renderProjection(e){if(!this.showProjection)return q;const t=new Date,s=function(e,t){const s=t.getDate(),i=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();return s<=0?e:Pe(e/s*i)}(e,t),i=this.summary?.meters??[];let a=0,r=i.length>0;for(const e of i){const s=e.serial?this._history[e.serial]??null:null,i=s?Me(s,e.unit_rate,e.standing_charge,t).previousMonth:null;if(null==i){r=!1;break}a+=i}const n=r?Pe(s-Pe(a)):null;return I`
      <div class="projection">
        <div class="muted proj-label">On track for</div>
        <div class="serif proj-value">~${Se(s)}</div>
        ${null!=n?I`<span class="pill pill--green proj-pill">
                ${n<=0?"▼":"▲"} ${Se(Math.abs(n))} vs last month
              </span>`:q}
      </div>
    `}_renderFuelCards(e,t,s,i){return I`
      <div class="grid-2">
        ${this._renderFuelCard("electricity",e,t)}
        ${this._renderFuelCard("gas",s,i)}
      </div>
    `}_renderFuelCard(e,t,s){const i=ye[e];if(!t)return I`<div class="card fuel-card">
        <div class="muted">No ${i.label.toLowerCase()} meter.</div>
      </div>`;const a=Ne((t.serial?this._history[t.serial]??[]:[]).slice(-7),t.unit_rate,t.standing_charge,7,this.hass?.language??"en");return I`
      <button
        class="card fuel-card card--clickable"
        @click=${()=>this._nav("gas"===e?"gas":"elec")}
      >
        <div class="fuel-head">
          <div class="fuel-name">
            <span class="tile ${i.tileClass}">
              <ha-icon .icon=${i.icon} style="--mdc-icon-size:16px"></ha-icon>
            </span>
            <div>
              <div class="fuel-label">${i.label}</div>
              <div class="mono fuel-serial">${t.serial??"—"}</div>
            </div>
          </div>
          <div class="serif fuel-cost">${Se(s.total)}</div>
        </div>
        ${a.length?I`<eon-stacked-bar-chart
                class="fuel-chart"
                .bars=${a}
                usageColor=${i.usageColor}
                standColor=${i.standColor}
                .height=${88}
                .maxBarWidth=${13}
                ?showLabels=${!1}
              ></eon-stacked-bar-chart>`:I`<div class="fuel-chart-empty"></div>`}
        <div class="fuel-foot muted">
          <span>${Te(t.unit_rate)} /kWh</span>
          <span>${Te(t.standing_charge,0)} /day standing</span>
        </div>
      </button>
    `}_renderTariffAndHealth(e,t){return I`
      <div class="tariff-health">
        ${this._renderTariffCard(e,t)}
        ${this.showMeterHealth?this._renderHealthCard(e??t):q}
      </div>
    `}_renderTariffCard(e,t){const s=e?.tariff_name??t?.tariff_name??"Tariff unavailable",i=Ae(this.hass,e?.serial??null)||Ae(this.hass,t?.serial??null);return I`
      <button
        class="card card--dark tariff-card card--clickable"
        @click=${()=>this._nav("tariff")}
      >
        <div class="tariff-head">
          <div>
            <div class="eyebrow">Your tariff</div>
            <div class="serif tariff-name">${s}</div>
          </div>
          <span class="pill pill--dark">${i?"Time-of-use":"Flat rate"}</span>
        </div>
        <div class="tariff-stats">
          <div>
            <div class="tariff-stat-value">${Ee(e?.unit_rate)}</div>
            <div class="tariff-stat-label">Electricity /kWh</div>
          </div>
          <div>
            <div class="tariff-stat-value">${Ee(t?.unit_rate)}</div>
            <div class="tariff-stat-label">Gas /kWh</div>
          </div>
          <div class="tariff-note">
            <div class="accent">
              ${i?"Off-peak window available":"No cheaper window today"}
            </div>
            <div class="tariff-stat-label">
              ${i?"shift usage to save":"same price around the clock"}
            </div>
          </div>
        </div>
      </button>
    `}_renderHealthCard(e){const t=this.hass?.language??"en",s=this._backfill.data,i=s&&s.total_meters>0?Math.round(s.completed_meters/s.total_meters*100):!1===s?.enabled?0:100,a=this.summary?.meters.length??0,r=null!=e?.latest_reading?`${e.latest_reading.toLocaleString(t)} · ${ze(e.latest_reading_date,t)}`:"—";return I`
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
            >100% · ${a} meter${1===a?"":"s"}</span
          >
        </div>
        <div class="health-backfill">
          <div class="health-backfill-head faint">
            <span>Historical backfill</span>
            <span>${i}%${i>=100?" · done":""}</span>
          </div>
          <div class="progress">
            <div class="progress-fill" style="width:${i}%"></div>
          </div>
        </div>
      </div>
    `}}Be.styles=[Oe,Le,Fe],e([he({attribute:!1})],Be.prototype,"hass",void 0),e([he({attribute:!1})],Be.prototype,"summary",void 0),e([he({type:Number})],Be.prototype,"refreshToken",void 0),e([he({type:Boolean})],Be.prototype,"showProjection",void 0),e([he({type:Boolean})],Be.prototype,"showStandingCallout",void 0),e([he({type:Boolean})],Be.prototype,"showMeterHealth",void 0),e([pe()],Be.prototype,"_history",void 0),customElements.get("eon-overview-page")||customElements.define("eon-overview-page",Be);const Ie=n`.range-picker {
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

.range-btn.active {
  background: var(--eon-primary);
  color: #fff;
}
`,We=[{label:"7d",value:7},{label:"30d",value:30},{label:"90d",value:90},{label:"1y",value:365}];class qe extends oe{constructor(){super(...arguments),this.value=7,this.options=We}render(){const e=this.options.findIndex(e=>e.value===this.value),t=e>=0?e:0;return I`
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
    `}_select(e){e!==this.value&&(this.value=e,this.dispatchEvent(new CustomEvent("range-changed",{detail:{value:e},bubbles:!0,composed:!0})))}_onKeydown(e,t){let s=null;if("ArrowLeft"===e.key||"ArrowUp"===e.key?s=(t-1+this.options.length)%this.options.length:"ArrowRight"===e.key||"ArrowDown"===e.key?s=(t+1)%this.options.length:"Home"===e.key?s=0:"End"===e.key?s=this.options.length-1:" "!==e.key&&"Enter"!==e.key||(s=t),null==s)return;e.preventDefault();const i=this.options[s]?.value;null!=i&&(this._select(i),this.updateComplete.then(()=>{const e=this.renderRoot.querySelectorAll(".range-btn");e[s]?.focus()}))}}qe.styles=[Ie],e([he({type:Number})],qe.prototype,"value",void 0),e([he({type:Array})],qe.prototype,"options",void 0),customElements.get("eon-range-picker")||customElements.define("eon-range-picker",qe);const Ve=n`.detail-header {
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
`;class Ye extends oe{constructor(){super(...arguments),this.meter=null,this.refreshToken=0,this._days=30,this._history=[],this._loading=!0,this._fetchedSerial=null,this._fetchedDays=0,this._fetchedToken=-1,this._requestId=0,this._memoHistory=null,this._memoDays=-1,this._memoRate=void 0,this._memoStanding=void 0,this._memoBars=[],this._memoMonthToDate=0}get kind(){return me(this.meter?.type??null)}updated(e){if(!this.hass||!this.meter?.serial)return;const t=this._daysToFetch();(this.meter.serial!==this._fetchedSerial||t!==this._fetchedDays||this.refreshToken!==this._fetchedToken||e.has("meter"))&&this._fetch(t)}_daysToFetch(){const e=(new Date).getDate();return Math.max(this._days,e)}async _fetch(e){this._fetchedSerial=this.meter.serial,this._fetchedDays=e,this._fetchedToken=this.refreshToken,this._loading=!0;const t=++this._requestId;try{const s=await ge(this.hass,this.meter.serial,e);if(t!==this._requestId)return;this._history=s.entries}catch{if(t!==this._requestId)return;this._history=[]}this._loading=!1}_onRange(e){this._days=e.detail.value}_ensureComputed(){const e=this.meter?.unit_rate,t=this.meter?.standing_charge;if(this._memoHistory===this._history&&this._memoDays===this._days&&this._memoRate===e&&this._memoStanding===t)return;this._memoHistory=this._history,this._memoDays=this._days,this._memoRate=e,this._memoStanding=t;const s=this.hass?.language??"en",i=this._history.slice(-this._days);this._memoBars=this._days>=365?function(e,t,s,i="en"){const a=t??0,r=s??0,n=new Map;for(const t of e){const e=new Date(`${t.date}T00:00:00`);if(isNaN(e.getTime()))continue;const s=`${e.getFullYear()}-${e.getMonth()}`,i=n.get(s)??{kwh:0,days:0,date:new Date(e.getFullYear(),e.getMonth(),1)};i.kwh+=Math.max(0,t.consumption),i.days+=1,n.set(s,i)}const o=[...n.values()].sort((e,t)=>e.date.getTime()-t.date.getTime()),l=o.map(e=>({date:e.date,usageCost:e.kwh*a,standCost:e.days*r})),d=Math.max(1e-4,...l.map(e=>e.usageCost+e.standCost));return l.map(e=>({usagePct:e.usageCost/d*100,standPct:e.standCost/d*100,usageCost:e.usageCost,standCost:e.standCost,label:e.date.toLocaleDateString(i,{month:"narrow"})}))}(this._history,e,t,s):Ne(i,e,t,this._days,s),this._memoMonthToDate=Me(this._history,e,t,new Date).monthToDate}render(){if(!this.meter)return I`<div class="placeholder">No meter available.</div>`;this._ensureComputed();const e=this.kind,t=ye[e],s=Te(this.meter.standing_charge,0);return I`
      <div class="page">
        ${this._renderHeader(t)}
        ${this._renderChartCard(e,this._memoBars,t,s)}
        ${this._renderStats(s)} ${this._renderReadingStrip(e)}
      </div>
    `}_renderHeader(e){const t=Ae(this.hass,this.meter?.serial??null),s="gas"===this.kind?"Import · volume m³ → kWh":t?"Import · time-of-use":"Import · single rate";return I`
      <div class="detail-header">
        <div class="meter-id">
          <span class="tile ${e.tileClass}">
            <ha-icon .icon=${e.icon} style="--mdc-icon-size:18px"></ha-icon>
          </span>
          <div>
            <div class="mono meter-serial">Meter ${this.meter?.serial??"—"}</div>
            <div class="muted meter-descriptor">${s}</div>
          </div>
        </div>
        <eon-range-picker
          .value=${this._days}
          @range-changed=${this._onRange}
        ></eon-range-picker>
      </div>
    `}_renderChartCard(e,t,s,i){return I`
      <div class="card chart-card">
        <div class="chart-title-row">
          <div class="chart-title">Daily cost — usage &amp; standing charge</div>
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
            Standing charge (${i} / day, fixed)
          </span>
        </div>
        ${"gas"===e?I`<div class="callout">
                In summer barely any gas is used — nearly every bar is
                <b>pure standing charge</b>. Heating usage grows the caps again from
                autumn.
              </div>`:q}
        <div class="footnote faint">
          Costs use today's unit rate applied to historical usage — an approximation, as
          no historical rate series is available.
        </div>
      </div>
    `}_renderStats(e){return I`
      <div class="grid-4">
        ${this._statCard("This month",Se(this._memoMonthToDate))}
        ${this._statCard("Yesterday",Se(this.meter?.previous_day_cost))}
        ${this._statCard("Unit rate",Te(this.meter?.unit_rate),"per kWh")}
        ${this._statCard("Standing",e,"per day")}
      </div>
    `}_statCard(e,t,s){return I`
      <div class="card card--stat">
        <div class="stat-label">${e}</div>
        <div class="stat-value">${t}</div>
        ${s?I`<div class="stat-sub">${s}</div>`:q}
      </div>
    `}_renderReadingStrip(e){const t=this.meter?.latest_reading;if(null==t)return q;const s=this.hass?.language??"en",i=`${"gas"===e?"Volume":"Register"} read · ${ze(this.meter?.latest_reading_date,s)}`;return I`
      <div class="card reading-strip">
        <div>
          <div class="reading-title">Latest meter reading</div>
          <div class="faint reading-descriptor">${i}</div>
        </div>
        <div class="mono reading-value">
          ${t.toLocaleString(s)}
          <span class="reading-unit faint">kWh</span>
        </div>
      </div>
    `}_rangeLabel(){return{7:"Last 7 days",30:"Last 30 days",90:"Last 90 days",365:"Last 12 months"}[this._days]??`Last ${this._days} days`}}Ye.styles=[Oe,Le,Ve],e([he({attribute:!1})],Ye.prototype,"hass",void 0),e([he({attribute:!1})],Ye.prototype,"meter",void 0),e([he({type:Number})],Ye.prototype,"refreshToken",void 0),e([pe()],Ye.prototype,"_days",void 0),e([pe()],Ye.prototype,"_history",void 0),e([pe()],Ye.prototype,"_loading",void 0),customElements.get("eon-meter-detail-page")||customElements.define("eon-meter-detail-page",Ye);const Ge=n`:host {
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
`;class Ke extends oe{constructor(){super(...arguments),this.bars=[],this.height=64,this.nowFraction=null,this.axis=[],this.ariaLabel="Half-hourly chart"}render(){return I`
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
              </div>`:q}
      </div>
      ${this.axis.length?I`<div class="axis mono">
              ${this.axis.map(e=>I`<span>${e}</span>`)}
            </div>`:q}
    `}}Ke.styles=[Oe,Ge],e([he({type:Array})],Ke.prototype,"bars",void 0),e([he({type:Number})],Ke.prototype,"height",void 0),e([he({type:Number})],Ke.prototype,"nowFraction",void 0),e([he({type:Array})],Ke.prototype,"axis",void 0),e([he()],Ke.prototype,"ariaLabel",void 0),customElements.get("eon-halfhour-strip")||customElements.define("eon-halfhour-strip",Ke);const Je=n`.chart-title-row {
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
`;class Ze extends oe{constructor(){super(...arguments),this.summary=null}render(){const e=ve(this.summary,"electricity"),t=ve(this.summary,"gas"),s=Ae(this.hass,e?.serial??null)||Ae(this.hass,t?.serial??null);return I`
      <div class="page">
        ${this._renderTariffCard(e,t,s)} ${this._renderRateStrip(e,s)}
        ${this._renderTimelines(e,t)}
      </div>
    `}_renderTariffCard(e,t,s){const i=this.hass?.language??"en",a=e?.tariff_name??t?.tariff_name??"Tariff unavailable",r=$e(this.hass,"sensor",e?.serial??t?.serial??null,"current_tariff"),n=Ce(r,"tariff_valid_from"),o=Ce(r,"tariff_valid_to"),l=Ce(r,"tariff_type"),d=[];return l&&d.push(l),n&&d.push(`started ${Qe(n,i)}`),o&&d.push(`locked until ${Qe(o,i)}`),I`
      <div class="card card--dark tariff-hero">
        <div class="tariff-hero-head">
          <div>
            <div class="eyebrow">Current tariff</div>
            <div class="serif tariff-hero-name">${a}</div>
            ${d.length?I`<div class="tariff-hero-dates">${d.join(" · ")}</div>`:q}
          </div>
          <span class="pill pill--dark tariff-hero-pill">
            ${s?"Time-of-use":"Flat rate · no off-peak"}
          </span>
        </div>
        <div class="tariff-hero-stats">
          ${this._heroStat("Electricity unit",Ee(e?.unit_rate),"per kWh","var(--eon-elec)")}
          ${this._heroStat("Elec standing",Ee(e?.standing_charge),"per day","var(--eon-elec-standing)")}
          ${this._heroStat("Gas unit",Ee(t?.unit_rate),"per kWh","var(--eon-gas)")}
          ${this._heroStat("Gas standing",Ee(t?.standing_charge),"per day","var(--eon-gas-standing)")}
        </div>
      </div>
    `}_heroStat(e,t,s,i){return I`
      <div class="hero-stat" style="border-left-color:${i}">
        <div class="tariff-stat-label">${e}</div>
        <div class="serif hero-stat-value">${t}</div>
        <div class="hero-stat-sub">${s}</div>
      </div>
    `}_renderRateStrip(e,t){const s=function(e,t){const s=$e(e,"event",t,"current_day_rates"),i=s?.attributes?.rates;if(!Array.isArray(i))return[];const a=[];for(const e of i){if(!e||"object"!=typeof e)continue;const t=e,s=Number(t.rate);Number.isFinite(s)&&a.push({start:"string"==typeof t.start?t.start:"",end:"string"==typeof t.end?t.end:"",rate:s,isOffPeak:!0===t.is_off_peak})}return a}(this.hass,e?.serial??null),i=function(e,t){const s=[],i=[],a=new Date;a.setHours(0,0,0,0);for(let r=0;r<48;r++){const n=new Date(a.getTime()+30*r*6e4),o=new Date(n.getTime()+9e5);let l=t??0,d=!1;for(const t of e){const e=new Date(t.start),s=new Date(t.end);if(!isNaN(e.getTime())&&!isNaN(s.getTime())&&(o>=e&&o<s)){l=t.rate,d=t.isOffPeak;break}}s.push(l),i.push(d)}const r=Math.min(...s),n=Math.max(...s),o=n-r<1e-6;return s.map((e,t)=>({heightPct:o?72:45+(e-r)/(n-r)*50,color:i[t]?"var(--eon-green-light)":"var(--eon-elec-tile)"}))}(s,e?.unit_rate??null),a=new Date,r=(60*a.getHours()+a.getMinutes())/1440,n=t?"Varies through the day":`Flat · ${Te(e?.unit_rate)}/kWh all day`;return I`
      <div class="card rate-strip-card">
        <div class="chart-title-row">
          <div class="chart-title">Today's electricity rate</div>
          <div class="muted rate-headline">${n}</div>
        </div>
        <eon-halfhour-strip
          .bars=${i}
          .height=${64}
          .nowFraction=${r}
          .axis=${["00:00","06:00","12:00","18:00","24:00"]}
          ariaLabel="Today's electricity rate by half-hour"
        ></eon-halfhour-strip>
        ${t?q:I`<div class="callout rate-callout">
                You're on a fixed tariff, so there's no cheaper window — the price is
                identical every half-hour. On a time-of-use tariff this strip would shade
                the off-peak hours automatically.
              </div>`}
      </div>
    `}_renderTimelines(e,t){return I`
      <div class="grid-2">
        ${this._renderTimeline("Electricity",e,"var(--eon-elec)")}
        ${this._renderTimeline("Gas",t,"var(--eon-gas)")}
      </div>
    `}_renderTimeline(e,t,s){const i=this.hass?.language??"en",a=t?.serial??null,r=ke(this.hass,a,"previous_unit_rate"),n=ke(this.hass,a,"next_unit_rate"),o=t?.unit_rate??null;return I`
      <div class="card timeline-card">
        <div class="timeline-title">${e} rate timeline</div>
        ${this._timelineRow("Previous",r.rate,r.validTo?`→ ${Qe(r.validTo,i)}`:"",!1,s)}
        ${this._timelineRow("Current",o,r.validTo?`from ${Qe(r.validTo,i)}`:"",!0,s)}
        ${this._timelineRow("Next",n.rate??o,null==n.rate?"fixed":n.validFrom?`from ${Qe(n.validFrom,i)}`:"",!1,s)}
      </div>
    `}_timelineRow(e,t,s,i,a){return I`
      <div class="timeline-row ${i?"timeline-row--current":""}">
        <span class="muted">${e}</span>
        <span class="timeline-rate" style=${i?`color:${a}`:""}>
          ${Te(t)}
          ${s?I`<span class="faint timeline-note">${s}</span>`:q}
        </span>
      </div>
    `}}function Qe(e,t){const s=new Date(e.length<=10?`${e}T00:00:00`:e);return isNaN(s.getTime())?e:s.toLocaleDateString(t,{day:"numeric",month:"short",year:"numeric"})}Ze.styles=[Oe,Le,Je],e([he({attribute:!1})],Ze.prototype,"hass",void 0),e([he({attribute:!1})],Ze.prototype,"summary",void 0),customElements.get("eon-tariff-page")||customElements.define("eon-tariff-page",Ze);const Xe=n`.ev-banner {
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
`;class et extends oe{constructor(){super(...arguments),this.deviceId="",this.refreshToken=0,this._data=null,this._loading=!0,this._error=!1,this._fetchedDeviceId=null,this._fetchedToken=-1}updated(e){this.hass&&this.deviceId&&(this.deviceId===this._fetchedDeviceId&&this.refreshToken===this._fetchedToken||this._fetch())}async _fetch(){this._fetchedDeviceId=this.deviceId,this._fetchedToken=this.refreshToken,this._loading=!0,this._error=!1;try{this._data=await async function(e,t){return e.callWS({type:"eon_next/ev_schedule",device_id:t})}(this.hass,this.deviceId)}catch{this._error=!0,this._data=null}this._loading=!1}render(){if(!this.deviceId)return I`<div class="placeholder">No EV charger available.</div>`;if(this._loading&&!this._data)return I`<div class="placeholder">Loading EV schedule…</div>`;if(this._error||!this._data)return I`<div class="placeholder">Unable to load EV schedule.</div>`;const{status:e,slots:t}=this._data,s="scheduled"===e||"active"===e;return I`
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
            ${e?"Schedule optimised for the cheapest overnight slots":"No charge scheduled — plug in to schedule a cheap overnight charge"}
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
      </div>`;const i=new Date(t.start),a=new Date(t.end),r=`${tt(i)} → ${tt(a)}`,n=function(e,t){const s=Math.round((t.getTime()-e.getTime())/6e4);if(!Number.isFinite(s)||s<=0)return"scheduled";const i=Math.floor(s/60),a=s%60,r=0===a?`${i} hr`:`${(s/60).toFixed(1)} hr`;return`${r} window`}(i,a),o=`${function(e,t){if(isNaN(e.getTime()))return"";const s=new Date,i=new Date(s.getFullYear(),s.getMonth(),s.getDate()),a=new Date(e.getFullYear(),e.getMonth(),e.getDate()),r=Math.round((a.getTime()-i.getTime())/864e5);return r<=0?e.getHours()>=18||e.getHours()<6?"Tonight":"Today":1===r?"Tomorrow":e.toLocaleDateString(t,{weekday:"short"})}(i,s)} · ${n}`;return I`
      <div class="card card--stat charge-card">
        <div class="muted charge-label">${e}</div>
        <div class="serif charge-value">${r}</div>
        <div class="charge-desc">${o}</div>
      </div>
    `}_renderSchedule(e){const t=function(e){const t=new Date;t.setHours(18,0,0,0);const s=e.map(e=>[new Date(e.start).getTime(),new Date(e.end).getTime()]).filter(([e,t])=>Number.isFinite(e)&&Number.isFinite(t)&&t>e),i=[];for(let e=0;e<48;e++){const a=t.getTime()+30*e*6e4,r=a+18e5,n=s.some(([e,t])=>e<r&&t>a);i.push({heightPct:n?90:18,color:n?"var(--eon-green)":"var(--eon-hairline)"})}return i}(e);return I`
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
    `}}function tt(e){return isNaN(e.getTime())?"—":`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`}et.styles=[Oe,Le,Xe],e([he({attribute:!1})],et.prototype,"hass",void 0),e([he()],et.prototype,"deviceId",void 0),e([he({type:Number})],et.prototype,"refreshToken",void 0),e([pe()],et.prototype,"_data",void 0),e([pe()],et.prototype,"_loading",void 0),e([pe()],et.prototype,"_error",void 0),customElements.get("eon-ev-page")||customElements.define("eon-ev-page",et);const st=n`/* Shared styles using HA CSS custom properties for automatic theme support. */

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
`,it=n`.backfill-header {
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
`;class at extends oe{constructor(){super(...arguments),this._data=new fe(this,e=>ue(e))}render(){if(this._data.loading)return I`
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
            </div>`:q}
      ${e.next_start_date?I`<div class="status-row">
              <span class="label">Next backfill from</span>
              <span class="value">${e.next_start_date}</span>
            </div>`:q}
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
            </div>`:q}
    `}}at.styles=[st,it],e([he({attribute:!1})],at.prototype,"hass",void 0),customElements.get("eon-backfill-status")||customElements.define("eon-backfill-status",at);const rt=n`.intro {
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
`;class nt extends oe{constructor(){super(...arguments),this.version=null}render(){return I`
      <div class="page">
        <div class="card intro">
          <div class="serif intro-title">Settings</div>
          <div class="muted intro-body">
            Account details, the integration refresh interval and backfill controls are
            managed from the E.ON Next integration's options in Home Assistant.
          </div>
          ${this.version?I`<div class="faint version">Version ${this.version}</div>`:q}
        </div>

        <div class="card">
          <eon-backfill-status .hass=${this.hass}></eon-backfill-status>
        </div>
      </div>
    `}}nt.styles=[Oe,Le,rt],e([he({attribute:!1})],nt.prototype,"hass",void 0),e([he()],nt.prototype,"version",void 0),customElements.get("eon-settings-page")||customElements.define("eon-settings-page",nt);const ot=n`:host {
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

.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--eon-elec);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
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

/* Sidebar toggle — the only way back to the HA menu inside the iOS Companion
   app, where the panel fills the webview. ha-menu-button hides itself when the
   sidebar is already docked. */
.menu-button {
  --mdc-icon-button-size: 40px;
  color: var(--eon-text);
  margin-left: -8px;
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
`;class lt extends oe{constructor(){super(...arguments),this.narrow=!1,this._page="overview",this._lastUpdated=null,this._refreshToken=0,this._version=new fe(this,e=>async function(e){return e.callWS({type:"eon_next/version"})}(e)),this._summary=new fe(this,e=>async function(e){return e.callWS({type:"eon_next/dashboard_summary"})}(e)),this._hadData=!1,this._navigate=e=>{this._page=e},this._onNavigateEvent=e=>{this._navigate(e.detail.page)},this._refresh=()=>{this._refreshToken++,this._lastUpdated=new Date,this._summary.refresh(),this._version.refresh()}}connectedCallback(){super.connectedCallback(),this._ensureFonts()}updated(e){!this._summary.data||this._summary.loading||this._summary.refreshing||this._hadData||(this._hadData=!0,this._lastUpdated=new Date)}_ensureFonts(){const e=this.ownerDocument;if(!e||e.getElementById("eon-next-fonts"))return;const t=e.createElement("link");t.id="eon-next-fonts",t.rel="stylesheet",t.href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Mono&display=swap",e.head.appendChild(t)}render(){return I`
      <div class="shell" @navigate=${this._onNavigateEvent}>
        ${this._renderRail()}
        <main class="main">
          ${this._renderTopBar()}
          <div class="content">${this._renderPage()}</div>
        </main>
      </div>
    `}_renderRail(){const e=(t=this.hass,t?.states?we(_e(t.states,"account_balance",()=>{for(const[e,s]of Object.entries(t.states))if(e.startsWith("sensor.")&&e.endsWith("_account_balance"))return s;return null})):null);var t;return I`
      <nav class="rail" aria-label="Dashboard sections">
        <div class="brand">
          <div class="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 48 48" class="brand-bolt" focusable="false">
              <path d="M27 4 11 27h11l-2 17 18-24H26z" fill="#fff" />
            </svg>
          </div>
          <div>
            <div class="brand-name">EON Next</div>
            <div class="brand-sub mono">home energy</div>
          </div>
        </div>

        <div class="nav-items">
          ${He.map(e=>this._renderNavButton(e.page,e.label,e.icon))}
        </div>

        <div class="rail-bottom">
          ${null!=e?I`<div class="balance">
                  <div class="balance-label">Balance</div>
                  <div
                    class="serif balance-value ${e>=0?"balance--credit":"balance--debit"}"
                  >
                    ${Se(Math.abs(e))}
                  </div>
                  <div class="balance-sub">${e>=0?"in credit":"owed"}</div>
                </div>`:q}
          ${this._renderNavButton("settings","Settings","mdi:cog-outline")}
        </div>
      </nav>
    `}_renderNavButton(e,t,s){const i=this._page===e;return I`
      <button
        class="nav-item ${i?"nav-item--active":""}"
        aria-current=${i?"page":"false"}
        @click=${()=>this._navigate(e)}
      >
        <ha-icon .icon=${s} style="--mdc-icon-size:18px"></ha-icon>
        <span>${t}</span>
      </button>
    `}_renderTopBar(){const e=this._summary.refreshing?"Updating…":`Updated ${function(e){if(!e)return"—";const t=Math.max(0,Math.round((Date.now()-e.getTime())/1e3));if(t<45)return"just now";const s=Math.round(t/60);if(s<60)return`${s} min${1===s?"":"s"} ago`;const i=Math.round(s/60);if(i<24)return`${i} hr${1===i?"":"s"} ago`;const a=Math.round(i/24);return`${a} day${1===a?"":"s"} ago`}(this._lastUpdated)}`;return I`
      <header class="topbar">
        <div class="topbar-left">
          <ha-menu-button
            class="menu-button"
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></ha-menu-button>
          <h1 class="serif topbar-title">${je[this._page]}</h1>
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
      `;const i=this._refreshToken;switch(this._page){case"overview":return I`<eon-overview-page
          .hass=${this.hass}
          .summary=${e}
          .refreshToken=${i}
        ></eon-overview-page>`;case"elec":return I`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${ve(e,"electricity")}
          .refreshToken=${i}
        ></eon-meter-detail-page>`;case"gas":return I`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${ve(e,"gas")}
          .refreshToken=${i}
        ></eon-meter-detail-page>`;case"tariff":return I`<eon-tariff-page
          .hass=${this.hass}
          .summary=${e}
        ></eon-tariff-page>`;case"ev":return I`<eon-ev-page
          .hass=${this.hass}
          .deviceId=${e?.ev_chargers[0]?.device_id??""}
          .refreshToken=${i}
        ></eon-ev-page>`;case"settings":return I`<eon-settings-page
          .hass=${this.hass}
          .version=${this._version.data?.version??null}
        ></eon-settings-page>`}}}lt.styles=[Oe,ot],e([he({attribute:!1})],lt.prototype,"hass",void 0),e([he({type:Boolean})],lt.prototype,"narrow",void 0),e([he({attribute:!1})],lt.prototype,"route",void 0),e([he({attribute:!1})],lt.prototype,"panel",void 0),e([pe()],lt.prototype,"_page",void 0),e([pe()],lt.prototype,"_lastUpdated",void 0),e([pe()],lt.prototype,"_refreshToken",void 0),customElements.define("eon-next-panel",lt);
