var query = function (data, option) {
    //过滤出需要的字段
    var filtered = filterField(data, option);
    //groupBy
    var groupedMap = groupBy(filtered, option.groupBy, splitProps(option.sum));

    //需要reduce的字段
    var sumProps = splitProps(option.sum);
    var reduceProps = option.reduce || {};
    sumProps.forEach(function (elem) {
        reduceProps[elem] = reduceSum;
    });

    //对指定的字段进行reduce
    for (var key in groupedMap) {
        var array = groupedMap[key];
        for (var prop in reduceProps) {
            array[0][prop] = array
            .map(function (data) {return data[prop];})
            .reduce(function (a, b) {
                return reduceProps[prop](a, b);
            });
        }
    }

    var final = [];
    for (var key in groupedMap) {
        final.push(groupedMap[key][0]);
    }
    return final;
};

var splitProps = function (props) {
    return props.split(' ');
};

var filterField = function (data, option) {
    var map = {};

    if (option.select === '*') {
        map = data[0];
    } else {
        var sProp = splitProps(option.select);
        for (var i in sProp) {
            map[sProp[i]] = undefined;
        }

        var gProp = splitProps(option.groupBy);
        for (var i in gProp) {
            map[gProp[i]] = undefined;
        }

        var suProp = splitProps(option.sum);
        for (var i in suProp) {
            map[suProp[i]] = undefined;
        }

        for (var i in option.reduce) {
            map[i] = undefined;
        }
    }

    var props = [];
    for (var key in map) {
        props.push(key);
    }

    var newData = [];
    data.forEach(function (elem) {
        var newElem = {};
        props.forEach(function (pElem) {
            newElem[pElem] = elem[pElem];
        });
        newData.push(newElem);
    });
    return newData;
};

var reduceSum = function (a, b) {
    return parseNumber(a, 0) + parseNumber(b, 0);
};

var parseNumber = function (numberString, defaultValue) {
    var number = Number(numberString);
    if (isNaN(number)) {
        return defaultValue;
    } else {
        return number;
    }
};

var groupBy = function (data, groupBy, sumProps) {
    var map = {};
    data.forEach(function (elem) {
        var value = elem[groupBy];
        var old = map[value];
        if (old) {
            old.push(elem);
        } else {
            map[value] = [elem];
        }
    });
    return map;
};

var data = [{
    deptName: '部门1',
    deptId: 13,
    count: 1.3,
    price: 1.7,
}, {
    deptName: '部门1',
    deptId: 13,
    count: 2,
    price: 5.3,

}, {
    deptName: '部门2',
    deptId: 10,
    count: 4,
    price: 9,
}];

var grouped = query(data, {
    select: 'deptName',
    groupBy: 'deptId',
    sum: 'count',
    reduce: {
        price: function (a, b) {
            return [a, b].join(',');
        }
    }
});

$.query = query;