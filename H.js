// Reactivity framework implementation published under Hell license 66.6 (6.666 bytes long code)
// code simple, see more at janturon.github.io enjoy
const H = Object.seal({
    _dataObserver: new MutationObserver(recs => recs.forEach(rec =>
        rec.target.dataset.model && H._setDataModel(rec.target, null, true)
    )),
    _objRefCounter: 100,
    _objRefs: new WeakMap(),

    isObject: val => typeof val == 'object' && val !== null,
    isModel: val => H.isObject(val) && (Symbol.for("H.model") in val),

    dataModel: function(dataObject) {
      const cache = new WeakMap();
      const src = obj => H.isModel(obj) ? Object.getPrototypeOf(obj) : obj;
      return (function proxy(tgt) {
        const deep = new Proxy(tgt, {
          get: (o, key, r, _v) => H.isObject(_v=Reflect.get(o, key, r)) ? cache.get(_v) || proxy(_v) : _v,
          set: (o, key, val, r) => (H._dataChanged(deep, key, val), Reflect.set(o, key, src(val), r)),
          deleteProperty: (o, key) => (H._dataChanged(deep, key), Reflect.deleteProperty(o, key)),
          getPrototypeOf: o => tgt,
          has: (o, key) => key==Symbol.for("H.model") ? true : (key in o),
        });
        cache.set(tgt, deep);
        return deep;
      })(dataObject);
    },

    updateElement: function(elem) {
        H._dataChangeBiDi(elem);
        H._getAttrBinding(elem).forEach(bind => {
            if(bind.name == "html") return H._applyTemplate(elem)
            if(bind.name == "array") return H._applyArray(elem);
            let value = bind.value.replace(/[${}]/g,'');
            let evaluated = Function(`return ${value}`).call(H.getDataModel(elem));
            elem[bind.name] = evaluated;
        });
        let decorator = child => H.updateElement(child);
        let terminator = child => child.dataset.model && !".[".includes(child.dataset.model[0]);
        H._applyToChilds(elem, decorator, terminator);
    },

    getDataModel: function(elem, source, refroot) {
        for(var dataEl=elem,path=""; !dataEl.dataset.model || ".[".includes(dataEl.dataset.model[0]); ) {
            path = (dataEl.dataset.model||'') + path;
            dataEl = dataEl.parentNode?.closest("[data-model]");
            if(!dataEl) return null;
        }
        if(refroot && dataEl!=refroot) return null;
        let result = new Function(`return ${dataEl.dataset.model}${path}`)();
        if(source) result = Object.getPrototypeOf(result);
        return result;
    },

    _setDataModel: function(elem, refroot, downstream, _dataObj) {
        clearTimeout(elem.dataTimer);
        elem.dataTimer = setTimeout(_=> {
            if(_dataObj = H.getDataModel(elem, false, refroot)); else return false;
            if(!H._setModelRef(elem, _dataObj)) return;
            H.updateElement(elem);
            if(downstream) {
                let decorator = child => H._setDataModel(child, elem, false);
                let generator = (mod,_m) => child => (_m=child.dataset.model) && mod(".[".includes(_m[0]));
                H._applyToChilds(elem, decorator, generator(_=>!_), generator(_=>_));
            }
        });
    },

    _setModelRef: function(elem, dataObj, _data) {
        let src = Object.getPrototypeOf(dataObj);
        if(_data = H._objRefs.get(src));
        else H._objRefs.set(src, _data={ref: ++H._objRefCounter, proxy: dataObj});
        let result = elem.dataset.modelRef != _data.ref;
        elem.dataset.modelRef = _data.ref;
        return result;
    },

    _applyToChilds: function(elem, decorator, terminator, conscriptor=(_=>_)) {
        for(const child of [...elem.children]) {
            if(terminator(child)) continue;
            if(conscriptor(child)) decorator(child);
            H._applyToChilds(child, decorator, terminator, conscriptor);
        }
    },

    _dataChanged: function(dataObj, prop, prev) {
        let mapRefElems = (ref, cmd) => document.querySelectorAll(`[data-model-ref='${ref}']`).forEach(cmd);
        let data = H._objRefs.get(Object.getPrototypeOf(dataObj));
        clearTimeout(data.timer);
        data.timer = setTimeout(_=> mapRefElems(data.ref, H.updateElement));
        if(H.isModel(prev)) { // Array.splice on DataModel
            let srcKey = Object.getPrototypeOf(data.proxy[prop]), dstKey = Object.getPrototypeOf(prev);
            let src = H._objRefs.get(srcKey), dst = H._objRefs.get(dstKey);
            mapRefElems(src.ref, el => H._setModelRef(el, dst.proxy));
            H._objRefs.delete(srcKey);
        }
    },

    _getAttrBinding: elem => [...elem.attributes]
        .filter(attr => attr.name.startsWith("data-bind-"))
        .map(attr => ({name: attr.name.substring(10), value: attr.value})),

    _dataChangeBiDi: function(elem) {
        if(elem.dataBiDiBound) return;
        ("checked" in elem) && elem.addEventListener("input", _o =>
            elem.dataset.bindChecked && (_o=H.getDataModel(elem)) &&
            Function(`${elem.dataset.bindChecked} = ${elem.checked}`).call(_o)
        );
        ("value" in elem) && elem.addEventListener("input", _o =>
            elem.dataset.bindValue && (_o=H.getDataModel(elem)) &&
            Function(`${elem.dataset.bindValue} = '${elem.value}'`).call(_o)
        );
        elem.dataBiDiBound = true;
    },

    _applyTemplate: function(elem) {
        if(!elem.template) elem.template = elem.innerHTML;
        elem.innerHTML = new Function("return `"+elem.template+"`").call(H.getDataModel(elem));
    },

    _applyArray: function(elem) {
        if(!elem.template) { elem.template = elem.firstElementChild; elem.innerHTML = ""; }
        for(const child of [...elem.children]) if(!H.getDataModel(child, false, elem)) child.remove();
        H.getDataModel(elem)?.forEach((dataItem, index, _elemItem) => {
            if(_elemItem = elem.querySelector(`:scope > [data-model='[${index}]']`)); else {
                _elemItem = elem.template.cloneNode(true);
                _elemItem.dataset.model = `[${index}]`;
            }
            elem.appendChild(_elemItem);
            H._setDataModel(_elemItem, elem, true);
        });
    },

    _init: function() {
        let rootSel = "[data-model]:not([data-model^='[']):not([data-model^='.'])";
        document.querySelectorAll(rootSel).forEach(el => H._setDataModel(el, el, true));
        H._dataObserver.observe(document.body,
            {attributeFilter: ["data-model"], subtree: true, childList: true}
        );
    }
});

if(document.readyState == "complete") H._init();
addEventListener("DOMContentLoaded", H._init);

