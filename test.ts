// 类型侧：通过声明合并给数组补上 myFilter 的方法签名
interface Array<T> {
  myFilter(f: (item: T, index: number, array: T[]) => boolean): T[]
}

// 实现侧：挂到原型上，原来的 array 参数改由 this 接收
Array.prototype.myFilter = function <T>(
  this: T[],
  f: (item: T, index: number, array: T[]) => boolean
): T[] {
  const result: T[] = []
  for (let i = 0; i < this.length; i++) {
    if (f(this[i], i, this)) {
      result.push(this[i])
    }
  }
  return result
}

const result = [1, 2, 3, 4, 5]
  .myFilter(_ => _ < 3)
  .map(_ => _ * 10)

console.log(result) // [10, 20]
