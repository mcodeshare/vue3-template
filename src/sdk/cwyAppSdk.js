/*********************************************************************************************************************
*
*
*                              财务云APP SDK,此文件禁止改动，version：0.1.0
*
*
**********************************************************************************************************************/
const CONFIG = {
  // 自动挂载到window.cwyAppSdk
  SDK_HOME: 'cwyAppSdk',
  // 版本信息
  VERSION: '0.1.0'
}

/* 引入通信sdk */
import CwyAppBridge from './cwyAppBridge'
/* 初始化通信sdk */
const cwyAppBridge = new CwyAppBridge({
  debug: false,//process.env.NODE_ENV === 'development',
  ready: () => { }
})

/*********************************************************************************************************************
*
*
*                                         迁移Taro H5端 Api （具体调用可参照taro官方文档）
*
*
**********************************************************************************************************************/

/* ***************************************** 迁移Taro H5环境 Taro.request （jsonp调用方式未迁移） ***************************************** */
/* 拼接对象为字符串 */
const serializeParams = (params) => {
  if (!params) {
    return ''
  }
  return Object.keys(params)
    .map(key => (
      `${encodeURIComponent(key)}=${typeof (params[key]) === 'object'
        ? encodeURIComponent(JSON.stringify(params[key]))
        : encodeURIComponent(params[key])}`))
    .join('&')
}
/* 拼接请求url */
const generateRequestUrlWithParams = (url, params) => {
  params = typeof params === 'string' ? params : serializeParams(params)
  if (params) {
    url += (~url.indexOf('?') ? '&' : '?') + params
  }
  url = url.replace('?&', '?')
  return url
}
/* 网络请求方法 */
const request = (options) => {
  options = options || {}
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }
  const { success, complete, fail } = options
  let url = options.url
  const params = {}
  const res = {}
  params.method = options.method || 'GET'
  const methodUpper = params.method.toUpperCase()
  params.cache = options.cache || 'default'
  if (methodUpper === 'GET' || methodUpper === 'HEAD') {
    url = generateRequestUrlWithParams(url, options.data)
  } else if (typeof options.data === 'object') {
    let contentType = options.header && (options.header['Content-Type'] || options.header['content-type'])
    if (contentType && contentType.indexOf('application/json') >= 0) {
      params.body = JSON.stringify(options.data)
    } else if (contentType && contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
      params.body = serializeParams(options.data)
    } else {
      params.body = options.data
    }
  } else {
    params.body = options.data
  }
  if (options.header) {
    params.headers = options.header
  }
  if (options.mode) {
    params.mode = options.mode
  }
  if (options.signal) {
    params.signal = options.signal
  }
  params.credentials = options.credentials
  return fetch(url, params)
    .then(response => {
      res.statusCode = response.status
      res.header = {}
      response.headers.forEach((val, key) => {
        res.header[key] = val
      })
      if (!response.ok) {
        throw response
      }
      if (options.responseType === 'arraybuffer') {
        return response.arrayBuffer()
      }
      if (res.statusCode !== 204) {
        if (options.dataType === 'json' || typeof options.dataType === 'undefined') {
          return response.json()
        }
      }
      if (options.responseType === 'text') {
        return response.text()
      }
      return Promise.resolve(null)
    })
    .then(data => {
      res.data = data
      typeof success === 'function' && success(res)
      typeof complete === 'function' && complete(res)
      return res
    })
    .catch(err => {
      typeof fail === 'function' && fail(err)
      typeof complete === 'function' && complete(res)
      return Promise.reject(err)
    })
}
/* ***************************************** 迁移Taro H5环境 Taro.downloadFile ***************************************** */
const createCallbackManager = () => {
  const callbacks = []

  /**
   * 添加回调
   * @param {{ callback: function, ctx: any } | function} opt
   */
  const add = (opt) => {
    callbacks.push(opt)
  }

  /**
   * 移除回调
   * @param {{ callback: function, ctx: any } | function} opt
   */
  const remove = (opt) => {
    let pos = -1
    callbacks.forEach((callback, k) => {
      if (callback === opt) {
        pos = k
      }
    })
    if (pos > -1) {
      callbacks.splice(pos, 1)
    }
  }

  /**
   * 获取回调函数数量
   * @return {number}
   */
  const count = () => callbacks.length

  /**
   * 触发回调
   * @param  {...any} args 回调的调用参数
   */
  const trigger = (...args) => {
    callbacks.forEach(opt => {
      if (typeof opt === 'function') {
        opt(...args)
      } else {
        const { callback, ctx } = opt
        callback.call(ctx, ...args)
      }
    })
  }

  return {
    add,
    remove,
    count,
    trigger
  }
}
const NETWORK_TIMEOUT = 60000
const XHR_STATS = {
  UNSENT: 0, // Client has been created. open() not called yet.
  OPENED: 1, // open() has been called.
  HEADERS_RECEIVED: 2, // send() has been called, and headers and status are available.
  LOADING: 3, // Downloading; responseText holds partial data.
  DONE: 4 // The operation is complete.
}
/**
 * 设置xhr的header
 * @param {XMLHttpRequest} xhr
 * @param {Object} header
 */
const setHeader = (xhr, header) => {
  let headerKey
  for (headerKey in header) {
    xhr.setRequestHeader(headerKey, header[headerKey])
  }
}
const createDownloadTask = ({ url, header, success, error }) => {
  let timeout
  const apiName = 'downloadFile'
  const xhr = new XMLHttpRequest()
  const callbackManager = {
    headersReceived: createCallbackManager(),
    progressUpdate: createCallbackManager()
  }

  xhr.withCredentials = true
  xhr.open('GET', url, true)
  xhr.responseType = 'blob'
  setHeader(xhr, header)

  xhr.onprogress = e => {
    const { loaded, total } = e
    callbackManager.progressUpdate.trigger({
      progress: Math.round(loaded / total * 100),
      totalBytesWritten: loaded,
      totalBytesExpectedToWrite: total
    })
  }

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== XHR_STATS.HEADERS_RECEIVED) return
    callbackManager.headersReceived.trigger({
      header: xhr.getAllResponseHeaders()
    })
  }

  xhr.onload = () => {
    const response = xhr.response
    const status = xhr.status
    success({
      errMsg: `${apiName}:ok`,
      statusCode: status,
      tempFilePath: window.URL.createObjectURL(response)
    })
  }

  xhr.onabort = () => {
    clearTimeout(timeout)
    error({
      errMsg: `${apiName}:fail abort`
    })
  }

  xhr.onerror = e => {
    error({
      errMsg: `${apiName}:fail ${e.message}`
    })
  }

  const send = () => {
    xhr.send()
    timeout = setTimeout(() => {
      xhr.onabort = null
      xhr.onload = null
      xhr.onprogress = null
      xhr.onreadystatechange = null
      xhr.onerror = null
      abort()
      error({
        errMsg: `${apiName}:fail timeout`
      })
    }, NETWORK_TIMEOUT)
  }

  send()

  /**
   * 中断任务
   */
  const abort = () => {
    xhr.abort()
  }

  /**
   * 监听 HTTP Response Header 事件。会比请求完成事件更早
   * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
   */
  const onHeadersReceived = callbackManager.headersReceived.add
  /**
   * 取消监听 HTTP Response Header 事件
   * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
   */
  const offHeadersReceived = callbackManager.headersReceived.remove

  /**
   * 监听进度变化事件
   * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
   */
  const onProgressUpdate = callbackManager.progressUpdate.add
  /**
   * 取消监听进度变化事件
   * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
   */
  const offProgressUpdate = callbackManager.progressUpdate.remove

  return {
    abort,
    onHeadersReceived,
    offHeadersReceived,
    onProgressUpdate,
    offProgressUpdate
  }
}
/**
 * 下载文件资源到本地。客户端直接发起一个 HTTPS GET 请求，返回文件的本地临时路径。使用前请注意阅读相关说明。
 * 注意：请在服务端响应的 header 中指定合理的 Content-Type 字段，以保证客户端正确处理文件类型。
 * @todo 未挂载 task.offHeadersReceived
 * @todo 未挂载 task.offProgressUpdate
 * @param {Object} object 参数
 * @param {string} object.url 下载资源的 url
 * @param {Object} [object.header] HTTP 请求的 Header，Header 中不能设置 Referer
 * @param {string} [object.filePath] *指定文件下载后存储的路径
 * @param {function} [object.success] 接口调用成功的回调函数
 * @param {function} [object.fail] 接口调用失败的回调函数
 * @param {function} [object.complete] 接口调用结束的回调函数（调用成功、失败都会执行）
 * @returns {DownloadTask}
 */
const downloadFile = ({ url, header, success, fail, complete }) => {
  let task
  const promise = new Promise((resolve, reject) => {
    task = createDownloadTask({
      url,
      header,
      success: res => {
        success && success(res)
        complete && complete(res)
        resolve(res)
      },
      error: res => {
        fail && fail(res)
        complete && complete(res)
        reject(res)
      }
    })
  })

  promise.headersReceive = task.onHeadersReceived
  promise.progress = task.onProgressUpdate
  promise.abort = task.abort

  return promise
}
/* ***************************************** 迁移Taro H5环境 Taro.uploadFile ***************************************** */
/**
* 将 blob url 转化为文件
* @param {string} url 要转换的 blob url
* @returns {Promise<Blob>}
*/
const convertObjectUrlToBlob = url => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'blob'
    // eslint-disable-next-line no-unused-vars
    xhr.onload = function (e) {
      if (this.status === 200) {
        resolve(this.response)
      } else {
        /* eslint-disable prefer-promise-reject-errors */
        reject({ status: this.status })
      }
    }
    xhr.send()
  })
}
const createUploadTask = ({ url, filePath, fileName, formData, name, header, success, error, withCredentials }) => {
  let timeout
  let formKey
  const apiName = 'uploadFile'
  const xhr = new XMLHttpRequest()
  const form = new FormData()
  const callbackManager = {
    headersReceived: createCallbackManager(),
    progressUpdate: createCallbackManager()
  }

  xhr.withCredentials = withCredentials

  xhr.open('POST', url)
  setHeader(xhr, header)

  for (formKey in formData) {
    form.append(formKey, formData[formKey])
  }

  xhr.upload.onprogress = e => {
    const { loaded, total } = e
    callbackManager.progressUpdate.trigger({
      progress: Math.round(loaded / total * 100),
      totalBytesSent: loaded,
      totalBytesExpectedToSent: total
    })
  }

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== XHR_STATS.HEADERS_RECEIVED) return
    callbackManager.headersReceived.trigger({
      header: xhr.getAllResponseHeaders()
    })
  }

  xhr.onload = () => {
    const status = xhr.status
    clearTimeout(timeout)
    success({
      errMsg: `${apiName}:ok`,
      statusCode: status,
      data: xhr.responseText || xhr.response
    })
  }

  xhr.onabort = () => {
    clearTimeout(timeout)
    error({
      errMsg: `${apiName}:fail abort`
    })
  }

  xhr.onerror = e => {
    clearTimeout(timeout)
    error({
      errMsg: `${apiName}:fail ${e.message}`
    })
  }

  const send = () => {
    xhr.send(form)
    timeout = setTimeout(() => {
      xhr.onabort = null
      xhr.onload = null
      xhr.upload.onprogress = null
      xhr.onreadystatechange = null
      xhr.onerror = null
      abort()
      error({
        errMsg: `${apiName}:fail timeout`
      })
    }, NETWORK_TIMEOUT)
  }

  convertObjectUrlToBlob(filePath)
    .then(blob => {
      const tmpFilename = fileName || blob.name || `file-${Date.now()}`
      // 之前这里文件类型是blob，可能丢失信息 这里转换成 File 对象
      const file = new File([blob], tmpFilename, {
        type: blob.type
      })
      form.append(name, file, tmpFilename)
      send()
    })
    .catch(e => {
      error({
        errMsg: `${apiName}:fail ${e.message}`
      })
    })

  /**
   * 中断任务
   */
  const abort = () => {
    clearTimeout(timeout)
    xhr.abort()
  }

  /**
   * 监听 HTTP Response Header 事件。会比请求完成事件更早
   * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
   */
  const onHeadersReceived = callbackManager.headersReceived.add
  /**
   * 取消监听 HTTP Response Header 事件
   * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
   */
  const offHeadersReceived = callbackManager.headersReceived.remove

  /**
   * 监听进度变化事件
   * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
   */
  const onProgressUpdate = callbackManager.progressUpdate.add
  /**
   * 取消监听进度变化事件
   * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
   */
  const offProgressUpdate = callbackManager.progressUpdate.remove

  return {
    abort,
    onHeadersReceived,
    offHeadersReceived,
    onProgressUpdate,
    offProgressUpdate
  }
}

/**
 * 将本地资源上传到服务器。客户端发起一个 HTTPS POST 请求，其中 content-type 为 multipart/form-data。使用前请注意阅读相关说明。
 * @param {Object} object 参数
 * @param {string} object.url 开发者服务器地址
 * @param {string} object.filePath 要上传文件资源的路径
 * @param {string} object.name 文件对应的 key，开发者在服务端可以通过这个 key 获取文件的二进制内容
 * @param {string} [object.fileName] （仅H5）上传的文件名
 * @param {Object} [object.header] HTTP 请求 Header，Header 中不能设置 Referer
 * @param {Object} [object.formData] HTTP 请求中其他额外的 form data
 * @param {function} [object.success] 接口调用成功的回调函数
 * @param {function} [object.fail] 接口调用失败的回调函数
 * @param {function} [object.complete] 接口调用结束的回调函数（调用成功、失败都会执行）
 * @param {Boolean} [object.withCredentials] （仅H5）表示跨域请求时是否需要使用凭证
 * @returns {UploadTask}
 */
const uploadFile = ({ url, filePath, fileName, name, header, formData, success, fail, complete, withCredentials = true }) => {
  let task
  const promise = new Promise((resolve, reject) => {
    task = createUploadTask({
      url,
      header,
      name,
      filePath,
      formData,
      fileName,
      success: res => {
        success && success(res)
        complete && complete(res)
        resolve(res)
      },
      error: res => {
        fail && fail(res)
        complete && complete(res)
        reject(res)
      },
      withCredentials
    })
  })

  promise.headersReceive = task.onHeadersReceived
  promise.progress = task.onProgressUpdate
  promise.abort = task.abort

  return promise
}

/* ***************************************** 迁移Taro H5环境 Taro.chooseImage ***************************************** */
const upperCaseFirstLetter = (string) => {
  if (typeof string !== 'string') return string
  string = string.replace(/^./, match => match.toUpperCase())
  return string
}
const getParameterError = ({ name = '', para, correct, wrong }) => {
  const parameter = para ? `parameter.${para}` : 'parameter'
  const errorType = upperCaseFirstLetter(wrong === null ? 'Null' : typeof wrong)
  return `${name}:fail parameter error: ${parameter} should be ${correct} instead of ${errorType}`
}
const shouleBeObject = (target) => {
  if (target && typeof target === 'object') return { res: true }
  return {
    res: false,
    msg: getParameterError({
      correct: 'Object',
      wrong: target
    })
  }
}
/**
* 从本地相册选择图片或使用相机拍照。
* @param {Object} object 参数
* @param {string[]} [object.sourceType=['album', 'camera']] 选择图片的来源，h5允许传入 `user/environment/camera/`
* @param {string[]} [object.sizeType=['original', 'compressed']] 所选的图片的尺寸（h5端未实现）
* @param {number} [object.count=9] 最多可以选择的图片张数
* @param {function} [object.success] 接口调用成功的回调函数
* @param {function} [object.fail] 接口调用失败的回调函数
* @param {function} [object.complete] 接口调用结束的回调函数（调用成功、失败都会执行）
* @param {string} [object.imageId] 用来上传的input元素ID（仅h5端）
*/
const chooseImage = function (options) {
  // options must be an Object
  const isObject = shouleBeObject(options)
  if (!isObject.res) {
    const res = { errMsg: `chooseImage${isObject.msg}` }
    console.error(res.errMsg)
    return Promise.reject(res)
  }

  const { count = 1, success, fail, complete, imageId = 'taroChooseImage', sourceType = ['album', 'camera'] } = options
  const res = {
    errMsg: 'chooseImage:ok',
    tempFilePaths: [],
    tempFiles: []
  }
  const sourceTypeString = sourceType && sourceType.toString()
  const acceptableSourceType = ['user', 'environment', 'camera']

  if (count && typeof count !== 'number') {
    res.errMsg = getParameterError({
      name: 'chooseImage',
      para: 'count',
      correct: 'Number',
      wrong: count
    })
    console.error(res.errMsg)
    typeof fail === 'function' && fail(res)
    typeof complete === 'function' && complete(res)
    return Promise.reject(res)
  }

  let taroChooseImageId = document.getElementById(imageId)
  if (!taroChooseImageId) {
    let obj = document.createElement('input')
    obj.setAttribute('type', 'file')
    obj.setAttribute('id', imageId)
    if (count > 1) {
      obj.setAttribute('multiple', 'multiple')
    }
    if (acceptableSourceType.indexOf(sourceTypeString) > -1) {
      obj.setAttribute('capture', sourceTypeString)
    }
    obj.setAttribute('accept', 'image/*')
    obj.setAttribute('style', 'position: fixed; top: -4000px; left: -3000px; z-index: -300;')
    document.body.appendChild(obj)
    taroChooseImageId = document.getElementById(imageId)
  } else {
    if (acceptableSourceType.indexOf(sourceTypeString) > -1) {
      taroChooseImageId.setAttribute('capture', sourceTypeString)
    } else {
      taroChooseImageId.removeAttribute('capture')
    }
  }
  let taroChooseImageCallback
  const taroChooseImagePromise = new Promise(resolve => {
    taroChooseImageCallback = resolve
  })
  let TaroMouseEvents = document.createEvent('MouseEvents')
  TaroMouseEvents.initEvent('click', true, true)
  taroChooseImageId.dispatchEvent(TaroMouseEvents)
  taroChooseImageId.onchange = function (e) {
    let arr = [...e.target.files].splice(0, count)
    arr && arr.forEach(item => {
      let blob = new Blob([item], {
        type: item.type
      })
      let url = URL.createObjectURL(blob)
      res.tempFilePaths.push(url)
      res.tempFiles.push({ path: url, size: item.size, type: item.type, originalFileObj: item })
    })
    typeof success === 'function' && success(res)
    typeof complete === 'function' && complete(res)
    taroChooseImageCallback(res)
    e.target.value = ''
  }
  return taroChooseImagePromise
}
/*********************************************************************************************************************
* 
* 
*                                         h5端模拟taro对象，通过H5Api.xxx调用
*
*
**********************************************************************************************************************/
const H5Api = {
  request,
  downloadFile,
  uploadFile,
  chooseImage
}
/*********************************************************************************************************************
* 
* 
*                                         模拟底座工程对api的二次封装
*
*
**********************************************************************************************************************/
const H5Request = (params) => {
  const { url, method, responseType, dataType } = params
  return new Promise((resolve, reject) => {
    H5Api.request({
      url,
      method,
      data: params.data,
      responseType: responseType || 'text',
      dataType: dataType || 'json',
      header: {},
      timeout: 40000,
      success: res => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: (err) => {
        reject(`Network request failed ${err.status}`)
      }
    })
  })
}
const imageToBase64 = (filePath) => {
  return new Promise((resolve) => {
    window.URL = window.URL || window.webkitURL
    var xhr = new XMLHttpRequest()
    xhr.open('get', filePath, true)
    // 至关重要
    xhr.responseType = 'blob'
    xhr.onload = function () {
      if (this.status === 200) {
        // 得到一个blob对象
        var blob = this.response
        // 至关重要
        const oFileReader = new FileReader()
        oFileReader.onloadend = function (e) {
          // 配置页面用
          resolve(e.target.result)
        }
        oFileReader.readAsDataURL(blob)
      }
    }
    xhr.send()
  })
}
// 下载base64文件
const downloadBase64 = (base64, fileName) => {
  return new Promise((resolve) => {
    const base64ToBlob = function (base64) { // base64编码格式：'data:image/jpeg;base64,/9j/4AAQSkZJRgAB...'
      const MIMEAndCode = base64.split(';base64,'); // 分割完整的base64编码分别得到各个部分（MIME文件类型相关、纯编码）
      const contentType = MIMEAndCode[0].split(':')[1]; // image/jpeg，用于构造Blob对象时指定文件类型type
      const rawCode = window.atob(MIMEAndCode[1]);
      const rawCodeLength = rawCode.length;
      const uInt8Array = new Uint8Array(rawCodeLength);
      for (let i = 0; i < rawCodeLength; i++) {
        uInt8Array[i] = rawCode.charCodeAt(i);
      }
      return new Blob([uInt8Array], {
        type: contentType
      });
    };
    const blob = base64ToBlob(base64)
    let a = document.createElement('a');
    const fileUrl = URL.createObjectURL(blob);
    a.href = fileUrl
    a.download = fileName;
    a.click();
    a = null;
    resolve(fileUrl)
  })
}
const H5UploadFile = async (params) => {
  let base64 = await imageToBase64(params.filePath)
  return new Promise((resolve, reject) => {
    request({ url: params.url, method: 'POST', data: { name: (params.formData.name || params.name), baseContent: base64, ...(params.formData || {}) } }).then(res => {
      resolve(res)
    }).catch(err => {
      reject(err)
    })
  })
}
const H5DownloadFile = (params) => {
  return new Promise((resolve, reject) => {
    request({ url: params.url, method: 'GET' }).then(res => {
      downloadBase64(res.data.baseContent, res.data.filename).then(path => {
        resolve({ statusCode: 200, tempFilePath: path })
      })
    }).catch(err => {
      reject(err)
    })
  })
}


/*********************************************************************************************************************
* 
* 
*                                         SDK具体封装
*
*
**********************************************************************************************************************/

/* api映射 */
const apiMap = {
  // 网络请求
  request: {
    action: 'REQUEST',
    verify: (params, key) => {
      if (!params.method) {
        throwErr('method is required', key)
      }
      if (!params.url) {
        throwErr('url is required', key)
      }
      return true
    }
  },
  // 文件上传
  uploadFile: {
    action: 'UPLOAD_FILE',
    verify: (params, key) => {
      if (!params.url) {
        throwErr('url is required', key)
      }
      if (!params.filePath) {
        throwErr('filePath is required', key)
      }
      if (!params.name) {
        throwErr('name is required', key)
      }
      if (!params.formData) {
        throwErr('formData is required', key)
      }
      return true
    }
  },
  // 文件下载
  downloadFile: {
    action: 'DOWNLOAD_FILE',
    verify: (params, key) => {
      if (!params.url) {
        throwErr('url is required', key)
      }
      if (!params.data) {
        throwErr('data is required', key)
      }
      return true
    }
  },
  // 获取用户登录信息
  getUserInfo: {
    action: 'USER_INFO',
    // return true 校验通过
    verify: () => {
      return true
    }
  },
  // 获取网页所属环境
  getEnv: {
    action: 'ENV',
    verify: () => {
      return true
    }
  },
  // 获取当前设备详细参数
  getSystemInfoSync: {
    action: 'SYSTEM_INFO',
    verify: () => {
      return true
    }
  },
  // 打开相册
  chooseImage: {
    action: 'CHOOSE_IMAGE',
    verify: (params, key) => {
      if (!params.sourceType) {
        throwErr('sourceType is required', key)
      }
      return true
    }
  },
  // 扫一扫功能
  scanCode: {
    action: 'SCAN_CODE',
    verify: () => {
      return true
    }
  },
  // 获取本地文件列表
  chooseFile: {
    action: 'CHOOSE_FILE',
    // return true 校验通过
    verify: (params, key) => {
      if (!params.type) {
        throwErr('type is required', key)
      }
      if (!params.pageConfig) {
        throwErr('pageConfig is required', key)
      }
      return true
    }
  },
  // 跳转原生某个界面
  navigateTo: {
    action: 'NAVIGATE_TO',
    verify: (url, key) => {
      if (!url) {
        throwErr('url is required', key)
      }
      return true
    }
  },
  // 回退当前页面默认是1，传入可回退多个
  navigateBack: {
    action: 'NAVIGATE_BACK',
    verify: () => {
      return true
    }
  },
  // 关闭当前页面跳转到原生某个界面
  redirectTo: {
    action: 'REDIRECT_TO',
    verify: (url, key) => {
      if (!url) {
        throwErr('url is required', key)
      }
      return true
    }
  }
}
/* api键映射 */
const apiNameMap = {}

Object.keys(apiMap).map(key => {
  apiNameMap[apiMap[key].action] = key
})

/*********************************************************************************************************************
* 
* 
*                                         H5开发环境监听api调用，并进行模拟底座处理逻辑
*
*
**********************************************************************************************************************/
class Listener {
  constructor(devData) {
    // 保存开发数据
    this.devData = devData || {}
    // 判断是否H5环境
    this.isH5 = this.judgeIsH5()
    if (this.isH5) {
      // h5端监听postMessage
      window.addEventListener('message', this.run.bind(this), false)
    }
  }
  // 环境变量
  isH5
  // 判断是否为H5
  judgeIsH5 = () => {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.startsWith('cwy-app-webview')) {
      // app内嵌webview
      return false
    }
    // 未知环境按h5处理
    return true
  }
  // 用于存储api
  apiMap = {
    /* get\post请求 */
    'REQUEST': ({ data, successCall, failCall }) => {
      H5Request(data).then(res => {
        successCall(res)
      }).catch(err => {
        failCall(err)
      })
    },
    /* 上传文件 */
    'UPLOAD_FILE': ({ data, successCall, failCall }) => {
      H5UploadFile(data).then(res => {
        successCall(res)
      }).catch(err => {
        failCall(err)
      })
    },
    /* 文件下载 */
    'DOWNLOAD_FILE': ({ data, successCall, failCall }) => {
      H5DownloadFile(data).then(res => {
        successCall(res)
      }).catch(err => {
        failCall(err)
      })
    },
    /* 获取用户登录信息 */
    'USER_INFO': ({ successCall, failCall }) => {
      if (this.devData.userLoginInfo) {
        successCall(this.devData.userLoginInfo)
      } else {
        failCall(null)
      }
    },
    /* 选择图片 */
    'CHOOSE_IMAGE': ({ data, successCall, failCall }) => {
      H5Api.chooseImage(data).then(res => {
        successCall(res)
      }).catch(err => {
        failCall(err)
      })
    }
  }
  // 发回消息
  sendMsg(data) {
    cwyAppBridge.onMessage({ data: JSON.stringify(data) })
  }
  // 组织发送的消息
  buildMsg(flag, params, data) {
    return {
      sdkId: params.sdkId,
      cwyCallId: params.cwyCallId,
      action: params.action,
      flag, //回调成功失败状态码
      data: data || {}
    }
  }
  // 根据报文调用api
  run(e) {
    if (e.data && typeof e.data === 'string' && e.data.indexOf('sdkId') !== -1 && e.data.indexOf('cwyCallId') !== -1) {
      try {
        const jsonData = JSON.parse(e.data) || {}
        const { action } = jsonData
        if (Object.hasOwnProperty.call(this.apiMap, action)) {
          // 根据action调用不同api
          this.apiMap[action]({
            data: jsonData.data,
            successCall: (v) => {
              const sendData = this.buildMsg('success', jsonData, v)
              this.sendMsg(sendData)
            },
            failCall: (v) => {
              const sendData = this.buildMsg('fail', jsonData, v)
              this.sendMsg(sendData)
            }
          })
        } else {
          // 调用失败移除回调监听
          cwyAppBridge._removeCallFn(jsonData.cwyCallId)
          console.log(`%c 请在真机调试 ${apiNameMap[jsonData.action]} `, 'background: #ff4d4f;color: #ffffff;border-radius: 3px;padding: 0;', jsonData)
        }
      } catch (error) {
        console.error('调用参数异常', error)
        console.log('异常数据 => ', e.data)
      }
    }
  }
}


/*********************************************************************************************************************
* 
* 
*                                         封装通信消息并将封装后的api挂载到cwyAppSdk
*
*
**********************************************************************************************************************/

const throwErr = (err, key) => {
  throw new Error(`cwyAppSdk.${key}: ${err}`)
}

class CwyAppSdk {
  constructor(config) {
    this.bindApi()
    if (process.env.NODE_ENV === 'development') {
      this.initH5Api(config)
    }
    return window[CONFIG.SDK_HOME]
  }
  // 初始化H5api，只在开发环境生效
  initH5Api({ userLoginInfo }) {
    new Listener({ userLoginInfo })
  }
  // 绑定api到cwyAppSdk对象
  bindApi() {
    const tempSdk = {}
    Object.keys(apiMap).forEach(key => {
      tempSdk[key] = (params) => {
        const { action, verify } = apiMap[key]
        if (!verify(params.data, key)) {
          return
        }
        cwyAppBridge.postMessage({ action, ...params })
      }
    })
    window[CONFIG.SDK_HOME] = tempSdk
    window[CONFIG.SDK_HOME].loadScript = this.loadScript
    window[CONFIG.SDK_HOME]._version = CONFIG.VERSION
  }
  // 远程加载js
  loadScript(url, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    if (script.readyState) {
      script.onreadystatechange = function () {
        if (script.readyState === "complete" || script.readyState === "loaded") {
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
}

export default CwyAppSdk