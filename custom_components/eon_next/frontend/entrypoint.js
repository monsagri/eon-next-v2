function e(e,t,a,s){var i,r=arguments.length,n=r<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,a):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,a,s);else for(var o=e.length-1;o>=0;o--)(i=e[o])&&(n=(r<3?i(n):r>3?i(t,a,n):i(t,a))||n);return r>3&&n&&Object.defineProperty(t,a,n),n}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,a=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),i=new WeakMap;let r=class{constructor(e,t,a){if(this._$cssResult$=!0,a!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(a&&void 0===e){const a=void 0!==t&&1===t.length;a&&(e=i.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),a&&i.set(t,e))}return e}toString(){return this.cssText}};const n=(e,...t)=>{const a=1===e.length?e[0]:t.reduce((t,a,s)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(a)+e[s+1],e[0]);return new r(a,e,s)},o=a?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const a of e.cssRules)t+=a.cssText;return(e=>new r("string"==typeof e?e:e+"",void 0,s))(t)})(e):e,{is:l,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,g=globalThis,f=g.trustedTypes,v=f?f.emptyScript:"",m=g.reactiveElementPolyfillSupport,b=(e,t)=>e,x={toAttribute(e,t){switch(t){case Boolean:e=e?v:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let a=e;switch(t){case Boolean:a=null!==e;break;case Number:a=null===e?null:Number(e);break;case Object:case Array:try{a=JSON.parse(e)}catch(e){a=null}}return a}},y=(e,t)=>!l(e,t),_={attribute:!0,type:String,converter:x,reflect:!1,useDefault:!1,hasChanged:y};Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const a=Symbol(),s=this.getPropertyDescriptor(e,a,t);void 0!==s&&d(this.prototype,e,s)}}static getPropertyDescriptor(e,t,a){const{get:s,set:i}=c(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:s,set(t){const r=s?.call(this);i?.call(this,t),this.requestUpdate(e,r,a)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const e=u(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const e=this.properties,t=[...h(e),...p(e)];for(const a of t)this.createProperty(a,e[a])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,a]of t)this.elementProperties.set(e,a)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const a=this._$Eu(e,t);void 0!==a&&this._$Eh.set(a,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const a=new Set(e.flat(1/0).reverse());for(const e of a)t.unshift(o(e))}else void 0!==e&&t.push(o(e));return t}static _$Eu(e,t){const a=t.attribute;return!1===a?void 0:"string"==typeof a?a:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const a of t.keys())this.hasOwnProperty(a)&&(e.set(a,this[a]),delete this[a]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,s)=>{if(a)e.adoptedStyleSheets=s.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const a of s){const s=document.createElement("style"),i=t.litNonce;void 0!==i&&s.setAttribute("nonce",i),s.textContent=a.cssText,e.appendChild(s)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,a){this._$AK(e,a)}_$ET(e,t){const a=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,a);if(void 0!==s&&!0===a.reflect){const i=(void 0!==a.converter?.toAttribute?a.converter:x).toAttribute(t,a.type);this._$Em=e,null==i?this.removeAttribute(s):this.setAttribute(s,i),this._$Em=null}}_$AK(e,t){const a=this.constructor,s=a._$Eh.get(e);if(void 0!==s&&this._$Em!==s){const e=a.getPropertyOptions(s),i="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:x;this._$Em=s;const r=i.fromAttribute(t,e.type);this[s]=r??this._$Ej?.get(s)??r,this._$Em=null}}requestUpdate(e,t,a,s=!1,i){if(void 0!==e){const r=this.constructor;if(!1===s&&(i=this[e]),a??=r.getPropertyOptions(e),!((a.hasChanged??y)(i,t)||a.useDefault&&a.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,a))))return;this.C(e,t,a)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:a,reflect:s,wrapped:i},r){a&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),!0!==i||void 0!==r)||(this._$AL.has(e)||(this.hasUpdated||a||(t=void 0),this._$AL.set(e,t)),!0===s&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,a]of e){const{wrapped:e}=a,s=this[t];!0!==e||this._$AL.has(t)||void 0===s||this.C(t,void 0,a,s)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,m?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,k=e=>e,A=w.trustedTypes,C=A?A.createPolicy("lit-html",{createHTML:e=>e}):void 0,S="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,E="?"+T,z=`<${E}>`,N=document,D=()=>N.createComment(""),M=e=>null===e||"object"!=typeof e&&"function"!=typeof e,P=Array.isArray,H="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,j=/>/g,O=RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),L=/'/g,F=/"/g,I=/^(?:script|style|textarea|title)$/i,B=(e=>(t,...a)=>({_$litType$:e,strings:t,values:a}))(1),q=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),V=new WeakMap,Y=N.createTreeWalker(N,129);function G(e,t){if(!P(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(t):t}const K=(e,t)=>{const a=e.length-1,s=[];let i,r=2===t?"<svg>":3===t?"<math>":"",n=U;for(let t=0;t<a;t++){const a=e[t];let o,l,d=-1,c=0;for(;c<a.length&&(n.lastIndex=c,l=n.exec(a),null!==l);)c=n.lastIndex,n===U?"!--"===l[1]?n=R:void 0!==l[1]?n=j:void 0!==l[2]?(I.test(l[2])&&(i=RegExp("</"+l[2],"g")),n=O):void 0!==l[3]&&(n=O):n===O?">"===l[0]?(n=i??U,d=-1):void 0===l[1]?d=-2:(d=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?O:'"'===l[3]?F:L):n===F||n===L?n=O:n===R||n===j?n=U:(n=O,i=void 0);const h=n===O&&e[t+1].startsWith("/>")?" ":"";r+=n===U?a+z:d>=0?(s.push(o),a.slice(0,d)+S+a.slice(d)+T+h):a+T+(-2===d?t:h)}return[G(e,r+(e[a]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),s]};class J{constructor({strings:e,_$litType$:t},a){let s;this.parts=[];let i=0,r=0;const n=e.length-1,o=this.parts,[l,d]=K(e,t);if(this.el=J.createElement(l,a),Y.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(s=Y.nextNode())&&o.length<n;){if(1===s.nodeType){if(s.hasAttributes())for(const e of s.getAttributeNames())if(e.endsWith(S)){const t=d[r++],a=s.getAttribute(e).split(T),n=/([.?@])?(.*)/.exec(t);o.push({type:1,index:i,name:n[2],strings:a,ctor:"."===n[1]?te:"?"===n[1]?ae:"@"===n[1]?se:ee}),s.removeAttribute(e)}else e.startsWith(T)&&(o.push({type:6,index:i}),s.removeAttribute(e));if(I.test(s.tagName)){const e=s.textContent.split(T),t=e.length-1;if(t>0){s.textContent=A?A.emptyScript:"";for(let a=0;a<t;a++)s.append(e[a],D()),Y.nextNode(),o.push({type:2,index:++i});s.append(e[t],D())}}}else if(8===s.nodeType)if(s.data===E)o.push({type:2,index:i});else{let e=-1;for(;-1!==(e=s.data.indexOf(T,e+1));)o.push({type:7,index:i}),e+=T.length-1}i++}}static createElement(e,t){const a=N.createElement("template");return a.innerHTML=e,a}}function Z(e,t,a=e,s){if(t===q)return t;let i=void 0!==s?a._$Co?.[s]:a._$Cl;const r=M(t)?void 0:t._$litDirective$;return i?.constructor!==r&&(i?._$AO?.(!1),void 0===r?i=void 0:(i=new r(e),i._$AT(e,a,s)),void 0!==s?(a._$Co??=[])[s]=i:a._$Cl=i),void 0!==i&&(t=Z(e,i._$AS(e,t.values),i,s)),t}class Q{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:a}=this._$AD,s=(e?.creationScope??N).importNode(t,!0);Y.currentNode=s;let i=Y.nextNode(),r=0,n=0,o=a[0];for(;void 0!==o;){if(r===o.index){let t;2===o.type?t=new X(i,i.nextSibling,this,e):1===o.type?t=new o.ctor(i,o.name,o.strings,this,e):6===o.type&&(t=new ie(i,this,e)),this._$AV.push(t),o=a[++n]}r!==o?.index&&(i=Y.nextNode(),r++)}return Y.currentNode=N,s}p(e){let t=0;for(const a of this._$AV)void 0!==a&&(void 0!==a.strings?(a._$AI(e,a,t),t+=a.strings.length-2):a._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,a,s){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=a,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Z(this,e,t),M(e)?e===W||null==e||""===e?(this._$AH!==W&&this._$AR(),this._$AH=W):e!==this._$AH&&e!==q&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>P(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==W&&M(this._$AH)?this._$AA.nextSibling.data=e:this.T(N.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:a}=e,s="number"==typeof a?this._$AC(e):(void 0===a.el&&(a.el=J.createElement(G(a.h,a.h[0]),this.options)),a);if(this._$AH?._$AD===s)this._$AH.p(t);else{const e=new Q(s,this),a=e.u(this.options);e.p(t),this.T(a),this._$AH=e}}_$AC(e){let t=V.get(e.strings);return void 0===t&&V.set(e.strings,t=new J(e)),t}k(e){P(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let a,s=0;for(const i of e)s===t.length?t.push(a=new X(this.O(D()),this.O(D()),this,this.options)):a=t[s],a._$AI(i),s++;s<t.length&&(this._$AR(a&&a._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=k(e).nextSibling;k(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,a,s,i){this.type=1,this._$AH=W,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=i,a.length>2||""!==a[0]||""!==a[1]?(this._$AH=Array(a.length-1).fill(new String),this.strings=a):this._$AH=W}_$AI(e,t=this,a,s){const i=this.strings;let r=!1;if(void 0===i)e=Z(this,e,t,0),r=!M(e)||e!==this._$AH&&e!==q,r&&(this._$AH=e);else{const s=e;let n,o;for(e=i[0],n=0;n<i.length-1;n++)o=Z(this,s[a+n],t,n),o===q&&(o=this._$AH[n]),r||=!M(o)||o!==this._$AH[n],o===W?e=W:e!==W&&(e+=(o??"")+i[n+1]),this._$AH[n]=o}r&&!s&&this.j(e)}j(e){e===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===W?void 0:e}}class ae extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==W)}}class se extends ee{constructor(e,t,a,s,i){super(e,t,a,s,i),this.type=5}_$AI(e,t=this){if((e=Z(this,e,t,0)??W)===q)return;const a=this._$AH,s=e===W&&a!==W||e.capture!==a.capture||e.once!==a.once||e.passive!==a.passive,i=e!==W&&(a===W||s);s&&this.element.removeEventListener(this.name,this,a),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ie{constructor(e,t,a){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=a}get _$AU(){return this._$AM._$AU}_$AI(e){Z(this,e)}}const re=w.litHtmlPolyfillSupport;re?.(J,X),(w.litHtmlVersions??=[]).push("3.3.2");const ne=globalThis;class oe extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,a)=>{const s=a?.renderBefore??t;let i=s._$litPart$;if(void 0===i){const e=a?.renderBefore??null;s._$litPart$=i=new X(t.insertBefore(D(),e),e,void 0,a??{})}return i._$AI(e),i})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return q}}oe._$litElement$=!0,oe.finalized=!0,ne.litElementHydrateSupport?.({LitElement:oe});const le=ne.litElementPolyfillSupport;le?.({LitElement:oe}),(ne.litElementVersions??=[]).push("4.2.2");const de={attribute:!0,type:String,converter:x,reflect:!1,hasChanged:y},ce=(e=de,t,a)=>{const{kind:s,metadata:i}=a;let r=globalThis.litPropertyMetadata.get(i);if(void 0===r&&globalThis.litPropertyMetadata.set(i,r=new Map),"setter"===s&&((e=Object.create(e)).wrapped=!0),r.set(a.name,e),"accessor"===s){const{name:s}=a;return{set(a){const i=t.get.call(this);t.set.call(this,a),this.requestUpdate(s,i,e,!0,a)},init(t){return void 0!==t&&this.C(s,void 0,e,t),t}}}if("setter"===s){const{name:s}=a;return function(a){const i=this[s];t.call(this,a),this.requestUpdate(s,i,e,!0,a)}}throw Error("Unsupported decorator location: "+s)};function he(e){return(t,a)=>"object"==typeof a?ce(e,t,a):((e,t,a)=>{const s=t.hasOwnProperty(a);return t.constructor.createProperty(a,e),s?Object.getOwnPropertyDescriptor(t,a):void 0})(e,t,a)}function pe(e){return he({...e,state:!0,attribute:!1})}async function ue(e){return e.callWS({type:"eon_next/backfill_status"})}async function ge(e,t,a=7){return e.callWS({type:"eon_next/consumption_history",meter_serial:t,days:a})}const fe={name:"EON Next",sub:"home energy",logoPath:"M27 4 11 27h11l-2 17 18-24H26z",fontsUrl:"https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Mono&display=swap",fontsId:"eon-next-fonts"};class ve{constructor(e,t){this._host=e,this._fetcher=t,this.data=null,this.loading=!0,this.refreshing=!1,this.error=null,this._requestSeq=0,this._lastConnection=void 0,this._started=!1,this._host.addController(this)}hostConnected(){this._startTimer()}hostUpdated(){const e=this._host.hass;e&&(this._started?this._lastConnection!==e.connection&&(this._lastConnection=e.connection,this._fetch(e)):(this._started=!0,this._fetch(e)))}async refresh(){const e=this._host.hass;e&&await this._fetch(e)}_startTimer(){this._stopTimer(),this._timer=setInterval(()=>{const e=this._host.hass;e&&this._fetch(e)},3e5)}_stopTimer(){void 0!==this._timer&&(clearInterval(this._timer),this._timer=void 0)}async _fetch(e){const t=++this._requestSeq;this._lastConnection=e.connection,null===this.data?this.loading=!0:this.refreshing=!0,this.error=null,this._host.requestUpdate();try{const a=await this._fetcher(e);if(t!==this._requestSeq)return;this.data=a}catch(e){if(t!==this._requestSeq)return;this.error=e instanceof Error?e.message:String(e)}finally{t===this._requestSeq&&(this.loading=!1,this.refreshing=!1,this._host.requestUpdate())}}hostDisconnected(){this._stopTimer(),this._requestSeq++,this.data=null,this.loading=!0,this.refreshing=!1,this._lastConnection=void 0,this._started=!1}}let me={symbol:"£",minorSymbol:"p",minorScale:100,symbolBefore:!0};function be(e,t){return t.symbolBefore?`${t.symbol}${e}`:`${e}${t.symbol}`}function xe(e,t){return e?e.meters.find(e=>ye(e.type)===t)??null:null}function ye(e){return"gas"===e?"gas":"electricity"}const _e={electricity:{label:"Electricity",icon:"mdi:lightning-bolt",tileClass:"tile--elec",usageColor:"var(--eon-elec)",standColor:"var(--eon-elec-standing)"},gas:{label:"Gas",icon:"mdi:fire",tileClass:"tile--gas",usageColor:"var(--eon-gas)",standColor:"var(--eon-gas-standing)"}};function $e(e,t){if(!e)return{rate:null,validFrom:null,validTo:null};switch(t){case"current":return{rate:e.unit_rate,validFrom:e.unit_rate_valid_from,validTo:e.unit_rate_valid_to};case"previous":return{rate:e.previous_unit_rate,validFrom:e.previous_unit_rate_valid_from,validTo:e.previous_unit_rate_valid_to};case"next":return{rate:e.next_unit_rate,validFrom:e.next_unit_rate_valid_from,validTo:e.next_unit_rate_valid_to}}}function we(e){return e?.is_time_of_use??!1}function ke(e,t=2){return function(e,t=2,a=me){return null!=e&&Number.isFinite(e)?be(e.toFixed(t),a):"-"}(e,t)}function Ae(e,t=2){return function(e,t=2,a=me){return null!=e&&Number.isFinite(e)?`${(e*a.minorScale).toFixed(t)}${a.minorSymbol}`:"-"}(e,t)}function Ce(e){return function(e,t=4,a=me){return null!=e&&Number.isFinite(e)?be(e.toFixed(t),a):"-"}(e)}function Se(e,t="en"){if(!e)return"-";const a=new Date(e.length<=10?`${e}T00:00:00`:e);return isNaN(a.getTime())?e:a.toLocaleDateString(t,{day:"numeric",month:"short"})}function Te(e,t,a,s,i="en"){const r=t??0,n=a??0,o=e.map(e=>({date:e.date,usageCost:Math.max(0,e.consumption)*r,standCost:n})),l=Math.max(1e-4,...o.map(e=>e.usageCost+e.standCost));return o.map((t,a)=>({usagePct:t.usageCost/l*100,standPct:t.standCost/l*100,usageCost:t.usageCost,standCost:t.standCost,label:Ee(t.date,a,e.length,s,i)}))}function Ee(e,t,a,s,i){const r=new Date(`${e}T00:00:00`);if(isNaN(r.getTime()))return"";if(s<=14)return r.toLocaleDateString(i,{weekday:"short"});return t%(s<=31?5:15)!==0&&t!==a-1?"":r.toLocaleDateString(i,{day:"numeric",month:"short"})}function ze(e,t,a,s){const i=t??0,r=a??0,n=s.getFullYear(),o=s.getMonth(),l=new Date(n,o-1,1),d=l.getFullYear(),c=l.getMonth();let h=0,p=0,u=0,g=0;for(const t of e){const e=new Date(`${t.date}T00:00:00`);if(isNaN(e.getTime()))continue;const a=Math.max(0,t.consumption)*i+r;e.getFullYear()===n&&e.getMonth()===o?(h+=a,p++):e.getFullYear()===d&&e.getMonth()===c&&(u+=a,g++)}return{monthToDate:Ne(h),daysWithData:p,previousMonth:g>0?Ne(u):null}}function Ne(e){return Math.round(100*e)/100}const De=[{page:"overview",label:"Overview",icon:"mdi:view-grid-outline"},{page:"elec",label:"Electricity",icon:"mdi:lightning-bolt"},{page:"gas",label:"Gas",icon:"mdi:fire"},{page:"tariff",label:"Tariff & rates",icon:"mdi:tag-outline"},{page:"ev",label:"EV charging",icon:"mdi:ev-station"}],Me={overview:"Overview",elec:"Electricity",gas:"Gas",tariff:"Tariff & rates",ev:"EV charging",settings:"Settings"},Pe=n`/*
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
`,He=n`:host {
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
`;class Ue extends oe{constructor(){super(...arguments),this.bars=[],this.usageColor="var(--eon-elec)",this.standColor="var(--eon-elec-standing)",this.height=240,this.maxBarWidth=22,this.showLabels=!0}render(){return B`
      <div
        class="bars"
        style="height:${this.height}px"
        role="img"
        aria-label="Daily cost - energy used stacked on the standing charge"
      >
        ${this.bars.map(e=>this._renderBar(e))}
      </div>
      ${this.showLabels?B`<div class="labels">
              ${this.bars.map(e=>B`<span class="label">${e.label}</span>`)}
            </div>`:W}
    `}_renderBar(e){const t=`${ke(e.usageCost+e.standCost)} · usage ${ke(e.usageCost)} + standing ${ke(e.standCost)}`;return B`
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
    `}}Ue.styles=[Pe,He],e([he({type:Array})],Ue.prototype,"bars",void 0),e([he()],Ue.prototype,"usageColor",void 0),e([he()],Ue.prototype,"standColor",void 0),e([he({type:Number})],Ue.prototype,"height",void 0),e([he({type:Number})],Ue.prototype,"maxBarWidth",void 0),e([he({type:Boolean})],Ue.prototype,"showLabels",void 0),customElements.get("eon-stacked-bar-chart")||customElements.define("eon-stacked-bar-chart",Ue);const Re=n`/* Shared building blocks for the redesigned dashboard pages. */

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
`,je=n`.greeting {
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
`;class Oe extends oe{constructor(){super(...arguments),this.summary=null,this.refreshToken=0,this.showProjection=!0,this.showStandingCallout=!0,this.showMeterHealth=!0,this._history={},this._backfill=new ve(this,e=>ue(e)),this._fetchedToken=-1,this._fetching=new Set}updated(){if(!this.hass||!this.summary)return;this.refreshToken!==this._fetchedToken&&(this._fetchedToken=this.refreshToken,this._history={},this._fetching.clear());const e=(new Date).getDate(),t=Math.min(62,e+31);for(const e of this.summary.meters){const a=e.serial;!a||this._history[a]||this._fetching.has(a)||this._fetch(a,t)}}async _fetch(e,t){this._fetching.add(e);try{const a=await ge(this.hass,e,t);this._history={...this._history,[e]:a.entries}}catch{this._history={...this._history,[e]:[]}}finally{this._fetching.delete(e)}}_split(e){return e?.serial?function(e,t,a,s){const i=t??0,r=a??0,n=s.getFullYear(),o=s.getMonth();let l=0,d=0,c=0;for(const t of e){const e=new Date(`${t.date}T00:00:00`);isNaN(e.getTime())||e.getFullYear()===n&&e.getMonth()===o&&(l+=Math.max(0,t.consumption)*i,d+=r,c++)}return{usage:Ne(l),standing:Ne(d),total:Ne(l+d),days:c}}(this._history[e.serial]??[],e.unit_rate,e.standing_charge,new Date):{usage:0,standing:0,total:0,days:0}}_nav(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{page:e},bubbles:!0,composed:!0}))}render(){if(!this.summary)return B`<div class="placeholder">Loading…</div>`;const e=new Date,t=this.hass?.language??"en",a=xe(this.summary,"electricity"),s=xe(this.summary,"gas"),i=this._split(a),r=this._split(s),n=Ne(i.usage+r.usage),o=Ne(i.standing+r.standing),l=Ne(n+o),d=e.toLocaleDateString(t,{month:"long"}),c=Math.max(i.days,r.days,e.getDate()),h=c>0?Ne(l/c):0;return B`
      <div class="page">
        <div class="greeting">
          ${function(e){const t=e.getHours();return t<12?"Good morning":t<18?"Good afternoon":"Good evening"}(e)} ·
          ${e.toLocaleDateString(t,{weekday:"long",day:"numeric",month:"long"})}
        </div>

        ${this._renderHero(d,l,n,o,c,h)}
        ${this._renderFuelCards(a,i,s,r)}
        ${this._renderTariffAndHealth(a,s)}
      </div>
    `}_renderHero(e,t,a,s,i,r){const n=t>0?a/t*100:0,o=t>0?s/t*100:0,l=t>0?s/t:0;return B`
      <div class="card hero">
        <div class="hero-top">
          <div>
            <div class="muted hero-label">
              Spent so far in ${e} · gas + electricity
            </div>
            <div class="serif hero-total">${ke(t)}</div>
            <div class="hero-sub">
              ${i} day${1===i?"":"s"} in · about
              <b>${ke(r)}</b> a day
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
              Energy used <b class="split-val">${ke(a)}</b>
            </span>
            <span class="legend-item">
              <span
                class="legend-swatch"
                style="background:var(--eon-elec-standing)"
              ></span>
              Standing charge <b class="split-val">${ke(s)}</b>
            </span>
          </div>
          ${this.showStandingCallout&&l>=.4&&s>0?B`<div class="callout hero-callout">
                  ${l>=.5?"Over half":"A large part"} of this month's bill
                  -
                  <b>${ke(s)}</b> - is the fixed daily standing charge
                  you pay before using anything.
                </div>`:W}
        </div>
      </div>
    `}_renderProjection(e){if(!this.showProjection)return W;const t=new Date,a=function(e,t){const a=t.getDate(),s=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();return a<=0?e:Ne(e/a*s)}(e,t),s=this.summary?.meters??[];let i=0,r=s.length>0;for(const e of s){const a=e.serial?this._history[e.serial]??null:null,s=a?ze(a,e.unit_rate,e.standing_charge,t).previousMonth:null;if(null==s){r=!1;break}i+=s}const n=r?Ne(a-Ne(i)):null;return B`
      <div class="projection">
        <div class="muted proj-label">On track for</div>
        <div class="serif proj-value">~${ke(a)}</div>
        ${null!=n?B`<span class="pill pill--green proj-pill">
                ${n<=0?"▼":"▲"} ${ke(Math.abs(n))} vs last month
              </span>`:W}
      </div>
    `}_renderFuelCards(e,t,a,s){return B`
      <div class="grid-2">
        ${this._renderFuelCard("electricity",e,t)}
        ${this._renderFuelCard("gas",a,s)}
      </div>
    `}_renderFuelCard(e,t,a){const s=_e[e];if(!t)return B`<div class="card fuel-card">
        <div class="muted">No ${s.label.toLowerCase()} meter.</div>
      </div>`;const i=Te((t.serial?this._history[t.serial]??[]:[]).slice(-7),t.unit_rate,t.standing_charge,7,this.hass?.language??"en");return B`
      <button
        class="card fuel-card card--clickable"
        @click=${()=>this._nav("gas"===e?"gas":"elec")}
      >
        <div class="fuel-head">
          <div class="fuel-name">
            <span class="tile ${s.tileClass}">
              <ha-icon .icon=${s.icon} style="--mdc-icon-size:16px"></ha-icon>
            </span>
            <div>
              <div class="fuel-label">${s.label}</div>
              <div class="mono fuel-serial">${t.serial??"-"}</div>
            </div>
          </div>
          <div class="serif fuel-cost">${ke(a.total)}</div>
        </div>
        ${i.length?B`<eon-stacked-bar-chart
                class="fuel-chart"
                .bars=${i}
                usageColor=${s.usageColor}
                standColor=${s.standColor}
                .height=${88}
                .maxBarWidth=${13}
                .showLabels=${!1}
              ></eon-stacked-bar-chart>`:B`<div class="fuel-chart-empty"></div>`}
        <div class="fuel-foot muted">
          <span>${Ae(t.unit_rate)} /kWh</span>
          <span>${Ae(t.standing_charge,0)} /day standing</span>
        </div>
      </button>
    `}_renderTariffAndHealth(e,t){return B`
      <div class="tariff-health">
        ${this._renderTariffCard(e,t)}
        ${this.showMeterHealth?this._renderHealthCard(e??t):W}
      </div>
    `}_renderTariffCard(e,t){const a=e?.tariff_name??t?.tariff_name??"Tariff unavailable",s=we(e)||we(t);return B`
      <button
        class="card card--dark tariff-card card--clickable"
        @click=${()=>this._nav("tariff")}
      >
        <div class="tariff-head">
          <div>
            <div class="eyebrow">Your tariff</div>
            <div class="serif tariff-name">${a}</div>
          </div>
          <span class="pill pill--dark">${s?"Time-of-use":"Flat rate"}</span>
        </div>
        <div class="tariff-stats">
          <div>
            <div class="tariff-stat-value">${Ce(e?.unit_rate)}</div>
            <div class="tariff-stat-label">Electricity /kWh</div>
          </div>
          <div>
            <div class="tariff-stat-value">${Ce(t?.unit_rate)}</div>
            <div class="tariff-stat-label">Gas /kWh</div>
          </div>
          <div class="tariff-note">
            <div class="accent">
              ${s?"Off-peak window available":"No cheaper window today"}
            </div>
            <div class="tariff-stat-label">
              ${s?"shift usage to save":"same price around the clock"}
            </div>
          </div>
        </div>
      </button>
    `}_renderHealthCard(e){const t=this.hass?.language??"en",a=this._backfill.data,s=a&&a.total_meters>0?Math.round(a.completed_meters/a.total_meters*100):!1===a?.enabled?0:100,i=this.summary?.meters.length??0,r=null!=e?.latest_reading?`${e.latest_reading.toLocaleString(t)} · ${Se(e.latest_reading_date,t)}`:"-";return B`
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
            <span>${s}%${s>=100?" · done":""}</span>
          </div>
          <div class="progress">
            <div class="progress-fill" style="width:${s}%"></div>
          </div>
        </div>
      </div>
    `}}Oe.styles=[Pe,Re,je],e([he({attribute:!1})],Oe.prototype,"hass",void 0),e([he({attribute:!1})],Oe.prototype,"summary",void 0),e([he({type:Number})],Oe.prototype,"refreshToken",void 0),e([he({type:Boolean})],Oe.prototype,"showProjection",void 0),e([he({type:Boolean})],Oe.prototype,"showStandingCallout",void 0),e([he({type:Boolean})],Oe.prototype,"showMeterHealth",void 0),e([pe()],Oe.prototype,"_history",void 0),customElements.get("eon-overview-page")||customElements.define("eon-overview-page",Oe);const Le=n`.range-picker {
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
`,Fe=[{label:"7d",value:7},{label:"30d",value:30},{label:"90d",value:90},{label:"1y",value:365}];class Ie extends oe{constructor(){super(...arguments),this.value=7,this.options=Fe}render(){const e=this.options.findIndex(e=>e.value===this.value),t=e>=0?e:0;return B`
      <div class="range-picker" role="radiogroup" aria-label="Time range">
        ${this.options.map((e,a)=>B`
            <button
              type="button"
              class="range-btn ${this.value===e.value?"active":""}"
              role="radio"
              aria-checked=${this.value===e.value?"true":"false"}
              tabindex=${a===t?"0":"-1"}
              @keydown=${e=>this._onKeydown(e,a)}
              @click=${()=>this._select(e.value)}
            >
              ${e.label}
            </button>
          `)}
      </div>
    `}_select(e){e!==this.value&&(this.value=e,this.dispatchEvent(new CustomEvent("range-changed",{detail:{value:e},bubbles:!0,composed:!0})))}_onKeydown(e,t){let a=null;if("ArrowLeft"===e.key||"ArrowUp"===e.key?a=(t-1+this.options.length)%this.options.length:"ArrowRight"===e.key||"ArrowDown"===e.key?a=(t+1)%this.options.length:"Home"===e.key?a=0:"End"===e.key?a=this.options.length-1:" "!==e.key&&"Enter"!==e.key||(a=t),null==a)return;e.preventDefault();const s=this.options[a]?.value;null!=s&&(this._select(s),this.updateComplete.then(()=>{const e=this.renderRoot.querySelectorAll(".range-btn");e[a]?.focus()}))}}Ie.styles=[Le],e([he({type:Number})],Ie.prototype,"value",void 0),e([he({type:Array})],Ie.prototype,"options",void 0),customElements.get("eon-range-picker")||customElements.define("eon-range-picker",Ie);const Be=n`.detail-header {
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
`;class qe extends oe{constructor(){super(...arguments),this.meter=null,this.refreshToken=0,this._days=30,this._history=[],this._loading=!0,this._fetchedSerial=null,this._fetchedDays=0,this._fetchedToken=-1,this._requestId=0,this._memoHistory=null,this._memoDays=-1,this._memoRate=void 0,this._memoStanding=void 0,this._memoBars=[],this._memoMonthToDate=0}get kind(){return ye(this.meter?.type??null)}updated(e){if(!this.hass||!this.meter?.serial)return;const t=this._daysToFetch();(this.meter.serial!==this._fetchedSerial||t!==this._fetchedDays||this.refreshToken!==this._fetchedToken||e.has("meter"))&&this._fetch(t)}_daysToFetch(){const e=(new Date).getDate();return Math.max(this._days,e)}async _fetch(e){this._fetchedSerial=this.meter.serial,this._fetchedDays=e,this._fetchedToken=this.refreshToken,this._loading=!0;const t=++this._requestId;try{const a=await ge(this.hass,this.meter.serial,e);if(t!==this._requestId)return;this._history=a.entries}catch{if(t!==this._requestId)return;this._history=[]}this._loading=!1}_onRange(e){this._days=e.detail.value}_ensureComputed(){const e=this.meter?.unit_rate,t=this.meter?.standing_charge;if(this._memoHistory===this._history&&this._memoDays===this._days&&this._memoRate===e&&this._memoStanding===t)return;this._memoHistory=this._history,this._memoDays=this._days,this._memoRate=e,this._memoStanding=t;const a=this.hass?.language??"en",s=this._history.slice(-this._days);this._memoBars=this._days>=365?function(e,t,a,s="en"){const i=t??0,r=a??0,n=new Map;for(const t of e){const e=new Date(`${t.date}T00:00:00`);if(isNaN(e.getTime()))continue;const a=`${e.getFullYear()}-${e.getMonth()}`,s=n.get(a)??{kwh:0,days:0,date:new Date(e.getFullYear(),e.getMonth(),1)};s.kwh+=Math.max(0,t.consumption),s.days+=1,n.set(a,s)}const o=[...n.values()].sort((e,t)=>e.date.getTime()-t.date.getTime()),l=o.map(e=>({date:e.date,usageCost:e.kwh*i,standCost:e.days*r})),d=Math.max(1e-4,...l.map(e=>e.usageCost+e.standCost));return l.map(e=>({usagePct:e.usageCost/d*100,standPct:e.standCost/d*100,usageCost:e.usageCost,standCost:e.standCost,label:e.date.toLocaleDateString(s,{month:"narrow"})}))}(this._history,e,t,a):Te(s,e,t,this._days,a),this._memoMonthToDate=ze(this._history,e,t,new Date).monthToDate}render(){if(!this.meter)return B`<div class="placeholder">No meter available.</div>`;this._ensureComputed();const e=this.kind,t=_e[e],a=Ae(this.meter.standing_charge,0);return B`
      <div class="page">
        ${this._renderHeader(t)}
        ${this._renderChartCard(e,this._memoBars,t,a)}
        ${this._renderStats(a)} ${this._renderReadingStrip(e)}
      </div>
    `}_renderHeader(e){const t=we(this.meter),a="gas"===this.kind?"Import · volume m³ → kWh":t?"Import · time-of-use":"Import · single rate";return B`
      <div class="detail-header">
        <div class="meter-id">
          <span class="tile ${e.tileClass}">
            <ha-icon .icon=${e.icon} style="--mdc-icon-size:18px"></ha-icon>
          </span>
          <div>
            <div class="mono meter-serial">Meter ${this.meter?.serial??"-"}</div>
            <div class="muted meter-descriptor">${a}</div>
          </div>
        </div>
        <eon-range-picker
          .value=${this._days}
          @range-changed=${this._onRange}
        ></eon-range-picker>
      </div>
    `}_renderChartCard(e,t,a,s){return B`
      <div class="card chart-card">
        <div class="chart-title-row">
          <div class="chart-title">Daily cost - usage &amp; standing charge</div>
          <div class="faint chart-range">${this._rangeLabel()}</div>
        </div>
        ${t.length?B`<eon-stacked-bar-chart
                .bars=${t}
                usageColor=${a.usageColor}
                standColor=${a.standColor}
                .height=${240}
              ></eon-stacked-bar-chart>`:B`<div class="placeholder">
                ${this._loading?"Loading chart…":"No consumption data for this range."}
              </div>`}
        <div class="legend chart-legend">
          <span class="legend-item">
            <span class="legend-swatch" style="background:${a.usageColor}"></span
            >Energy used
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background:${a.standColor}"></span>
            Standing charge (${s} / day, fixed)
          </span>
        </div>
        ${"gas"===e?B`<div class="callout">
                In summer barely any gas is used - nearly every bar is
                <b>pure standing charge</b>. Heating usage grows the caps again from
                autumn.
              </div>`:W}
        <div class="footnote faint">
          Costs use today's unit rate applied to historical usage - an approximation, as
          no historical rate series is available.
        </div>
      </div>
    `}_renderStats(e){return B`
      <div class="grid-4">
        ${this._statCard("This month",ke(this._memoMonthToDate))}
        ${this._statCard("Yesterday",ke(this.meter?.previous_day_cost))}
        ${this._statCard("Unit rate",Ae(this.meter?.unit_rate),"per kWh")}
        ${this._statCard("Standing",e,"per day")}
      </div>
    `}_statCard(e,t,a){return B`
      <div class="card card--stat">
        <div class="stat-label">${e}</div>
        <div class="stat-value">${t}</div>
        ${a?B`<div class="stat-sub">${a}</div>`:W}
      </div>
    `}_renderReadingStrip(e){const t=this.meter?.latest_reading;if(null==t)return W;const a=this.hass?.language??"en",s=`${"gas"===e?"Volume":"Register"} read · ${Se(this.meter?.latest_reading_date,a)}`;return B`
      <div class="card reading-strip">
        <div>
          <div class="reading-title">Latest meter reading</div>
          <div class="faint reading-descriptor">${s}</div>
        </div>
        <div class="mono reading-value">
          ${t.toLocaleString(a)}
          <span class="reading-unit faint">kWh</span>
        </div>
      </div>
    `}_rangeLabel(){return{7:"Last 7 days",30:"Last 30 days",90:"Last 90 days",365:"Last 12 months"}[this._days]??`Last ${this._days} days`}}qe.styles=[Pe,Re,Be],e([he({attribute:!1})],qe.prototype,"hass",void 0),e([he({attribute:!1})],qe.prototype,"meter",void 0),e([he({type:Number})],qe.prototype,"refreshToken",void 0),e([pe()],qe.prototype,"_days",void 0),e([pe()],qe.prototype,"_history",void 0),e([pe()],qe.prototype,"_loading",void 0),customElements.get("eon-meter-detail-page")||customElements.define("eon-meter-detail-page",qe);const We=n`:host {
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
`;class Ve extends oe{constructor(){super(...arguments),this.bars=[],this.height=64,this.nowFraction=null,this.axis=[],this.ariaLabel="Half-hourly chart"}render(){return B`
      <div
        class="strip"
        style="height:${this.height}px"
        role="img"
        aria-label=${this.ariaLabel}
      >
        ${this.bars.map(e=>B`<div
              class="bar"
              style="height:${e.heightPct}%;background:${e.color}"
            ></div>`)}
        ${null!=this.nowFraction?B`<div class="now" style="left:${100*this.nowFraction}%">
                <span class="now-label mono">now</span>
              </div>`:W}
      </div>
      ${this.axis.length?B`<div class="axis mono">
              ${this.axis.map(e=>B`<span>${e}</span>`)}
            </div>`:W}
    `}}Ve.styles=[Pe,We],e([he({type:Array})],Ve.prototype,"bars",void 0),e([he({type:Number})],Ve.prototype,"height",void 0),e([he({type:Number})],Ve.prototype,"nowFraction",void 0),e([he({type:Array})],Ve.prototype,"axis",void 0),e([he()],Ve.prototype,"ariaLabel",void 0),customElements.get("eon-halfhour-strip")||customElements.define("eon-halfhour-strip",Ve);const Ye=n`.chart-title-row {
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
`;class Ge extends oe{constructor(){super(...arguments),this.summary=null}render(){const e=xe(this.summary,"electricity"),t=xe(this.summary,"gas"),a=we(e)||we(t);return B`
      <div class="page">
        ${this._renderTariffCard(e,t,a)} ${this._renderRateStrip(e,a)}
        ${this._renderTimelines(e,t)}
      </div>
    `}_renderTariffCard(e,t,a){const s=this.hass?.language??"en",i=e?.tariff_name??t?.tariff_name??"Tariff unavailable",r=e??t,n=r?.tariff_valid_from??null,o=r?.tariff_valid_to??null,l=r?.tariff_type??null,d=[];return l&&d.push(l),n&&d.push(`started ${Ke(n,s)}`),o&&d.push(`locked until ${Ke(o,s)}`),B`
      <div class="card card--dark tariff-hero">
        <div class="tariff-hero-head">
          <div>
            <div class="eyebrow">Current tariff</div>
            <div class="serif tariff-hero-name">${i}</div>
            ${d.length?B`<div class="tariff-hero-dates">${d.join(" · ")}</div>`:W}
          </div>
          <span class="pill pill--dark tariff-hero-pill">
            ${a?"Time-of-use":"Flat rate · no off-peak"}
          </span>
        </div>
        <div class="tariff-hero-stats">
          ${this._heroStat("Electricity unit",Ce(e?.unit_rate),"per kWh","var(--eon-elec)")}
          ${this._heroStat("Elec standing",Ce(e?.standing_charge),"per day","var(--eon-elec-standing)")}
          ${this._heroStat("Gas unit",Ce(t?.unit_rate),"per kWh","var(--eon-gas)")}
          ${this._heroStat("Gas standing",Ce(t?.standing_charge),"per day","var(--eon-gas-standing)")}
        </div>
      </div>
    `}_heroStat(e,t,a,s){return B`
      <div class="hero-stat" style="border-left-color:${s}">
        <div class="tariff-stat-label">${e}</div>
        <div class="serif hero-stat-value">${t}</div>
        <div class="hero-stat-sub">${a}</div>
      </div>
    `}_renderRateStrip(e,t){const a=(s=e,s?.day_rates?s.day_rates.map(e=>({start:e.start,end:e.end,rate:e.rate,isOffPeak:e.is_off_peak})):[]);var s;const i=function(e,t){const a=[],s=[],i=new Date;i.setHours(0,0,0,0);for(let r=0;r<48;r++){const n=new Date(i.getTime()+30*r*6e4),o=new Date(n.getTime()+9e5);let l=t??0,d=!1;for(const t of e){const e=new Date(t.start),a=new Date(t.end);if(!isNaN(e.getTime())&&!isNaN(a.getTime())&&(o>=e&&o<a)){l=t.rate,d=t.isOffPeak;break}}a.push(l),s.push(d)}const r=Math.min(...a),n=Math.max(...a),o=n-r<1e-6;return a.map((e,t)=>({heightPct:o?72:45+(e-r)/(n-r)*50,color:s[t]?"var(--eon-green-light)":"var(--eon-elec-tile)"}))}(a,e?.unit_rate??null),r=new Date,n=(60*r.getHours()+r.getMinutes())/1440,o=t?"Varies through the day":`Flat · ${Ae(e?.unit_rate)}/kWh all day`;return B`
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
        ${t?W:B`<div class="callout rate-callout">
                You're on a fixed tariff, so there's no cheaper window - the price is
                identical every half-hour. On a time-of-use tariff this strip would shade
                the off-peak hours automatically.
              </div>`}
      </div>
    `}_renderTimelines(e,t){return B`
      <div class="grid-2">
        ${this._renderTimeline("Electricity",e,"var(--eon-elec)")}
        ${this._renderTimeline("Gas",t,"var(--eon-gas)")}
      </div>
    `}_renderTimeline(e,t,a){const s=this.hass?.language??"en",i=$e(t,"previous"),r=$e(t,"next"),n=t?.unit_rate??null;return B`
      <div class="card timeline-card">
        <div class="timeline-title">${e} rate timeline</div>
        ${this._timelineRow("Previous",i.rate,i.validTo?`→ ${Ke(i.validTo,s)}`:"",!1,a)}
        ${this._timelineRow("Current",n,i.validTo?`from ${Ke(i.validTo,s)}`:"",!0,a)}
        ${this._timelineRow("Next",r.rate??n,null==r.rate?"fixed":r.validFrom?`from ${Ke(r.validFrom,s)}`:"",!1,a)}
      </div>
    `}_timelineRow(e,t,a,s,i){return B`
      <div class="timeline-row ${s?"timeline-row--current":""}">
        <span class="muted">${e}</span>
        <span class="timeline-rate" style=${s?`color:${i}`:""}>
          ${Ae(t)}
          ${a?B`<span class="faint timeline-note">${a}</span>`:W}
        </span>
      </div>
    `}}function Ke(e,t){const a=new Date(e.length<=10?`${e}T00:00:00`:e);return isNaN(a.getTime())?e:a.toLocaleDateString(t,{day:"numeric",month:"short",year:"numeric"})}Ge.styles=[Pe,Re,Ye],e([he({attribute:!1})],Ge.prototype,"hass",void 0),e([he({attribute:!1})],Ge.prototype,"summary",void 0),customElements.get("eon-tariff-page")||customElements.define("eon-tariff-page",Ge);const Je=n`.ev-banner {
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
`;class Ze extends oe{constructor(){super(...arguments),this.deviceId="",this.refreshToken=0,this._data=null,this._loading=!0,this._error=!1,this._fetchedDeviceId=null,this._fetchedToken=-1}updated(){this.hass&&this.deviceId&&(this.deviceId===this._fetchedDeviceId&&this.refreshToken===this._fetchedToken||this._fetch())}async _fetch(){this._fetchedDeviceId=this.deviceId,this._fetchedToken=this.refreshToken,this._loading=!0,this._error=!1;try{this._data=await async function(e,t){return e.callWS({type:"eon_next/ev_schedule",device_id:t})}(this.hass,this.deviceId)}catch{this._error=!0,this._data=null}this._loading=!1}render(){if(!this.deviceId)return B`<div class="placeholder">No EV charger available.</div>`;if(this._loading&&!this._data)return B`<div class="placeholder">Loading EV schedule…</div>`;if(this._error||!this._data)return B`<div class="placeholder">Unable to load EV schedule.</div>`;const{status:e,slots:t}=this._data,a="scheduled"===e||"active"===e;return B`
      <div class="page">
        ${this._renderBanner(a)} ${this._renderChargeCards(t)}
        ${this._renderSchedule(t)}
      </div>
    `}_renderBanner(e){return B`
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
    `}_renderChargeCards(e){const t=this.hass?.language??"en";return B`
      <div class="grid-2">
        ${this._chargeCard("Next charge",e[0],t)}
        ${this._chargeCard("Following charge",e[1],t)}
      </div>
    `}_chargeCard(e,t,a){if(!t)return B`<div class="card card--stat charge-card">
        <div class="muted charge-label">${e}</div>
        <div class="serif charge-value charge-value--empty">Not scheduled</div>
      </div>`;const s=new Date(t.start),i=new Date(t.end),r=`${Qe(s)} → ${Qe(i)}`,n=function(e,t){const a=Math.round((t.getTime()-e.getTime())/6e4);if(!Number.isFinite(a)||a<=0)return"scheduled";const s=Math.floor(a/60),i=a%60,r=0===i?`${s} hr`:`${(a/60).toFixed(1)} hr`;return`${r} window`}(s,i),o=`${function(e,t){if(isNaN(e.getTime()))return"";const a=new Date,s=new Date(a.getFullYear(),a.getMonth(),a.getDate()),i=new Date(e.getFullYear(),e.getMonth(),e.getDate()),r=Math.round((i.getTime()-s.getTime())/864e5);return r<=0?e.getHours()>=18||e.getHours()<6?"Tonight":"Today":1===r?"Tomorrow":e.toLocaleDateString(t,{weekday:"short"})}(s,a)} · ${n}`;return B`
      <div class="card card--stat charge-card">
        <div class="muted charge-label">${e}</div>
        <div class="serif charge-value">${r}</div>
        <div class="charge-desc">${o}</div>
      </div>
    `}_renderSchedule(e){const t=function(e){const t=new Date;t.setHours(18,0,0,0);const a=e.map(e=>[new Date(e.start).getTime(),new Date(e.end).getTime()]).filter(([e,t])=>Number.isFinite(e)&&Number.isFinite(t)&&t>e),s=[];for(let e=0;e<48;e++){const i=t.getTime()+30*e*6e4,r=i+18e5,n=a.some(([e,t])=>e<r&&t>i);s.push({heightPct:n?90:18,color:n?"var(--eon-green)":"var(--eon-hairline)"})}return s}(e);return B`
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
    `}}function Qe(e){return isNaN(e.getTime())?"-":`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`}Ze.styles=[Pe,Re,Je],e([he({attribute:!1})],Ze.prototype,"hass",void 0),e([he()],Ze.prototype,"deviceId",void 0),e([he({type:Number})],Ze.prototype,"refreshToken",void 0),e([pe()],Ze.prototype,"_data",void 0),e([pe()],Ze.prototype,"_loading",void 0),e([pe()],Ze.prototype,"_error",void 0),customElements.get("eon-ev-page")||customElements.define("eon-ev-page",Ze);const Xe=n`/* Shared styles using HA CSS custom properties for automatic theme support. */

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
`,et=n`.backfill-header {
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
`;class tt extends oe{constructor(){super(...arguments),this._data=new ve(this,e=>ue(e))}render(){if(this._data.loading)return B`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">Loading status…</div>
      `;if(this._data.error)return B`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">Failed to load backfill status.</div>
      `;const e=this._data.data;if(!e)return B`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">No backfill status available.</div>
      `;if(!e.enabled)return B`
        <div class="backfill-header">
          <ha-icon icon="mdi:database-clock" style="--mdc-icon-size: 18px;"></ha-icon>
          Historical Backfill
        </div>
        <div class="disabled-notice">
          Backfill is disabled. Enable it in the integration options.
        </div>
      `;const t=e.total_meters>0?Math.round(e.completed_meters/e.total_meters*100):0;return B`
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

      ${e.lookback_days>0?B`<div class="status-row">
              <span class="label">Lookback</span>
              <span class="value">${e.lookback_days} days</span>
            </div>`:W}
      ${e.next_start_date?B`<div class="status-row">
              <span class="label">Next backfill from</span>
              <span class="value">${e.next_start_date}</span>
            </div>`:W}
      ${e.meters.length>0?B`<div class="meter-list">
              ${e.meters.map(e=>B`
                  <div class="meter-item">
                    <span class="meter-serial">${e.serial}</span>
                    ${e.done?B`<span class="meter-done">Complete</span>`:B`<span class="meter-pending"
                            >${e.days_completed}/${e.days_completed+e.days_remaining}
                            days</span
                          >`}
                  </div>
                `)}
            </div>`:W}
    `}}tt.styles=[Xe,et],e([he({attribute:!1})],tt.prototype,"hass",void 0),customElements.get("eon-backfill-status")||customElements.define("eon-backfill-status",tt);const at=n`.intro {
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

/* --- Connected accounts --- */

.accounts {
  padding: 22px 24px;
}

.accounts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.accounts-title {
  font-size: 18px;
  color: var(--eon-text);
}

.acct-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acct-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--eon-card-border);
  border-radius: var(--eon-radius-tile);
  background: var(--eon-card);
}

.acct-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--eon-text);
}

.acct-num {
  font-size: 12px;
  color: var(--eon-muted);
  margin-top: 2px;
}

.acct-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.acct-balance {
  font-size: 15px;
  font-weight: 600;
  color: var(--eon-text);
}

.acct-status {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--eon-radius-pill);
  white-space: nowrap;
}

.acct-status--ok {
  color: var(--eon-green-text);
  background: var(--eon-green-bg);
}

.acct-status--warn {
  color: var(--eon-amber-text);
  background: var(--eon-amber-bg);
}

.acct-status--err {
  color: #9a3b2f;
  background: #f6e3da;
}

.acct-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--eon-elec);
  text-decoration: none;
  white-space: nowrap;
}

.acct-link:hover {
  text-decoration: underline;
}

.acct-link--primary {
  padding: 6px 14px;
  border-radius: var(--eon-radius-control);
  background: var(--eon-dark);
  color: var(--eon-on-dark);
}

.acct-link--primary:hover {
  text-decoration: none;
  opacity: 0.92;
}

.acct-empty {
  font-size: 14px;
  padding: 8px 0;
}

.accounts-foot {
  font-size: 12px;
  margin-top: 14px;
}
`,st="/config/integrations/integration/eon_next",it={connected:"Connected",reauth_required:"Reauthentication needed",error:"Needs attention"};class rt extends oe{constructor(){super(...arguments),this.version=null,this._accounts=new ve(this,e=>async function(e){return e.callWS({type:"eon_next/accounts"})}(e))}get _isAdmin(){return!0===this.hass?.user?.is_admin}_openHa(e){e.preventDefault(),history.pushState(null,"",st),window.dispatchEvent(new CustomEvent("location-changed"))}render(){return B`
      <div class="page">
        <div class="card intro">
          <div class="serif intro-title">Settings</div>
          <div class="muted intro-body">
            The integration refresh interval and backfill controls are managed from the
            integration's options in Home Assistant.
          </div>
          ${this.version?B`<div class="faint version">Version ${this.version}</div>`:W}
        </div>

        ${this._renderAccounts()}

        <div class="card">
          <eon-backfill-status .hass=${this.hass}></eon-backfill-status>
        </div>
      </div>
    `}_renderAccounts(){const e=this._accounts.data?.accounts??[];return B`
      <div class="card accounts">
        <div class="accounts-head">
          <div class="serif accounts-title">Connected accounts</div>
          ${this._isAdmin?B`<a
                  class="acct-link acct-link--primary"
                  href=${st}
                  @click=${this._openHa}
                  >Add account</a
                >`:W}
        </div>

        ${this._accounts.loading&&!this._accounts.data?B`<div class="muted acct-empty">Loading accounts…</div>`:0===e.length?B`<div class="muted acct-empty">No accounts configured.</div>`:B`<div class="acct-list">
                  ${e.map(e=>this._renderAccount(e))}
                </div>`}

        <div class="faint accounts-foot">
          ${this._isAdmin?"Adding, re-authenticating or removing an account opens Home Assistant.":"Ask an administrator to add or change accounts."}
        </div>
      </div>
    `}_renderAccount(e){const t=it[e.status]??e.status,a="connected"===e.status?"acct-status--ok":"reauth_required"===e.status?"acct-status--warn":"acct-status--err";return B`
      <div class="acct-row">
        <div class="acct-main">
          <div class="acct-name">${e.provider_name}</div>
          ${e.account_number?B`<div class="mono acct-num">${e.account_number}</div>`:W}
        </div>
        <div class="acct-meta">
          ${null!=e.balance?B`<div class="acct-balance">${ke(e.balance)}</div>`:W}
          <span class="acct-status ${a}">${t}</span>
          ${this._isAdmin?B`<a
                  class="acct-link"
                  href=${st}
                  @click=${this._openHa}
                  >Manage</a
                >`:W}
        </div>
      </div>
    `}}rt.styles=[Pe,Re,at],e([he({attribute:!1})],rt.prototype,"hass",void 0),e([he()],rt.prototype,"version",void 0),customElements.get("eon-settings-page")||customElements.define("eon-settings-page",rt);const nt=n`:host {
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
`;class ot extends oe{constructor(){super(...arguments),this.narrow=!1,this._page="overview",this._lastUpdated=null,this._refreshToken=0,this._version=new ve(this,e=>async function(e){return e.callWS({type:"eon_next/version"})}(e)),this._summary=new ve(this,e=>async function(e){return e.callWS({type:"eon_next/dashboard_summary"})}(e)),this._hadData=!1,this._navigate=e=>{this._page=e},this._toggleSidebar=()=>{this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}))},this._onNavigateEvent=e=>{this._navigate(e.detail.page)},this._refresh=()=>{this._refreshToken++,this._lastUpdated=new Date,this._summary.refresh(),this._version.refresh()}}connectedCallback(){super.connectedCallback(),this._ensureFonts()}updated(){!this._summary.data||this._summary.loading||this._summary.refreshing||this._hadData||(this._hadData=!0,this._lastUpdated=new Date)}_ensureFonts(){const e=this.ownerDocument;if(!e||e.getElementById(fe.fontsId))return;const t=e.createElement("link");t.id=fe.fontsId,t.rel="stylesheet",t.href=fe.fontsUrl,e.head.appendChild(t)}render(){return B`
      <div class="shell" @navigate=${this._onNavigateEvent}>
        ${this._renderRail()}
        <main class="main">
          ${this._renderTopBar()}
          <div class="content">${this._renderPage()}</div>
        </main>
      </div>
    `}_renderRail(){const e=this._summary.data?.account_balance??null;return B`
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
              <path d=${fe.logoPath} fill="#fff" />
            </svg>
          </button>
          <div>
            <div class="brand-name">${fe.name}</div>
            <div class="brand-sub mono">${fe.sub}</div>
          </div>
        </div>

        <div class="nav-items">
          ${De.map(e=>this._renderNavButton(e.page,e.label,e.icon))}
        </div>

        <div class="rail-bottom">
          ${null!=e?B`<div class="balance">
                  <div class="balance-label">Balance</div>
                  <div
                    class="serif balance-value ${e>=0?"balance--credit":"balance--debit"}"
                  >
                    ${ke(Math.abs(e))}
                  </div>
                  <div class="balance-sub">${e>=0?"in credit":"owed"}</div>
                </div>`:W}
          ${this._renderNavButton("settings","Settings","mdi:cog-outline")}
        </div>
      </nav>
    `}_renderNavButton(e,t,a){const s=this._page===e;return B`
      <button
        class="nav-item ${s?"nav-item--active":""}"
        aria-current=${s?"page":"false"}
        @click=${()=>this._navigate(e)}
      >
        <ha-icon .icon=${a} style="--mdc-icon-size:18px"></ha-icon>
        <span>${t}</span>
      </button>
    `}_renderTopBar(){const e=this._summary.refreshing?"Updating…":`Updated ${function(e){if(!e)return"-";const t=Math.max(0,Math.round((Date.now()-e.getTime())/1e3));if(t<45)return"just now";const a=Math.round(t/60);if(a<60)return`${a} min${1===a?"":"s"} ago`;const s=Math.round(a/60);if(s<24)return`${s} hr${1===s?"":"s"} ago`;const i=Math.round(s/24);return`${i} day${1===i?"":"s"} ago`}(this._lastUpdated)}`;return B`
      <header class="topbar">
        <div class="topbar-left">
          <h1 class="serif topbar-title">${Me[this._page]}</h1>
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
    `}_renderPage(){if(this._summary.loading&&!this._summary.data)return B`<div class="state-msg" role="status">Loading energy data…</div>`;if(this._summary.error&&!this._summary.data)return B`
        <div class="state-msg state-msg--error" role="alert">
          <ha-icon icon="mdi:alert-circle" style="--mdc-icon-size:40px"></ha-icon>
          <div>Unable to load data</div>
          <div class="state-sub">${this._summary.error}</div>
        </div>
      `;const e=this._summary.data,t=(e?.meters.length??0)>0,a=(e?.ev_chargers.length??0)>0;if(!t&&!a)return B`
        <div class="state-msg" role="status">
          <ha-icon
            icon="mdi:lightning-bolt-circle"
            style="--mdc-icon-size:40px"
          ></ha-icon>
          <div>No data available</div>
          <div class="state-sub">No meter or EV data found for this account.</div>
        </div>
      `;const s=this._refreshToken;switch(this._page){case"overview":return B`<eon-overview-page
          .hass=${this.hass}
          .summary=${e}
          .refreshToken=${s}
        ></eon-overview-page>`;case"elec":return B`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${xe(e,"electricity")}
          .refreshToken=${s}
        ></eon-meter-detail-page>`;case"gas":return B`<eon-meter-detail-page
          .hass=${this.hass}
          .meter=${xe(e,"gas")}
          .refreshToken=${s}
        ></eon-meter-detail-page>`;case"tariff":return B`<eon-tariff-page
          .hass=${this.hass}
          .summary=${e}
        ></eon-tariff-page>`;case"ev":return B`<eon-ev-page
          .hass=${this.hass}
          .deviceId=${e?.ev_chargers[0]?.device_id??""}
          .refreshToken=${s}
        ></eon-ev-page>`;case"settings":return B`<eon-settings-page
          .hass=${this.hass}
          .version=${this._version.data?.version??null}
        ></eon-settings-page>`}}}ot.styles=[Pe,nt],e([he({attribute:!1})],ot.prototype,"hass",void 0),e([he({type:Boolean})],ot.prototype,"narrow",void 0),e([he({attribute:!1})],ot.prototype,"route",void 0),e([he({attribute:!1})],ot.prototype,"panel",void 0),e([pe()],ot.prototype,"_page",void 0),e([pe()],ot.prototype,"_lastUpdated",void 0),e([pe()],ot.prototype,"_refreshToken",void 0),customElements.define("eon-next-panel",ot);
