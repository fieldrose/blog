type Test = {
  (a: number): number;
  isCalled: boolean;
  //...
};

const test: Test = a => {
  if (test.isCalled) {
    return a;
  }
  test.isCalled = true;
  return a;
};
test.isCalled = false;

console.log(test.isCalled); // false
console.log(test(1)); // 1
console.log(test.isCalled); // true（第一次调用后变成 true）
console.log(test(2)); // 2
console.log(test.isCalled); // true