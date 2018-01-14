// vue-grid: 基于vuejs的表格组件
// 编程规约
// 1. 含__开头(双下划线)的方法为私有方法, 其他方法为公共方法

// 公用工具类方法
var Helper = {
    // 尝试将target转换为对象
    toObject: function (target, param, defaultValue) {
        if (target === undefined || target === null) {
            return defaultValue;
        } else if ((typeof target) === 'string') {
            //支持_.data语法
            if (target.startsWith('_.')) {
                var _ = param;
                return eval(target);
            } else {
                return target;
            }
        } else if ((typeof target) === 'function') {
            return toObject(target(param));
        } else {
            return target;
        }
    },
    // 尝试将target转换成数组
    toArray: function (target, param, defaultValue) {
        if (target === undefined || target === null) {
            return defaultValue;
        } else if (target instanceof Array) {
            return target;
        } else if (target instanceof Function) {
            return toArray(target(param));
        } else {
            return [target];
        }
    },
    // 尝试将target转换为布尔值
    toBool: function (target, param, defaultValue) {
        if (target === undefined || target === null) {
            return !!defaultValue;
        } else if (target instanceof Function) {
            return toBool(target(param));
        } else {
            return !!target;
        }
    },
    isEmptyObject: function (object) {
        return object === undefined || object === null;
    },
    // 空函数
    emptyMap: function (data) {
        return data;
    },
    errorKeyword: function (word) {
        return function () {
            throw Error(word + ' is a keyword, do not use it!');
        };
    },
    vueExtend: function (base, ext) {
        return Vue.extend($.extend(true, {}, base, ext));
    },
    //从数组array中删除目标target元素（只删除指定的第一个元素）
    remove(target, array) {
        for (var index in array) {
            if (target === array[index]) {
                array.splice(index, 1);
                break;
            }
        }
    },
}

//将函数挂载到全局
Vue.prototype.Helper = Helper;

var baseOption = {
    props: {
        option: {},
        data: {},
        allData: {},
        index: {},
    },
    computed: {
        prop: function () {
            return this.option.prop;
        },
        divClass: function () {
            return this.option.divClass;
        },
        divStyle: function () {
            return this.option.divStyle;
        },
        divTitle: function () {
            return Helper.toObject(this.option.divTitle, this.data, '');
        },
        readonly: function () {
            return Helper.toObject(this.option.readonly, this.data, false);
        },
        when: Helper.errorKeyword('when'),
        type: Helper.errorKeyword('type'),
    }
};

// 表格index组件，用于给表格行加入序号
var vindex = Helper.vueExtend(baseOption, {
    template: `
        <div
            :class="divClass"
            :style="divStyle"
            :title="divTitle">
            {{index + 1}}
        </div>
    `,
});

// 表格text组件, 用于展示只读的表格内容, 为默认组件类型(当组件类型没有设置, 或者无效时, 该组件被认为是text类型)
var vtext = Helper.vueExtend(baseOption, {
    template: `
        <div
            :class="divClass"
            :style="divStyle"
            :title="divTitle">
            {{text}}
        </div>
    `,
    computed: {
        text: function () {
            return this.data[this.prop] ||
                Helper.toObject(this.prop, this.data, '');
        },
    }
});

// 默认的选择框名字为 selected
var vcheckbox = Helper.vueExtend(baseOption, {
    template: `
        <div
            :class="divClass"
            :style="divStyle"
            :title="divTitle">
            <input type="checkbox"
                v-model="data[prop || 'selected']">
        </div>
    `,
});

//表格input组件, 用于输入表单
var vinput = Helper.vueExtend(baseOption, {
    template: `
        <div
            :class="divClass"
            :style="divStyle"
            :title="divTitle">
            <input
                v-for="op in inputOptionArray"
                v-model="data[op.prop]"
                :name="op.prop"
                :class="op.clazz"
                :style="op.style"
                :placeholder="op.placeholder"
                :readonly="Helper.toBool(readonly, data, false)">
        </div>
    `,
    computed: {
        inputOptionArray: function () {
            return Helper.toArray(this.option);
        },
    },
});

// 表格按钮组件, 用于对当前行操作
var vbutton = Helper.vueExtend(baseOption, {
    template: `
        <div
            :class="divClass"
            :style="divStyle"
            :title="divTitle">
            <input type="button"
                v-for="op in Helper.toArray(option)"
                :name="op.prop"
                :value="op.value"
                @click="doClick(op.click, data, allData)">
        </div>
    `,
    methods: {
        doClick: function (click, data, allData) {
            click && click.call(this, data, allData);
        },
    },
});

//总的表格组件, 属于最大的组件, 其他组件都在其之内
var vueGrid = Vue.extend({
    template: `
        <table :id="id">
            <tr>
                <th v-for="col in listComputed">
                    <div
                        v-if="col.head"
                        :style="col.style"
                        :class="col.clazz">
                        {{col.head}}
                    </div>
                </th>
            </tr>
            <tr v-for="(rowData, index) in dataComputed">
                <td v-for="col in listComputed">
                    <component
                        v-bind:is="__type(col, rowData)"
                        v-bind:option="__option(col, rowData)"
                        v-bind:data="rowData"
                        v-bind:allData="dataComputed"
                        v-bind:index="index">
                    </component>
                </td>
            </tr>
        </table>
        `,
    props: {
        // 该表格的id, 支持以#开头，或者不写#
        id: {
            type: String,
            required: true,
        },
        // 用户定义的表格列
        list: {
            type: Array,
            required: true,
        },
        // 用户定义的行操作
        row: { type: Object },
        // 当前表格所展示的数据
        data: { type: Array },
        // 该表格所关联的服务器地址, 请使用标准jquery ajax请求option
        ajax: { type: Object },
        // 如果设置了, 则数据(ajax或者loadData)会经过该函数处理之后再渲染, 务必返回数据, 否则表格将没有数据
    },
    computed: {
        listComputed: function () {
            return Helper.toArray(this.list, undefined, []).
                filter(function (col) {
                    //处理list中的when
                    return Helper.toBool(col.when, undefined, true);
                });
        },
        dataComputed: function () {
            return Helper.toArray(this.data, undefined, []);
        },
    },
    methods: {
        // 公有方法, 参数为数组类型的表格数据, 调用此方法则表格重新载入此数据
        // 此方法主要用于前端开发时可以方便开发人员调试页面
        loadData: function (data, dataFilter) {
            data = Helper.toArray(data, undefined, []);
            if (dataFilter) {
                data = dataFilter(data);
            } else {
                // noops
            }
            //this.$set(this.data, data);
            this.$props.data = data;
        },
        // 公有方法, 参数1为附加的ajax请求的参数对象或者无参数函数(返回对象), 注意如果原先已经含有同名参数, 则将覆盖原有参数
        // 参数2为返回data后的过滤器, 如果提供则覆盖原先filter.data过滤器
        // 使用该新参数重新请求数据, 并刷新表格
        loadAjax: function (ajaxOption) {
            var _this = this;
            //修改原有的ajax option
            var ajax = $.extend(true, _this.ajax || {}, ajaxOption || {});
            _this.ajax = ajax;
            if (ajax.url) {
                $.ajax(ajax)
                    .done(function (data) {
                        // 加载数据
                        _this.loadData(data);
                    });
            } else {
                //ajax没有设置，无操作
            }
        },
        addComponent: function (name, component) {
            var components = this.$options.components;
            if (components[name]) {
                throw Error('同名组件: ' + name + ' 已经存在，禁止添加！');
            } else {
                components[name] = component;
            }
        },
        selectedRow: function (checkboxProp) {
            checkboxProp = checkboxProp || 'selected';
            return this.dataComputed.filter(function (data) {
                return data[checkboxProp];
            });
        },
        __type: function (option, data) {
            var components = this.$options.components;
            for (var name in option) {
                if (components[name]) {
                    var op = option[name];
                    //转化简化写法
                    if ((typeof op) === 'string') {
                        option[name] = {
                            prop: op,
                        };
                        return name;
                    } else {
                        var when = Helper.toObject(op.when, data, true);
                        if (when) {
                            return name;
                        }
                    }
                }
            }
        },
        __option: function (option, data) {
            var type = this.__type(option, data);
            if (type) {
                return option[type];
            } else {
                return {};
            }
        },
    },
    //一些内置的默认组件， 可以通过addComponent在代码中动态添加
    components: {
        'vtext': vtext,
        'vinput': vinput,
        'vbutton': vbutton,
        'vindex': vindex,
        'vcheckbox': vcheckbox,
    },
    filters: {
    },
    mounted: function () {
        this.loadAjax();
    },
});

var VueGrid = function (vueGrid) {
    this._this = vueGrid;
}

//提供给用户使用的方法
var publicApis = {
    data: function (dataArray) {
        var _this = this._this;
        _this.loadData.call(_this, dataArray);
    },
    ajax: function (jqueryAjaxOption) {
        var _this = this._this;
        _this.loadAjax.call(_this, jqueryAjaxOption);
    },
    addComponent: function (componentName, component) {
        var _this = this._this;
        _this.addComponent.call(_this, componentName, component);
    },
    selectedRow: function (checkboxProp) {
        var _this = this._this;
        return _this.selectedRow.call(_this, checkboxProp);
    },
};

VueGrid.prototype = publicApis;

// jquery扩展, 方便用户使用
$.fn.vue = function (vueComponet, props) {
    return new vueComponet({
        el: this[0],
        propsData: props,
    });
}

// jquery钩子, 方便以如下创建表格:
// $('#table-chart').vueGrid(option)
$.fn.vueGrid = function (props) {
    return new VueGrid(
        $.fn.vue.call(this, vueGrid, props));
}
