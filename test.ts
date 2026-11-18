class A {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class B {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

function printName(instance: A) {
  console.log(instance.name);
}

printName(new A("11")); // Ok
printName(new B("22")); // Ok
