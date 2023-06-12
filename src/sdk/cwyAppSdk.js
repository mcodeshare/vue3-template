/*********************************************************************************************************************
*
*
*                                          财务云app通信SDK配置数据（此文件禁止改动）
*
*
**********************************************************************************************************************/
/* 配置数据 */
const SDK_CONFIG = {
  // sdk挂载到window上的名称
  NAME: 'cwyAppSdk',
  // sdk版本信息
  VERSION: '0.1.0',
  // sdk唯一标识
  SDK_KEY: "sdkId",
  // sdk用去区分onMessage回调函数的key
  CALL_KEY: 'cwyCallId',
  // 回调函数唯一标识前缀，格式为 CALL_ID_PREFIX + uuid
  CALL_ID_PREFIX: 'cwy-app-sdk-',
  // 成功回调状态码
  CALL_SUCCESS: 'success',
  // 用于区分sdk运行环境
  ENV: {
    H5: 'h5',
    // 底座自定义的userAgent需要与此相同
    CWY_RN_PREFIX: 'cwy-app-webview',
    CWY_RN_ANDROID: 'cwy-app-webview-android',
    CWY_RN_IOS: 'cwy-app-webview-ios',
  },
}

/*********************************************************************************************************************
*
*
*                                          SDK具体封装
*
*
**********************************************************************************************************************/
/* 打印日志 */
class Logger {
  // 打印日志
  log = () => { }
  // 打印异常
  error = () => { }
  // 打印sdk版本信息
  logBlok = (msg, detail = '') => {
    console.info(
      `%c [ CWY-APP-SDK ] %c ${msg}`,
      'background: #ff4d4f;color: #ffffff;border-top-left-radius: 3px;border-bottom-left-radius: 3px;padding: 0;',
      'background: #35495E;color: #ffffff;border-top-right-radius: 3px;border-bottom-right-radius: 3px;padding-right: 10px;', detail
    )
  }
  constructor(config) {
    const { debug } = config
    // 错误信息一直打印
    this.error = (...arg) => {
      console.error(...arg)
    }
    if (debug) {
      // 只有开启debug时才会打印log信息
      this.log = (...arg) => {
        console.log(...arg)
      }
    }
  }
}
/* 对外暴露的方法 */
class CwyAppSdk {
  /* sdk标识，用于区分是否自身发送的通知  */
  sdkId
  /* 版本信息 */
  version = SDK_CONFIG.VERSION
  /* 环境变量 */
  env = SDK_CONFIG.ENV.H5
  /* 日志打印 */
  logger
  /* 发送消息 */
  postMessage
  /* 接收消息 */
  onMessage
  /* 获取环境变量判断网页所处环境 */
  getEnv() {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.startsWith(SDK_CONFIG.ENV.CWY_RN_PREFIX)) {
      // app内嵌webview,除了ios都使用android标识
      if (ua === SDK_CONFIG.ENV.CWY_RN_IOS) {
        return SDK_CONFIG.ENV.CWY_RN_IOS
      }
      return SDK_CONFIG.ENV.CWY_RN_ANDROID
    }
    return SDK_CONFIG.ENV.H5
  }
  /* 判断对象是否存在某属性 */
  has(obj, key) {
    return Object.hasOwnProperty.call(obj, key)
  }
  /* 生成uuid */
  uuid(len, radix) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
    const uuid = []
    radix = radix || chars.length
    if (len) {
      for (let i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)]
    } else {
      let r
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
      uuid[14] = 'y'
      for (let n = 0; n < 36; n++) {
        if (!uuid[n]) {
          r = 0 | (Math.random() * 16)
          uuid[n] = chars[n === 19 ? (r & 0x3) | 0x8 : r]
        }
      }
    }
    return uuid.join('')
  }
  /* 回调函数存储 */
  callMap = {}
  /* 从callMap移除回调函数 */
  removeCallFn(key) {
    Reflect.deleteProperty(this.callMap, key)
  }
  /* 根据key移除object属性 */
  delByKeys(obj, keys) {
    keys.forEach(key => {
      Reflect.deleteProperty(obj, key)
    })
  }
  /* 回调函数调用 */
  handleCall(data) {
    if (data && typeof data === 'string' && data.indexOf('sdkId') !== -1 && data.indexOf(SDK_CONFIG.CALL_KEY) !== -1) {
      try {
        const jsonData = JSON.parse(data)
        // 不是此sdk的消息不处理,sdk发出的消息不监听自身
        if (jsonData.sdkId !== this.sdkId || jsonData._is_cwy_sdk_send === '1') {
          return
        }
        this.logger.log('cwy-app-sdk onmessage:', jsonData)
        const callBackId = jsonData[SDK_CONFIG.CALL_KEY]
        this.delByKeys(jsonData, [SDK_CONFIG.SDK_KEY, SDK_CONFIG.CALL_KEY])
        const { success, fail, complete } = this.callMap[callBackId]
        if (jsonData.flag === SDK_CONFIG.CALL_SUCCESS) {
          // sdk成功回调
          typeof success === 'function' && success(jsonData)
          typeof complete === 'function' && complete(jsonData)
        } else {
          // sdk失败回调
          typeof fail === 'function' && fail(jsonData)
          typeof complete === 'function' && complete(jsonData)
        }
        // 移除已经执行回调函数
        this.removeCallFn(callBackId)
      } catch (error) {
        this.logger.error(`cwy-app-sdk onmessage error`, error)
        this.logger.log('error data:', data)
      }
    }
  }
  /* 通信核心，用于抹平差异 */
  core = {
    // H5
    [SDK_CONFIG.ENV.H5]: {
      // 发布消息
      postMessage: (data) => {
        window.parent.postMessage(data, '*')
      },
      // 处理接收消息屏蔽差异
      onMessage: (e) => {
        this.handleCall(e.data)
      },
      // 订阅消息
      subscript: (fn) => {
        window.addEventListener('message', fn, false)
      },
    },
    // 安卓
    [SDK_CONFIG.ENV.CWY_RN_ANDROID]: {
      postMessage: (data) => {
        window.ReactNativeWebView.postMessage(data)
      },
      onMessage: (e) => {
        this.handleCall(e.data)
      },
      subscript: (fn) => {
        window.document.addEventListener('message', fn, false)
      }
    },
    // IOS
    [SDK_CONFIG.ENV.CWY_RN_IOS]: {
      postMessage: (data) => {
        window.ReactNativeWebView.postMessage(data)
      },
      onMessage: (e) => {
        this.handleCall(e.data)
      },
      subscript: (fn) => {
        window.addEventListener('message', fn, false)
      }
    },
  }
  /* 初始化通信JSBridge */
  initJsBridge() {
    const env = this.env
    if (this.has(this.core, env)) {
      const postMessage = this.core[env].postMessage
      const onMessage = this.core[env].onMessage
      const subscript = this.core[env].subscript
      const newPostMessage = (params) => {
        // 生成回调函数唯一标识并注册
        params[SDK_CONFIG.CALL_KEY] = SDK_CONFIG.CALL_ID_PREFIX + this.uuid()
        // 携带sdk标识用于防止处理自身发出的消息
        params[SDK_CONFIG.SDK_KEY] = this.sdkId
        // 标识是sdk发送的消息，用于sdk内部判断
        params._is_cwy_sdk_send = '1'
        const { success, complete, fail } = params
        this.callMap[params[SDK_CONFIG.CALL_KEY]] = {
          success,
          fail,
          complete
        }
        this.logger.log('cwy-app-sdk postmessage:', params)
        // 若是RN环境直接调用真实api
        try {
          this.delByKeys(params, ['success', 'fail', 'complete'])
          const jsonStr = JSON.stringify(params)
          postMessage(jsonStr)
        } catch (error) {
          this.logger.error(`cwy-app-sdk postmessage error`, error)
          this.logger.log('error data:', params)
        }
      }
      // 初始化postMessage
      this.postMessage = newPostMessage
      // 初始化onmessage
      if (onMessage) {
        this.onMessage = onMessage
      }
      // 通过不同方式订阅onmessage
      if (subscript) {
        subscript(this.onMessage)
      }
    } else {
      this.logger.error(`${SDK_CONFIG.NAME}初始化失败，原因判断所处环境异常，未支持的环境。`)
    }
  }
  constructor(config) {
    const { debug, ready } = config
    // 设置环境变量
    this.env = this.getEnv()
    // 初始化日志打印
    this.logger = new Logger({ debug: debug || false })
    // 初始化sdk唯一标识
    this.sdkId = `${SDK_CONFIG.NAME}_${SDK_CONFIG.VERSION}_${this.uuid(8)}`
    // 初始化通信JSBridge
    this.initJsBridge()

    // 将实例挂载到window上，用于父级页面调用
    window[SDK_CONFIG.NAME] = this
    // 打印sdk版本信息
    this.logger.logBlok(`version is ${this.version}`)
    // sdk初始化完成执行回调，若不存在ready则不执行
    if (ready && typeof ready === 'function') {
      ready()
    }
  }
}

export default CwyAppSdk