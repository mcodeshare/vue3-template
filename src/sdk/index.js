import CwyAppSdk from './cwyAppSdk'
import userLoginInfo from './userLoginInfo'

// sdk初始化，导入开发环境用户信息
const cwyAppSdk = new CwyAppSdk({ userLoginInfo })

// 开发环境引入控制台,可自行更换其他库
if (process.env.NODE_ENV === 'development') {
  cwyAppSdk.loadScript('https://cdn.bootcss.com/eruda/1.4.3/eruda.min.js', () => {
    // eslint-disable-next-line no-undef
    eruda.init()
  })
}

// API调用
// cwyAppSdk.getUserInfo({
//   data: {},
//   success(res) {
//     console.log('成功', res)
//   },
//   fail(err) {
//     console.log('失败', err)
//   },
//   complete: (res => {
//     console.log('成功、失败都返回', res)
//   })
// })
export default cwyAppSdk