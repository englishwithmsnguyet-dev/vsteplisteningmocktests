const { ALL_TESTS } = require('./data.js');
console.log("Total length:", ALL_TESTS.length);
ALL_TESTS.forEach((t, i) => {
    if (!t) console.log("Index", i, "is", t);
});
