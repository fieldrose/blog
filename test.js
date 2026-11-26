"use strict";
class Test {
    url = null;
    name = null;
    setUrl(url) {
        this.url = url;
        return this;
    }
    setName(name) {
        this.name = name;
        return this;
    }
    build() {
        console.log(this.url, this.name);
    }
}
let a = new Test();
a.setUrl("https://www.baidu.com").setName("b").build();
