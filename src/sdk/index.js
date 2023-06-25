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

export default cwyAppSdk