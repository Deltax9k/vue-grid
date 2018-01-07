// vue-grid: 基于vuejs的表格组件
// 编程规约
// 1. 含__开头(双下划线)的方法为私有方法, 其他方法为公共方法

// 表格text组件, 用于展示只读的表格内容, 为默认组件类型(当组件类型没有设置, 或者无效时, 该组件被认为是text类型)
var vueText = Vue.extend({
    template: `<div>{{text}}</div>`,
    props: {
        option: { type: Object },
        data: { type: Object },
    },
    computed: {
        text: function () {
            return this.data.text ||
                this.data[this.option.prop];
        }
    }
});

//表格input组件, 用于输入表单
var vueInput = Vue.extend({
    template: `
        <div>
            <input
                v-for="op in inputOptionArray"
                :name="op.name"
                :value="op.value || data[op.name]"
                :class="op.class"
                :style="op.style"
                :placeholder="op.placeholder"
                >
        </div>`,
    props: {
        option: { type: Object },
        data: { type: Object },
    },
    computed: {
        inputOptionArray: function () {
            var option = this.option;
            return option.inputOption instanceof Array ?
                option.inputOption : [option.inputOption];
        },
    },
});

var vueGrid = Vue.extend({
    template: `
        <table :id="id">
            <tr>
                <th v-for="col in columnComputed">
                    <div
                        :style="col.style"
                        :class="col.class"
                        >
                        {{col.head}}
                    </div>
                </th>
            </tr>
            <tr v-for="rowData in dataComputed">
                <td v-for="col in columnComputed">
                    <component
                        v-bind:is="__resolveType(col.type, rowData) | defaultType"
                        v-bind:option="col"
                        v-bind:data="rowData"
                        >
                    </component>
                </td>
            </tr>
        </table>
        `,
    props: {
        // 该表格的id
        id: { type: String },
        // 用户定义的表格列
        column: { type: Array },
        // 表格所展示的数据, 该选项一般在静态测试时使用
        data: { type: Array },
        // 该表格所关联的服务器地址, 请使用标准jquery ajax请求option
        ajax: { type: Object },
        // 对column和data的过滤函数, 参数为对应的column或data定义, 请务必返回过滤后的结果
        filter: { type: Object },
    },
    computed: {
        columnComputed: function () {
            var fliters = this.__getColumnFilters();
            var computed = this.column;
            fliters.forEach(function (filter) {
                computed = filter(computed);
            });
            return computed;
        },
        dataComputed: function () {
            var data = this.data;
            if (this.filter && this.filter.data) {
                var filter = this.filter.data;
                if (filter instanceof Function) {
                    var filtered = filter(data);
                    if (!filtered) {
                        log.warn('filter should return filtered data');
                    } else {
                        return filtered;
                    }
                }
            }
            return data;
        },
    },
    methods: {
        __getColumnFilters: function () {
            var list = [
                this.__arrayFilter(this.__evalObjectFilter),
                this.__arrayFilter(this.__showHideFilter),
            ];
            if (this.filter && this.filter.column) {
                list.push(this.filter.column);
            }
            return list;
        },
        __resolveType: function (type, data) {
            if (type instanceof Function) {
                return type(data);
            } else {
                return type;
            }
        },
        __arrayFilter: function (filter) {
            return function (array) {
                var list = [];
                array.forEach(function (elem) {
                    var obj = filter(elem);
                    if (obj) {
                        list.push(obj);
                    }
                });
                return list;
            }
        },
        __showHideFilter: function (data) {
            if (data.show !== false &&
                data.hide !== true) {
                return data;
            }
        },
        __evalObjectFilter: function (data, param) {
            if ((typeof data) === 'function') {
                return data(param);
            } else {
                return data;
            }
        },
        // 公有方法, 参数为数组类型的表格数据, 调用此方法则表格重新载入此数据
        loadData: function (data) {
            this.$props.data = data;
        },
        // 公有方法, 参数为ajax请求的参数对象, 如果已经含有同名参数, 则将覆盖原有参数
        // 使用该新参数重新请求数据, 并刷新表格
        loadAjax: function (param) {
            var _this = this;
            var props = _this.$props;
            if (props.ajax) {
                var ajaxOption = props.ajax;
                var ajaxData = this.__evalObjectFilter(ajaxOption.data);
                param = this.__evalObjectFilter(param);
                ajaxData = $.extend(ajaxData, param);
                ajaxOption.data = ajaxData;
                $.ajax(ajaxOption)
                    .done(function (data) {
                        if (props.filter && props.filter.data) {
                            var filtered = props.filter.data(data);
                            _this.loadData(filtered);
                        }
                    });
            }
        },
    },
    components: {
        'vue-text': vueText,
        'vue-input': vueInput,
    },
    filters: {
        defaultType: function (type) {
            if (typeof type === 'string' && type !== '') {
                return type;
            } else {
                return 'vue-text';
            }
        }
    },
    mounted: function () {
        this.loadAjax();
    },
});

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
    return $.fn.vue.call(this, vueGrid, props);
}