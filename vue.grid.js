// vue-grid: 基于vuejs的表格组件
// 编程规约
// 1. 含__开头(双下划线)的方法为私有方法, 其他方法为公共方法

// 公用工具类方法
var Helper = {
    // 尝试将target转换为对象
    toObject: function (target, param) {
        if ((typeof target) === 'function') {
            return target(param);
        } else {
            return target;
        }
    },
    // 尝试将target转换成数组
    toArray: function (target, param) {
        if (target instanceof Array) {
            return target;
        } else if (target instanceof Function) {
            return toArray(target(param));
        } else if (target === undefined) {
            return [];
        } else {
            return [target];
        }
    },
    // 空函数
    emptyOps: function (data) {
        return data;
    },
}

//将函数挂载到全局
Vue.prototype.Helper = Helper;

var Filter = {
    showHide: function (data) {
        return data.show !== false && data.hide !== true;
    },
};

Vue.prototype.Filter = Filter;

// 表格text组件, 用于展示只读的表格内容, 为默认组件类型(当组件类型没有设置, 或者无效时, 该组件被认为是text类型)
var vueText = Vue.extend({
    template: `<div :class="clazz" :style="style">{{text}}</div>`,
    props: {
        option: { type: Object },
        data: { type: Object },
    },
    computed: {
        text: function () {
            return this.data.text ||
                this.data[this.option.prop];
        },
        clazz: function () {
            return this.option.clazz;
        },
        style: function () {
            return this.option.style;
        },
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
                :class="op.clazz"
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
            return Helper.toArray(this.option.inputOption);
        },
    },
});

//总的表格组件, 属于最大的组件, 其他组件都在其之内
var vueGrid = Vue.extend({
    template: `
        <table :id="id">
            <tr>
                <th v-for="col in columnComputed">
                    <div
                        :style="col.style"
                        :class="col.clazz"
                        >
                        {{col.head}}
                    </div>
                </th>
            </tr>
            <tr v-for="rowData in dataComputed">
                <td v-for="col in columnComputed">
                    <component
                        v-bind:is="Helper.toObject(col.type, rowData) | defaultCompType"
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
        // 用户定义的表格列, 支持无参函数
        column: { type: Array },
        // 私有 表格所展示的数据, 该选项一般在静态测试时使用
        __data: { type: Array },
        // 该表格所关联的服务器地址, 请使用标准jquery ajax请求option
        ajax: { type: Object },
        // 对column和data的过滤函数, 参数为对应的column或data定义, 请务必返回过滤后的结果
        map: { type: Function },
    },
    computed: {
        columnComputed: function () {
            var columnComputed = Helper.toArray(this.column);
            //将column中无参函数转换对象
            columnComputed = columnComputed.map(Helper.toObject);
            var fliters = this.columnFilters;
            fliters.forEach(function (filter) {
                columnComputed = columnComputed.filter(filter);
            });
            return columnComputed;
        },
        dataComputed: function () {
            var data = this.__data;
            data = Helper.toArray(data);
            if (this.map) {
                return data.map(this.map);
            } else {
                return data;
            }
        },
        columnFilters: function () {
            var filters = [
                Filter.showHide,
            ];
            return filters;
        },
    },
    methods: {
        // 公有方法, 参数为数组类型的表格数据, 调用此方法则表格重新载入此数据
        // 此方法主要用于前端开发时可以方便开发人员调试页面
        loadData: function (data) {
            this.$props.__data = Helper.toArray(data);
        },
        // 公有方法, 参数1为附加的ajax请求的参数对象或者无参数函数(返回对象), 注意如果原先已经含有同名参数, 则将覆盖原有参数
        // 参数2为返回data后的过滤器, 如果提供则覆盖原先filter.data过滤器
        // 使用该新参数重新请求数据, 并刷新表格
        loadAjax: function (additionalAjaxData, filter) {
            var _this = this;
            var props = _this.$props;
            if (props.ajax) {
                var ajaxOption = props.ajax;
                var ajaxData = Helper.toObject(ajaxOption.data);
                var aAjaxData = Helper.toObject(additionalAjaxData);
                //用新的参数覆盖原有参数, 产生新的ajax data对象
                ajaxOption.data = $.extend(ajaxData, aAjaxData);
                $.ajax(ajaxOption)
                    .done(function (data) {
                        var decidedFilter;
                        if (filter) {
                            decidedFilter = filter;
                        } else if (props.filter && props.filter.data) {
                            decidedFilter = props.filter.data;
                        } else {
                            decidedFilter = Helper.emptyOps;
                        }
                        // 使用确定后的过滤器过滤然后加载数据
                        _this.loadData(decidedFilter(data));
                    });
            }
        },
    },
    components: {
        'vue-text': vueText,
        'vue-input': vueInput,
    },
    filters: {
        //默认组件类型为vue-text
        defaultCompType: function (type) {
            if (typeof type === 'string' && type !== '') {
                return type;
            } else {
                return 'vue-text';
            }
        },
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