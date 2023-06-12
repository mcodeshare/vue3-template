### 一、sdk 使用说明

- 此 sdk 支持 h5 及 reactNative 环境下双向通信，并抹平了 h5 及 reactNative 环境差异。
- 因为 reactNative 的 webview 只支持传递字符串，所以 sdk 内 postMessage 和 onMessage 传递和接收的参数需要保证能够被 JSON.stringify 和 JSON.parse 正常处理。
- 调用 sdk 的 postMessage 方法时,方法内部会自动将传递的参数通过 JSON.stringify 转化为字符串进行发送，sdk 的 onMessage 回调被触发时会自动使用 JSON.parse 进行解析。
- sdk 通过浏览器 userAgent 判断所处环境，所以在 ReactNative 环境下需要通过 webview 自定义 userAgent='cwy-app-webview'
- sdk 在此项目中使用可参照 sdk-use-example.js

#### 1、引入 sdk

```
import CwyAppSdk from 'sdk所在路径'

// 如需h5下直接调试需引入h5DevelopApi
import './h5DevelopApi'
```

#### 2、初始化 sdk,实例将自动挂载到 window 上

```
new CwyAppSdk({
  // 是否开启调试，开启调试会在控制台打印日志
  debug: process.env.NODE_ENV === 'development',

  // sdk挂载完成会触发
  ready: () => {
    console.log('sdk初始化完成')
  },
})
```

- 引入 H5 调试环境和移动调试控制台

```
/* 引入开发依赖api,非真机调试会调用此api，打包会自动排除此部分代码 */
if (process.env.NODE_ENV === 'development') {
  // 注册用户登录信息到开发环境
  const userLoginInfo = require('./userLoginInfo.json')
  new H5DevelopApi({ userLoginInfo })

  // 远程加载js
  const loadScript = (url, callback) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    if (script.readyState) {
      script.onreadystatechange = function () {
        if (script.readyState == "complete" || script.readyState == "loaded") {
          callback()
        }
      }
    } else {
      script.onload = function () {
        callback()
      }
    }
    script.src = url
    document.head.appendChild(script)
  }
  // 引入移动端控制台
  loadScript('https://cdn.bootcss.com/eruda/1.4.3/eruda.min.js', () => {
    // eslint-disable-next-line no-undef
    eruda.init()
  })
}
```

#### 3、使用 sdk 的 postMessage 方法发送消息

```
// 通过sdk发送消息，发送的data、action可以根据api文档，只要能被JSON.stringify 和 JSON.parse 正常处理即可
window.cwyAppSdk.postMessage({
  data: {},
  action: 'USER_INFO',
  // 成功回调
  success: (res) => {
    console.log('成功', res)
  },
  // 失败回调
  fail: (res) => {
    console.log('失败', res)
  },
  // 不论成功或失败都会调用
  complete: (res => {
    console.log('成功、失败都返回', res)
  })
})

```

#### 4、发送及接收消息参数约定

- sdk 发送消息参数

```
{
  // 【必传】调用api标识
  action: 'USER_INFO'

  // 【必传】发送的data可以根据api文档编写，只要能被JSON.stringify 和 JSON.parse 正常处理即可
  data: {},

  // 【非必传】成功回调
  success: (res) => {
    console.log('成功', res)
  },

  // 【非必传】失败回调
  fail: (res) => {
    console.log('失败', res)
  },

  // 【非必传】不论成功或失败都会调用
  complete: (res => {
    console.log('成功、失败都返回', res)
  })
}
```

- 底座发回的消息

```
{

  // 【必传】从接收到的数据复制
  action: 'USER_INFO'

  // 【必传】data可以是任何可被JSON.stringify 和 JSON.parse正常处理的数据,具体数据根据回调的约定编写
  data: {},

  // 【必传】消息成功或者失败
  flag:'success',

  // 【必传】从接收到的数据复制,这个参数是通信sdk自动生成的标识,用户无感，此参数用于判断执行哪个回调
  cwyCallId:'cwy-app-sdk-461F9EA6-790E-y8B8-B25C-7976C4DCB89B',

  // 【必传】从接收到的数据复制,这个参数是通信sdk自动生成的标识,用户无感，此参数用于判断哪个初始的sdk发出的
  sdkId:"cwyAppSdk_0.1.0_4Krdl5Wf",

}
```
