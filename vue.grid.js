var vueText = Vue.extend({
    template: '<div>{{text}}</div>',
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

$.fn.vue = function (vueComponet, props) {
    return new vueComponet({
        el: this[0],
        propsData: props,
    });
}

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
                                v-bind:is="col.type"
                                v-bind:option="col"
                                v-bind:data="rowData"
                                >
                            </component>
                        </td>
                    </tr>
                </table>
                `,
    props: {
        id: { type: String },
        column: { type: Array },
        data: { type: Array },
        ajax: { type: Object },
        filter: { type: Object },
    },
    computed: {
        columnComputed: function () {
            var fliters = this.getColumnFilters();
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
        getColumnFilters: function () {
            var list = [
                this.arrayFilter(this.evalObjectFilter),
                this.arrayFilter(this.showHideFilter),
            ];
            if (this.filter && this.filter.column) {
                list.push(this.filter.column);
            }
            return list;
        },
        arrayFilter: function (filter) {
            var _this = this;
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
        showHideFilter: function (data) {
            if (data.show !== false &&
                data.hide !== true) {
                return data;
            }
        },
        evalObjectFilter: function (data, param) {
            if ((typeof data) === 'function') {
                return data(param);
            } else {
                return data;
            }
        },
        // public, intended for test
        loadData: function (data) {
            this.$props.data = data;
        },
        // public 
        loadAjax: function (param) {
            var _this = this;
            var props = _this.$props;
            if (props.ajax) {
                var ajaxOption = props.ajax;
                var ajaxData = this.evalObjectFilter(ajaxOption.data);
                param = this.evalObjectFilter(param);
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
    mounted: function () {
        this.loadAjax();
    },
});

// $('#main').vue(mainComp, {
//     type: 'vue-text',
//     text: 'asdgdsag',
// });

// $('#main').vue(mainComp, {
//     type: 'vue-input',
//     inputOption: {
//         name: 'card',
//         value: 'we are the world!',
//         style: {
//             width: '123px'
//         },
//     }
// });